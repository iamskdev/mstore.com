import json
import os
from datetime import datetime, timedelta, timezone

def iso_to_ist(iso_str):
    """Convert ISO UTC datetime to IST readable format."""
    if not iso_str:
        return "N/A"
    try:
        dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        # ✅ IST offset fix (no dependency on system timezone)
        ist = timezone(timedelta(hours=5, minutes=30))
        dt_ist = dt.astimezone(ist)
        return dt_ist.strftime("%d %B %Y, %I:%M %p IST")
    except Exception:
        return "N/A"

def json_to_md(data, output_file):
    with open(output_file, "w", encoding="utf-8") as md:
        for entry in sorted(data, key=lambda x: x["version"], reverse=True):
            # Short commit
            commit = entry.get("commitHash") or ""
            commit_short = commit[:7] if commit else "N/A"

            # ✅ Date conversion using helper
            created_at = entry.get("audit", {}).get("createdAt")
            date_str = iso_to_ist(created_at)

            # Header
            md.write(f"## Version {entry['version']} | {entry['environment'].capitalize()}\n\n")
            md.write(f"**Title:** `{entry['title']}`\n")
            md.write(f"**Date:** {date_str}\n")
            md.write(f"**VersionId:** `{entry['versionId']}`\n")
            md.write(f"**Commit:** `{commit_short}`\n\n")

            # Sections
            if entry.get("added"):
                md.write("### ADDED\n")
                for item in entry["added"]:
                    md.write(f"- {item}\n")
                md.write("\n")

            if entry.get("fixed"):
                md.write("### FIXED\n")
                for item in entry["fixed"]:
                    md.write(f"- {item}\n")
                md.write("\n")

            if entry.get("improved"):
                md.write("### IMPROVED\n")
                for item in entry["improved"]:
                    md.write(f"- {item}\n")
                md.write("\n")

            if entry.get("notes"):
                md.write("### NOTES\n")
                for item in entry["notes"]:
                    md.write(f"- {item}\n")
                md.write("\n")

            md.write("---\n\n")


if __name__ == "__main__":
    print("Starting markdown_creator.py script...")
    script_dir = os.path.dirname(__file__)
    input_file = script_dir + "/../localstore/jsons/versions.json"
    output_file = script_dir + "/../../verrsions/CHANGELOG/FULL_CHANGELOG.md"
    
    
    try:
        with open(input_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        print(f"Successfully read data from {os.path.normpath(input_file).replace(os.sep, '/')}")
        
        json_to_md(data, output_file)
        print(f"Successfully wrote Markdown to {os.path.normpath(output_file).replace(os.sep, '/')}")
        print("Script finished.")
    except FileNotFoundError:
        print(f"Error: Input file not found at {os.path.normpath(input_file).replace(os.sep, '/')}")
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from {os.path.normpath(input_file).replace(os.sep, '/')}. Check file format.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")