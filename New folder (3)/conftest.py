"""Repository-level pytest paths for the independently runnable services."""

import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SERVICE_ROOTS = (
    ROOT / "resume screener" / "resume screener",
    ROOT / "Quiz" / "Quiz",
)

for service_root in SERVICE_ROOTS:
    path = str(service_root)
    if path not in sys.path:
        sys.path.insert(0, path)
