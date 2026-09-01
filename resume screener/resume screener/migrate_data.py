import json
import os

DATA_FILE = "backend/data/applications.json"

def migrate():
    if not os.path.exists(DATA_FILE):
        print("Data file not found.")
        return

    with open(DATA_FILE, 'r') as f:
        data = json.load(f)

    updated_count = 0
    for app in data:
        # Standardize Status
        old_status = app.get('status')
        if old_status == "Hold":
            app['status'] = "On Hold"
        elif old_status == "Reject":
            app['status'] = "Rejected"
        
        # Rename Role
        if app.get('role') == "JavaDeveloper":
            app['role'] = "JavaFullStackDeveloper"
            if 'analysis' in app:
                app['analysis']['role'] = "JavaFullStackDeveloper"
        
        updated_count += 1

    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"Successfully migrated {updated_count} applications.")

if __name__ == "__main__":
    migrate()
