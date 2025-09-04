# ==== Settings ====
import os, zipfile, datetime, re
from prompt_toolkit import prompt

EXCLUDE = ["node_modules"]
MAX_FILE_SIZE_MB = 100

# ==== Project Name ====
PROJECT_NAME = "ApnaStore"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_PATH = os.path.abspath(os.path.join(SCRIPT_DIR, "../"))
ZIP_EXPORT_PATH = os.path.abspath(os.path.join(SCRIPT_DIR, "../../Versions"))
LOG_FOLDER = os.path.abspath(os.path.join(SCRIPT_DIR, "../../Versions/CHANGELOG"))
VERSION_TYPES = ["Dev", "Alpha", "Beta", "Release", "Stable"]

# ==== Ensure folders exist ====
for folder in [ZIP_EXPORT_PATH, LOG_FOLDER]:
    if not os.path.exists(folder):
        try:
            os.makedirs(folder)
            print(f"✅ Created folder: {folder}")
        except OSError as e:
            print(f"❌ Error creating folder {folder}: {e}")
            exit(1)

# ==== Detect last used VERSION_TYPE ====
try:
    existing_logs = [f for f in os.listdir(LOG_FOLDER) if f.startswith(PROJECT_NAME) and f.endswith("_Versions.md")]
    if existing_logs:
        latest_log = max(existing_logs, key=lambda f: os.path.getmtime(os.path.join(LOG_FOLDER, f)))
        VERSION_TYPE = next((t for t in VERSION_TYPES if t in latest_log), "Dev")
        LOG_MD_NAME = latest_log
        LOG_MD_PATH = os.path.join(LOG_FOLDER, LOG_MD_NAME)
        print(f"📝 Detected last used VERSION_TYPE: {VERSION_TYPE}")
    else:
        VERSION_TYPE = "Dev"
        LOG_MD_NAME = f"{PROJECT_NAME}_{VERSION_TYPE}_Versions.md"
        LOG_MD_PATH = os.path.join(LOG_FOLDER, LOG_MD_NAME)
        print(f"📝 Starting with VERSION_TYPE: {VERSION_TYPE}")
except (OSError, FileNotFoundError) as e:
    print(f"❌ Error detecting last used VERSION_TYPE from {LOG_FOLDER}: {e}")
    VERSION_TYPE = "Dev" # Fallback to default
    LOG_MD_NAME = f"{PROJECT_NAME}_{VERSION_TYPE}_Versions.md"
    LOG_MD_PATH = os.path.join(LOG_FOLDER, LOG_MD_NAME)
    print(f"📝 Falling back to default VERSION_TYPE: {VERSION_TYPE}")

# ==== Determine last version, note, ID ====
last_version, last_note, last_id = None, None, 0
if os.path.exists(LOG_MD_PATH):
    with open(LOG_MD_PATH, "r", encoding="utf-8") as f:
        for line in reversed(f.readlines()):
            if line.startswith("# D"):
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
    print("✅ New log file will be created")

# ==== Auto Increment ====
def auto_increment(ver: str):
    global VERSION_TYPE, LOG_MD_NAME, LOG_MD_PATH
    if not ver:
        return "0.0.1", None

    ver_clean = ver.lstrip("V")
    major, minor, patch = map(int, ver_clean.split("."))
    patch += 1
    if patch > 9:
        patch = 0
        minor += 1
    if minor > 9:
        minor = 0
        major += 1

    current_index = VERSION_TYPES.index(VERSION_TYPE)
    if major > 9:
        if current_index + 1 < len(VERSION_TYPES):
            VERSION_TYPE = VERSION_TYPES[current_index + 1]
            major, minor, patch = 0, 0, 1
            LOG_MD_NAME = f"{PROJECT_NAME}_{VERSION_TYPE}_Versions.md"
            LOG_MD_PATH = os.path.join(LOG_FOLDER, LOG_MD_NAME)
            if not os.path.exists(LOG_MD_PATH):
                print(f"✅ New log file created for type {VERSION_TYPE}")
            print(f"📝 New Version Type: {VERSION_TYPE}")
            return f"{major}.{minor}.{patch}", None
        else:
            print("⚠️ All version types exhausted!")
            exit(1)

    return f"{major}.{minor}.{patch}", ver_clean

# ==== Prompt version ====
def get_valid_version(last_version=None):
    while True:
        suggested, last_version = auto_increment(last_version) if last_version else ("0.0.1", None)
        version_input = prompt(f"Enter Version [Previous Version: {last_version}]: ", default=suggested).strip()

        if not re.match(r"^[0-9]+\.[0-9]+\.[0-9]$", version_input):
            print("❌ Invalid format! Must be X.Y.Z")
            continue
        if any(len(part) > 1 and part.startswith("0") for part in version_input.split(".")):
            print("❌ Leading zeros not allowed")
            continue
        if last_version:
            v_nums = list(map(int, version_input.split(".")))
            lv_nums = list(map(int, last_version.split(".")))
            if v_nums <= lv_nums:
                print(f"❌ Entered version {version_input} is not newer than {last_version}.")
                continue
        return version_input

# ==== Prompt user ====
version = get_valid_version(last_version)
version_with_v = f"V{version}"
note_hint = last_note if last_note else "New Release"
note_input = prompt(f"Enter Note [Example: {note_hint}]: ").strip() # This line was incorrectly indented
note = note_input.title() if note_input else "No_Note"

# ==== Zip logic ====
folder_for_log = f"{PROJECT_NAME}_{last_version}" if last_version else f"{PROJECT_NAME}_V0.0.0"
safe_note = re.sub(r'[\\/*?:"<>|]', "_", note)
zip_name = f"{PROJECT_NAME}_{version_with_v}_{safe_note.replace(' ', '_')}.zip"
zip_path = os.path.join(ZIP_EXPORT_PATH, zip_name)
print(f"Attempting to create zip file at: {zip_path}")
try:
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        print("Zip file opened successfully. Starting to add files...")
        for root, dirs, files in os.walk(PROJECT_PATH):
            dirs[:] = [d for d in dirs if d not in EXCLUDE]
            for file in files:
                if file in EXCLUDE:
                    continue
                file_path = os.path.join(root, file)
                try:
                    if os.path.getsize(file_path) > MAX_FILE_SIZE_MB * 1024 * 1024:
                        print(f"⚠️ Large file: {file}")
                    arcname = os.path.relpath(file_path, PROJECT_PATH)
                    zipf.write(file_path, arcname)
                    # print(f"✅ Added {arcname} to zip.") # Optional: too verbose
                except PermissionError:
                    print(f"⚠️ Cannot read file: {file_path}")
                except Exception as e:
                    print(f"❌ Error adding {file_path} to zip: {e}")
        print("All files processed for zipping.")
except Exception as e:
    print(f"❌ Error creating zip file: {e}")
    exit(1) # Exit if zip creation fails

# ==== Milestone messages ====
major, minor, patch = map(int, version.split("."))
if patch == 9: print(f"🎉 Patch series completed for {version_with_v}")
if minor == 9 and patch == 9: print(f"🎉 Minor version completed for {version_with_v}")
if major == 9 and minor == 9 and patch == 9: print(f"🎉 Major version completed for {version_with_v}")

# ==== Update log ====
now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
next_id = last_id + 1
print(f"Attempting to update log file at: {LOG_MD_PATH}")
try:
    with open(LOG_MD_PATH, "a", encoding="utf-8") as f:
        if last_id == 0:
            f.write(f"### {PROJECT_NAME} {VERSION_TYPE} Versions\n\n")
        f.write(f"# D{next_id:03} >> `{now}` >> `{folder_for_log}` >> `{version_with_v}` >> `{note}` >> `{zip_name}`\n")
        f.write("---\n")
    print("Log file updated successfully.")
except Exception as e:
    print(f"❌ Error updating log file: {e}")
    exit(1) # Exit if log update fails

# ==== Output ====
print("\n🎯 Operation Successful\n")
print(f"🛑 Skipped: {', '.join(EXCLUDE)}")
print(f"📂 Project In: {PROJECT_PATH}")
print(f"📂 Exported Zip In: {zip_path}")
print(f"📁 Log In: {LOG_MD_PATH}")