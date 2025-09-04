import os
import zipfile
import json
import logging
from datetime import datetime

# --- Configure Logging ---
# --- Configure Logging ---
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s: %(message)s'
)

# --- Attempt to import pytz ---
try:
    import pytz
    PYTZ_AVAILABLE = True
except ImportError:
    PYTZ_AVAILABLE = False

# --- Configuration ---
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ZIP_EXPORT_DIR = os.path.abspath(os.path.join(PROJECT_ROOT, '../Versions'))

EXCLUDE_DIRS = ['node_modules', '.git', '__pycache__',]
EXCLUDE_FILES = ['package-lock.json']

# --- Main Logic ---
def get_latest_version():
    """Reads versions.json to get the latest version string."""
    logging.info("Trying to determine the latest version...")
    try:
        versioner_config_path = os.path.join(PROJECT_ROOT, 'versioner', 'versioner.json')
        with open(versioner_config_path, 'r', encoding='utf-8') as f:
            versioner_config = json.load(f)
        
        versions_file_rel_path = versioner_config['updateIn']['jsonFile']
        versions_file_abs_path = os.path.join(PROJECT_ROOT, versions_file_rel_path)
        
        with open(versions_file_abs_path, 'r', encoding='utf-8') as f:
            versions_data = json.load(f)
        
        if versions_data and len(versions_data) > 0:
            latest_version = versions_data[0].get('version', '0.0.0')
            logging.info(f"Found latest version: {latest_version}")
            return latest_version
        else:
            logging.warning("versions.json is empty or invalid.")
            return '0.0.0'
    except Exception as e:
        logging.error(f"Failed to read version: {e}")
        return '0.0.0'

def get_ist_timestamp():
    """Generates a formatted timestamp, preferring IST if pytz is available."""
    if PYTZ_AVAILABLE:
        ist = pytz.timezone('Asia/Kolkata')
        return datetime.now(ist).strftime('%d%m%Y_%H%M%S')
    else:
        return datetime.now().strftime('%d%m%Y_%H%M%S')

def create_project_zip():
    """Creates a zip archive with professional logging."""

    version = get_latest_version()
    timestamp = get_ist_timestamp()

    if version == '0.0.0':
        logging.error("Could not determine project version. Aborting zip creation.")
        return

    if not os.path.exists(ZIP_EXPORT_DIR):
        os.makedirs(ZIP_EXPORT_DIR)
        logging.info(f"Created output directory: {ZIP_EXPORT_DIR}")

    zip_filename = f"MSTORE_v{version}_{timestamp}.zip"
    zip_filepath = os.path.join(ZIP_EXPORT_DIR, zip_filename)
    
    logging.info(f"Starting zip creation for version {version}...")
    logging.info(f"Excluding Files: {EXCLUDE_FILES}")
    logging.info(f"Excluding Folders: {EXCLUDE_DIRS}")

    skipped_items = []

    try:
        with zipfile.ZipFile(zip_filepath, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(PROJECT_ROOT):
                original_dirs = list(dirs)
                dirs[:] = [d for d in original_dirs if d not in EXCLUDE_DIRS]
                
                for d in original_dirs:
                    if d not in dirs:
                        skipped_items.append(os.path.relpath(os.path.join(root, d), PROJECT_ROOT))

                for file in files:
                    file_rel_path = os.path.relpath(os.path.join(root, file), PROJECT_ROOT)

                    if file in EXCLUDE_FILES or file.startswith('.'):
                        skipped_items.append(file_rel_path)
                        continue
                    
                    if os.path.abspath(os.path.join(root, file)) == os.path.abspath(zip_filepath):
                        continue
                        
                    zipf.write(os.path.join(root, file), file_rel_path)
        
        if skipped_items:
            # logging.info("Skipped the following items:")
            # for item in sorted(list(set(skipped_items))):
            #     logging.info(f"  - {item}")
            pass # This is to avoid syntax error
        
        print("\n🎉 Congratulations! Zip file created successfully. 🎉")
        logging.info(f"Output file: {zip_filepath}")

    except Exception as e:
        logging.error(f"An error occurred during zip creation: {e}", exc_info=True)

# --- Run the script ---
if __name__ == "__main__":
    create_project_zip()