import os
import json
import tempfile
import time
import errno
import platform

# Cross-platform file locking
try:
    if platform.system().lower().startswith('win'):
        import msvcrt
    else:
        import fcntl
except Exception:
    msvcrt = None
    fcntl = None


DEFAULT_RETRY_DELAY = 0.05
DEFAULT_TIMEOUT = 5.0


def _acquire_lock(lockfile_path: str, timeout: float = DEFAULT_TIMEOUT) -> object:
    """Acquire an exclusive lock on a lock file. Returns the opened file object which must be closed by the caller to release the lock."""
    start = time.time()
    # Ensure lock dir exists
    lock_dir = os.path.dirname(lockfile_path)
    if lock_dir and not os.path.exists(lock_dir):
        try:
            os.makedirs(lock_dir, exist_ok=True)
        except Exception:
            pass

    while True:
        try:
            # Open lock file in binary append mode
            lf = open(lockfile_path, 'a+b')
            if platform.system().lower().startswith('win') and 'msvcrt' in globals() and msvcrt:
                try:
                    msvcrt.locking(lf.fileno(), msvcrt.LK_NBLCK, 1)
                    return lf
                except OSError:
                    lf.close()
            elif fcntl:
                try:
                    fcntl.flock(lf.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                    return lf
                except OSError:
                    lf.close()
            else:
                # If locking primitives unavailable, use open file as best-effort lock
                return lf
        except Exception:
            pass

        if (time.time() - start) > timeout:
            raise TimeoutError(f"Timeout acquiring lock on {lockfile_path}")
        time.sleep(DEFAULT_RETRY_DELAY)


def _release_lock(lf):
    try:
        if lf:
            if platform.system().lower().startswith('win') and 'msvcrt' in globals() and msvcrt:
                try:
                    lf.seek(0)
                    msvcrt.locking(lf.fileno(), msvcrt.LK_UNLCK, 1)
                except Exception:
                    pass
            elif fcntl:
                try:
                    fcntl.flock(lf.fileno(), fcntl.LOCK_UN)
                except Exception:
                    pass
            try:
                lf.close()
            except Exception:
                pass
    except Exception:
        pass


def ensure_data_file(path: str):
    """Ensure parent dir exists and a JSON array file exists at path. Does not overwrite existing file."""
    parent = os.path.dirname(path)
    if parent and not os.path.exists(parent):
        os.makedirs(parent, exist_ok=True)
    if not os.path.exists(path):
        # Create file atomically
        tmp = None
        try:
            fd, tmp = tempfile.mkstemp(prefix="._tmp_applications_", dir=parent or '.')
            with os.fdopen(fd, 'w', encoding='utf-8') as f:
                json.dump([], f)
                f.flush()
                os.fsync(f.fileno())
            os.replace(tmp, path)
        finally:
            if tmp and os.path.exists(tmp):
                try:
                    os.remove(tmp)
                except Exception:
                    pass


def read_applications(path: str):
    """Read and return the list of applications. Returns empty list for missing/invalid JSON."""
    lockfile = f"{path}.lock"
    lf = None
    try:
        lf = _acquire_lock(lockfile)
        if not os.path.exists(path):
            return []
        with open(path, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
                if isinstance(data, list):
                    return data
                # If file contains other JSON, return empty list to avoid crashes
                return []
            except json.JSONDecodeError:
                # Corrupted/empty file — return empty list
                return []
    finally:
        _release_lock(lf)


def write_applications(path: str, apps, *, indent: int = 2):
    """Atomically write applications list to path using a temporary file and os.replace. Uses a lock to coordinate concurrent writers."""
    if apps is None:
        apps = []
    lockfile = f"{path}.lock"
    lf = None
    tmp = None
    parent = os.path.dirname(path) or '.'
    try:
        lf = _acquire_lock(lockfile)
        # Write to temp file in same directory
        fd, tmp = tempfile.mkstemp(prefix="._tmp_applications_", dir=parent)
        try:
            with os.fdopen(fd, 'w', encoding='utf-8') as f:
                json.dump(apps, f, ensure_ascii=False, indent=indent)
                f.flush()
                os.fsync(f.fileno())
            # Atomic replace with retry for transient Windows permission errors (WinError 5)
            start = time.time()
            while True:
                try:
                    os.replace(tmp, path)
                    break
                except PermissionError as pe:
                    # On Windows, a transient lock by another process may cause PermissionError (WinError 5)
                    if (time.time() - start) > DEFAULT_TIMEOUT:
                        raise
                    time.sleep(DEFAULT_RETRY_DELAY)
                except OSError as oe:
                    # Catch other OSErrors that map to permission denied
                    if oe.errno in (errno.EACCES, errno.EPERM):
                        if (time.time() - start) > DEFAULT_TIMEOUT:
                            raise
                        time.sleep(DEFAULT_RETRY_DELAY)
                    else:
                        raise
        except Exception:
            # Clean up temp if replace fails
            if tmp and os.path.exists(tmp):
                try:
                    os.remove(tmp)
                except Exception:
                    pass
            raise
    finally:
        _release_lock(lf)
        if tmp and os.path.exists(tmp):
            try:
                os.remove(tmp)
            except Exception:
                pass
