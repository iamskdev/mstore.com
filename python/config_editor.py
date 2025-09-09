#!/usr/bin/env python3
import json, os, datetime
from InquirerPy import inquirer
from InquirerPy.base.control import Choice
from InquirerPy.utils import color_print

CONFIG_PATH = os.path.join("..", "source", "config.json")

# Load JSON
with open(CONFIG_PATH, "r") as f:
    data = json.load(f)

# Editable fields
FIELDS = [
    {"path": "app.owner", "label": "Owner Name", "type": "text"},
    {"path": "app.name", "label": "App Name", "type": "text"},
    {"path": "app.description", "label": "Description", "type": "text"},
    {"path": "app.environment", "label": "Environment", "type": "select", "choices": ["development","production"]},
    {"path": "ui.theme", "label": "Theme", "type": "select", "choices": ["dark","light"]},
    {"path": "ui.headerStyle", "label": "Header Style", "type": "select", "choices": ["logo","menu"]},
    {"path": "source.data", "label": "Data Source", "type": "select", "choices": ["firebase","emulator","localstore"]},
    {"path": "source.offlineCache", "label": "Offline Cache", "type": "bool"},
    {"path": "flags.maintenanceMode", "label": "Maintenance Mode", "type": "bool"},
    {"path": "flags.phoneVerification", "label": "Phone Verification", "type": "bool"},
    {"path": "flags.roleSwitcher", "label": "Role Switcher", "type": "bool"},
    {"path": "flags.promotionEnabled", "label": "Promotion Enabled", "type": "bool"},
]

EDITED = set()
last_selected_path = None  # sticky pointer

# Helper functions
def deep_get(d, path):
    for p in path.split("."):
        d = d[p]
    return d

def deep_set(d, path, value):
    parts = path.split(".")
    for p in parts[:-1]:
        d = d[p]
    d[parts[-1]] = value

# Display top arrow guide
color_print([
    ("yellow", "Use ↑/↓ arrows to navigate, press Enter to edit a field.\n")
])

# Modifier input once
last_modifier = deep_get(data, "audit.modifyBy")
modifier = inquirer.text(message="Modifier Name:", default=last_modifier).execute()
deep_set(data, "audit.modifyBy", modifier)
deep_set(data, "audit.modifyAt", datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat() + "Z")

def save_json():
    deep_set(data, "audit.modifyAt", datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat() + "Z")
    with open(CONFIG_PATH, "w") as f:
        json.dump(data, f, indent=2)
    color_print([("green", "\n✅ Config successfully saved!\n")])

def edit_field(field):
    path = field["path"]
    label = field["label"]
    current_val = deep_get(data, path)
    answer = current_val

    try:
        if field["type"] == "text":
            answer = inquirer.text(
                message=f"{label}:",
                default=str(current_val),
                multiline=False
            ).execute()
            if answer.strip() == "":
                answer = current_val
        elif field["type"] == "select":
            answer = inquirer.select(
                message=f"{label}:",
                choices=field["choices"],
                default=str(current_val)
            ).execute()
        elif field["type"] == "bool":
            answer = inquirer.select(
                message=f"{label}:",
                choices=["True","False"],
                default="True" if current_val else "False"
            ).execute()
            answer = True if answer=="True" else False

    except KeyboardInterrupt:  # Esc / Ctrl+C pressed
        print("\n↩️ Cancelled edit, returning to menu...\n")
        answer = current_val  # Preserve old value

    if current_val != answer:
        EDITED.add(path)
    deep_set(data, path, answer)

def main_menu():
    global last_selected_path
    while True:
        choices = []
        default_value = None
        for f in FIELDS:
            val = deep_get(data, f["path"])
            display_val = "True" if val is True else "False" if val is False else str(val)
            if f["path"] in EDITED:
                display_val += " (edited)"
            choices.append(Choice(value=f, name=f"{f['label']}: {display_val}"))
            if last_selected_path and f["path"] == last_selected_path:
                default_value = f  # sticky pointer

        choices.append(Choice(value="SAVE_EXIT", name="💾 Save & Exit"))
        choices.append(Choice(value="EXIT", name="❌ Exit without saving"))

        selection = inquirer.select(
            message="",
            choices=choices,
            cycle=True,
            pointer="❯",
            default=default_value
        ).execute()

        if selection == "SAVE_EXIT":
            save_json()
            break
        elif selection == "EXIT":
            print("\n⚠️ Exited without saving.\n")
            break
        else:
            last_selected_path = selection["path"]
            edit_field(selection)

if __name__ == "__main__":
    try:
        main_menu()
    except KeyboardInterrupt:
        print("\n⚠️ Exited without saving.\n")