import datetime
import os
import msvcrt
import json

# --- Configuration ---
USAGE_FILE = os.path.join(os.path.dirname(__file__), 'timestamp_usage.json')

# --- UI & Colors ---
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def print_header(text):
    clear_screen()
    print(f"{Colors.BOLD}{Colors.HEADER}--- {text} ---{Colors.ENDC}\n")

# --- Usage Tracking ---
def load_usage_counts():
    if not os.path.exists(USAGE_FILE):
        return {}
    try:
        with open(USAGE_FILE, 'r') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return {}

def save_usage_count(style):
    counts = load_usage_counts()
    counts[style] = counts.get(style, 0) + 1
    try:
        with open(USAGE_FILE, 'w') as f:
            json.dump(counts, f, indent=4)
    except IOError as e:
        print(f"{Colors.FAIL}Error saving usage counts: {e}{Colors.ENDC}")

# --- Core Logic ---
def get_timestamp(style):
    utc_now = datetime.datetime.now(datetime.timezone.utc)
    ist_tz = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
    ist_now = utc_now.astimezone(ist_tz)
    local_now = datetime.datetime.now()

    format_map = {
        'ISO 8601 UTC (No Milliseconds)': lambda: utc_now.strftime('%Y-%m-%dT%H:%M:%SZ'),
        'ISO 8601 IST (No Milliseconds)': lambda: ist_now.strftime('%Y-%m-%dT%H:%M:%S%z'),
        'ISO 8601 UTC (With Milliseconds)': lambda: utc_now.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z',
        'ISO 8601 IST (With Milliseconds)': lambda: ist_now.isoformat(),
        'ISO 8601 Local Time (No Timezone)': lambda: local_now.strftime('%Y-%m-%dT%H:%M:%S'),
        'Unix Timestamp (Seconds)': lambda: str(int(utc_now.timestamp())),
        'Unix Timestamp (Milliseconds)': lambda: str(int(utc_now.timestamp() * 1000)),
        'Human-Readable IST': lambda: ist_now.strftime('%Y-%m-%d %H:%M:%S') + ' IST',
        'Human-Readable UTC': lambda: utc_now.strftime('%Y-%m-%d %H:%M:%S %Z'),
        'Human-Readable Local Time': lambda: local_now.strftime('%Y-%m-%d %H:%M:%S'),
        'Date Only (YYYY-MM-DD)': lambda: utc_now.strftime('%Y-%m-%d'),
        'Time Only (Local)': lambda: local_now.strftime('%H:%M:%S'),
    }
    
    base_style = style.split(' (')[0]
    
    if base_style in format_map:
        return format_map[base_style]()
    return None

def display_menu(options, title, styles_with_examples=None):
    if styles_with_examples is None:
        styles_with_examples = {}

    print_header(title)
    current_option = 0
    COLUMN_WIDTH = 45  # Set a fixed width for the first column

    while True:
        # Move cursor to top to redraw menu without clearing
        # The +2 accounts for the header and the line after it
        print(f'\033[{len(options) + 3}A', end='')
        print_header(title)
        
        for i, option_name in enumerate(options):
            # For the main menu, there are no examples
            if option_name in styles_with_examples:
                example_text = styles_with_examples.get(option_name, "")
                padding_needed = COLUMN_WIDTH - len(option_name)
                padding = ' ' * max(1, padding_needed)
                line = f"{option_name}{padding}{Colors.BLUE}{example_text}{Colors.ENDC}"
            else:
                line = option_name # For main menu options like "Exit"

            if i == current_option:
                print(f"{Colors.CYAN}{Colors.BOLD}> {line}{Colors.ENDC}")
            else:
                print(f"  {line}")
        
        key = msvcrt.getch()

        if key == b'\xe0':  # Arrow key
            key = msvcrt.getch()
            if key == b'H':  # Up
                current_option = (current_option - 1) % len(options)
            elif key == b'P':  # Down
                current_option = (current_option + 1) % len(options)
        elif key == b'\r':  # Enter
            clear_screen()
            return options[current_option]

def run_generator():
    styles_with_examples = {
        'ISO 8601 UTC (No Milliseconds)': '(e.g., 2025-09-04T12:00:00Z)',
        'ISO 8601 IST (No Milliseconds)': '(e.g., 2025-09-04T17:30:00+05:30)',
        'ISO 8601 UTC (With Milliseconds)': '(e.g., 2025-09-04T12:00:00.000Z)',
        'ISO 8601 IST (With Milliseconds)': '(e.g., 2025-09-04T17:30:00.000+05:30)',
        'ISO 8601 Local Time (No Timezone)': '(e.g., 2025-09-04T17:30:00)',
        'Unix Timestamp (Seconds)': '(e.g., 1757102400)',
        'Unix Timestamp (Milliseconds)': '(e.g., 1757102400000)',
        'Human-Readable IST': '(e.g., 2025-09-04 17:30:00 IST)',
        'Human-Readable UTC': '(e.g., 2025-09-04 12:00:00 UTC)',
        'Human-Readable Local Time': '',
        'Date Only (YYYY-MM-DD)': '',
        'Time Only (Local)': '(e.g., 17:30:00)',
    }
    
    usage_counts = load_usage_counts()
    
    sorted_styles = sorted(styles_with_examples.keys(), key=lambda s: usage_counts.get(s, 0), reverse=True)
    
    preferred_top = 'ISO 8601 UTC (No Milliseconds)'
    if preferred_top in sorted_styles and sorted_styles[0] != preferred_top:
        sorted_styles.insert(0, sorted_styles.pop(sorted_styles.index(preferred_top)))

    menu_options = sorted_styles
    menu_options.append("Return to Main Menu")

    while True:
        base_style = display_menu(menu_options, "Timestamp Generator", styles_with_examples)

        if base_style == "Return to Main Menu":
            return

        timestamp = get_timestamp(base_style)
        
        if timestamp:
            save_usage_count(base_style)
            
            message = ""
            try:
                import pyperclip
                pyperclip.copy(timestamp)
                message = f"{Colors.GREEN}Timestamp copied to clipboard.{Colors.ENDC}"
            except (ImportError, Exception):
                message = f"{Colors.WARNING}Pyperclip not found or failed. Install it to auto-copy.{Colors.ENDC}"

            print_header("Generated Timestamp")
            print(f"  {Colors.BOLD}Style:{Colors.ENDC} {base_style}")
            print(f"  {Colors.BOLD}Value:{Colors.ENDC} {Colors.CYAN}{timestamp}{Colors.ENDC}\n")
            print(f"{message}\n")
            print("Press any key to return to the generator menu...")
            msvcrt.getch()

def run_converter():
    while True:
        print_header("UTC to IST Converter")
        print("Enter a UTC timestamp in ISO 8601 format (e.g., 2025-09-04T12:00:00Z)")
        print("Press Enter without text to return to the main menu.\n")
        
        try:
            utc_string = input(f"{Colors.CYAN}> {Colors.ENDC}")
            if not utc_string:
                return

            utc_string_cleaned = utc_string.upper().replace('Z', '+00:00')
            
            try:
                utc_dt = datetime.datetime.fromisoformat(utc_string_cleaned)
            except ValueError:
                utc_dt = datetime.datetime.strptime(utc_string_cleaned, '%Y-%m-%dT%H:%M:%S%z')

            if utc_dt.tzinfo is None:
                raise ValueError("The provided timestamp is naive (no timezone info).")

            ist_tz = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
            ist_dt = utc_dt.astimezone(ist_tz)
            
            print_header("Conversion Result")
            print(f"  {Colors.BOLD}UTC Input:{Colors.ENDC} {utc_string}")
            print(f"  {Colors.BOLD}IST Output:{Colors.ENDC} {Colors.GREEN}{ist_dt.strftime('%Y-%m-%d %H:%M:%S IST')}{Colors.ENDC}\n")

        except (ValueError, TypeError) as e:
            print(f"\n{Colors.FAIL}Invalid format: {e}{Colors.ENDC}")
            print("Please use the ISO 8601 format with a timezone (e.g., 'Z' or '+00:00').")
        
        print("\nPress any key to convert another, or Esc to return to the main menu...")
        key = msvcrt.getch()
        if key == b'\x1b': # Escape key
            return

def main():
    # On Windows, this enables ANSI escape sequences
    if os.name == 'nt':
        os.system('')
        
    while True:
        options = ["Generate Timestamp", "Convert UTC to IST", "Exit Tool"]
        choice = display_menu(options, "Advanced Timestamp Tool")

        if choice == "Generate Timestamp":
            run_generator()
        elif choice == "Convert UTC to IST":
            run_converter()
        elif choice == "Exit Tool":
            clear_screen()
            print(f"{Colors.GREEN}Done. Goodbye!{Colors.ENDC}")
            break


if __name__ == "__main__":
    main()