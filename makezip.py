import os, zipfile, datetime, re
from prompt_toolkit import prompt

# ==== Settings ====
EXCLUDE = ["node_modules"]
# ==================

# === @param: Original folder name jo zip me use hoga ===
PROJECT_PATH = os.getcwd()
original_folder_name = "ApnaStore"  # <-- Yahan fixed name dalega user

# VersionControl folder
parent_dir = os.path.dirname(PROJECT_PATH)
vc_dir = os.path.join(parent_dir, "VersionControl")
os.makedirs(vc_dir, exist_ok=True)

# Log file (Markdown)
LOG_FILE = os.path.join(vc_dir, "Apna_Store_Version_Logs.md")

# --- Determine last version, last note, last ID
last_version, last_note, last_id = None, None, 0
if os.path.exists(LOG_FILE):
    with open(LOG_FILE, "r", encoding="utf-8") as f:
        for line in reversed(f.readlines()):
            parts = line.strip().split(" >> ")
            if len(parts) >= 5:
                try:
                    last_id = int(parts[0].split(".")[0])
                    last_version = parts[2].strip('`')
                    last_note = parts[3].strip('*')
                    break
                except:
                    continue

# --- Auto increment version (number only)
def auto_increment(ver: str) -> str:
    ver = ver.lstrip("V")
    nums = [int(n) for n in ver.split(".")]
    nums[-1] += 1
    return ".".join(map(str, nums))

# --- Version input
if last_version:
    suggested_version = auto_increment(last_version)
    version = prompt(f"Enter Version [Last Version: {last_version}]: ", default=suggested_version).strip()
else:
    version = prompt("Enter Version (e.g., 7.1.5): ").strip()
version_with_v = f"V{version}"

# --- Note input (blank by default, last note in bracket)
if last_note:
    note = prompt(f"Enter Note [Last Note: {last_note}]: ").strip()
else:
    note = prompt("Enter Note: ").strip()
if note:
    note = note[0].upper() + note[1:]
else:
    note = "NoNote"

# --- Determine folder name for log (previous version)
# Folder field in log always shows previous version if exists
folder_for_log = original_folder_name
if last_version and not re.search(r'_V\d+\.\d+\.\d+', original_folder_name):
    folder_for_log = f"{original_folder_name}_{last_version}"

# --- Zip filename (safe, uses user input version)
safe_note = re.sub(r'[\\/*?:"<>|]', "_", note)
zip_name = f"{original_folder_name}_{version_with_v}_{safe_note.replace(' ', '_')}.zip"
zip_path = os.path.join(vc_dir, zip_name)

# Delete old zip if exists
if os.path.exists(zip_path):
    os.remove(zip_path)

# --- Create zip (exclude folders)
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(PROJECT_PATH):
        dirs[:] = [d for d in dirs if d not in EXCLUDE]
        for file in files:
            if file in EXCLUDE:
                continue
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, PROJECT_PATH)
            zipf.write(file_path, arcname)

# --- Update log with numbering + Log Created
now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
next_id = last_id + 1
with open(LOG_FILE, "a", encoding="utf-8") as f:
    f.write(f"{next_id}. `{now}` >> `{folder_for_log}` >> `{version_with_v}` >> `{note}` >> `{zip_name}`\n")

print(f"\n✅ Zip Created: {zip_path}")
print(f"📜 Log Updated: {LOG_FILE}")