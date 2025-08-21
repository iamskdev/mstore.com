# ==== Settings ====
import os, zipfile, datetime, re
from prompt_toolkit import prompt

EXCLUDE = ["node_modules"]          # Folders/files to exclude from zip
MAX_FILE_SIZE_MB = 100              # Warn if file exceeds this size

# ==== Path Setup ====
PROJECT_NAME = "ApnaStore"          # Your project name
PROJECT_PATH = os.path.abspath("../../")  # Project folder for zipping
ZIP_EXPORT_PATH = os.path.abspath("../../../ZipVersions")  # Export folder
LOG_FOLDER = os.path.abspath("../../docs/version-logs")    # Markdown log folder
VERSION_TYPE = "Dev"               # Predefined type (Alpha/Beta/Dev etc)

# ==== Ensure folders exist ====
if not os.path.exists(ZIP_EXPORT_PATH):
    os.makedirs(ZIP_EXPORT_PATH)
    print("✅ New zip folder created successfully")

if not os.path.exists(LOG_FOLDER):
    os.makedirs(LOG_FOLDER)
    print("✅ New log folder created successfully")

LOG_MD_NAME = f"Apna_Store_{VERSION_TYPE}_Versions.md"
LOG_MD_PATH = os.path.join(LOG_FOLDER, LOG_MD_NAME)

# ==== Determine Last Version, Note, ID ====
last_version, last_note, last_id = None, None, 0
if os.path.exists(LOG_MD_PATH):
    with open(LOG_MD_PATH, "r", encoding="utf-8") as f:
        for line in reversed(f.readlines()):
            line = line.strip()
            if not line.startswith("# D"):
                continue
            parts = line.split(" >> ")
            if len(parts) >= 6:
                try:
                    last_id = int(parts[0].lstrip("# D"))
                    last_version = parts[3].strip().strip("`")
                    last_note = parts[4].strip().strip("`")
                    break
                except:
                    continue
else:
    print("✅ New log file created successfully")

# ==== Auto Increment Function ====
def auto_increment(ver: str) -> str:
    ver = ver.lstrip("V")
    try:
        nums = [int(n) for n in ver.split(".")]
    except Exception:
        print(f"❌ Invalid last version format: {ver}")
        exit(1)
    nums[-1] += 1
    return ".".join(map(str, nums))

# ==== Input Version and Note (Strict Validation, Retry Loop) ====
from prompt_toolkit import prompt
import re

def get_valid_version(last_version=None):
    while True:
        suggested = auto_increment(last_version) if last_version else ""
        version_input = prompt(
            f"Enter Version [Previous Version: {last_version}]: ",
            default=suggested
        ).strip()

        # 1️⃣ Semantic version check: X.Y.Z (digits only)
        if not re.match(r"^[0-9]+\.[0-9]+\.[0-9]$", version_input):
            print("❌ Invalid format! Must be X.Y.Z (digits only, e.g., 0.0.1).")
            continue

        # 2️⃣ Leading zero check
        if any(len(part) > 1 and part.startswith("0") for part in version_input.split(".")):
            print("❌ Leading zeros not allowed (e.g., 0.0.01).")
            continue

        # 3️⃣ Older version check
        if last_version:
            v_nums = list(map(int, version_input.split(".")))
            lv_nums = list(map(int, last_version.lstrip("V").split(".")))
            if v_nums <= lv_nums:
                print(f"❌ Entered version {version_input} is not newer than {last_version}.")
                continue

        # ✅ Valid version
        return version_input

# ==== Execute Version Input ====
try:
    version = get_valid_version(last_version)
    version_with_v = f"V{version}"

    # ==== Note Input ====
    note_hint = last_note if last_note else "New Release"
    note_input = prompt(f"Enter Note [Previous Note: {note_hint}]: ").strip()
    note = note_input[0].upper() + note_input[1:] if note_input else "NoNote"

except KeyboardInterrupt:
    print("\n❌ Operation Cancelled by User.")
    exit(0)

# ==== Folder for log ====
folder_for_log = f"{PROJECT_NAME}_{last_version}" if last_version else f"{PROJECT_NAME}_V0.0.0"

# ==== Zip Filename ====
safe_note = re.sub(r'[\\/*?:"<>|]', "_", note)
zip_name = f"{PROJECT_NAME}_{version_with_v}_{safe_note.replace(' ', '_')}.zip"
zip_path = os.path.join(ZIP_EXPORT_PATH, zip_name)

if os.path.exists(zip_path):
    print("⚠️ Zip already exists and will be overwritten")

# ==== Check project folder is not empty ====
file_count = sum(len(files) for _, _, files in os.walk(PROJECT_PATH))
if file_count == 0:
    print("⚠️ Project folder is empty! No files to zip.")

# ==== Create Zip ====
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(PROJECT_PATH):
        dirs[:] = [d for d in dirs if d not in EXCLUDE]
        for file in files:
            if file in EXCLUDE:
                continue
            file_path = os.path.join(root, file)
            try:
                if os.path.getsize(file_path) > MAX_FILE_SIZE_MB * 1024 * 1024:
                    print(f"⚠️ Large file detected: {file} > {MAX_FILE_SIZE_MB}MB")
                arcname = os.path.relpath(file_path, PROJECT_PATH)
                zipf.write(file_path, arcname)
            except PermissionError:
                print(f"⚠️ Cannot read file (permission denied): {file}")

# ==== Milestone Messages ====
major, minor, patch = map(int, version.split("."))
if patch == 9:
    print(f"🎉 Patch series completed for {version_with_v}")
if minor == 9 and patch == 9:
    print(f"🎉 Minor version completed for {version_with_v}")
if major == 9 and minor == 9 and patch == 9:
    print(f"🎉 Major version completed for {version_with_v}")

# ==== Update Log ====
now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
next_id = last_id + 1
with open(LOG_MD_PATH, "a", encoding="utf-8") as f:
    if last_id == 0:
        f.write(f"### {PROJECT_NAME} {VERSION_TYPE} Versions\n\n")
    f.write(f"# D{next_id:03} >> `{now}` >> `{folder_for_log}` >> `{version_with_v}` >> `{note}` >> `{zip_name}`\n")
    f.write("---\n")

# ==== Terminal Output ====
print("\n🎯 Operation Successful\n")
print(f"🛑 Skipped Folders/Files: {', '.join(EXCLUDE)}")
print(f"📂 Project In: {PROJECT_PATH}")
print(f"📂 Exported Zip In: {ZIP_EXPORT_PATH}")
print(f"📁 Exported Log In: {LOG_MD_PATH}")