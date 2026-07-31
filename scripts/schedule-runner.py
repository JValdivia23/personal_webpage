#!/usr/bin/env python3
"""
Schedule Runner for Personal Webpage Updates.

This script acts as the automated trigger for macOS launchd.
- On Sunday at 10:00 AM: Pick a random weekday (Mon-Sun, uniform 1/7 probability) for the update.
  If Sunday is picked, update immediately. Otherwise, update launchd plist to trigger on the chosen day.
- On the chosen weekday at 10:00 AM: Execute scripts/update-all.py.

Usage:
    python scripts/schedule-runner.py              # Normal launchd execution
    python scripts/schedule-runner.py --status     # Print current schedule status
    python scripts/schedule-runner.py --dry-run    # Simulate a decision run
    python scripts/schedule-runner.py --force      # Force a new decision run today
"""

import argparse
import json
import os
import random
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent.resolve()
UPDATE_ALL_SCRIPT = REPO_ROOT / "scripts" / "update-all.py"
STATE_FILE = REPO_ROOT / "scripts" / ".update-schedule.json"
PLIST_PATH = Path.home() / "Library" / "LaunchAgents" / "com.jairo.webpage-update.plist"
PYTHON_BIN = sys.executable

DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]


def log(msg: str) -> None:
    """Print timestamped log message."""
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}")


def get_launchd_weekday(dt: datetime) -> int:
    """Convert datetime to launchd weekday (0=Sunday, 1=Monday, ..., 6=Saturday)."""
    return (dt.weekday() + 1) % 7


def get_sunday_date(dt: datetime) -> str:
    """Get YYYY-MM-DD string for the Sunday starting the current week."""
    weekday = get_launchd_weekday(dt)
    sunday_dt = dt - timedelta(days=weekday)
    return sunday_dt.strftime("%Y-%m-%d")


def load_state() -> dict:
    """Load schedule state from JSON file."""
    if STATE_FILE.exists():
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            log(f"Warning: Could not read state file ({e}). Resetting state.")
    return {}


def save_state(state: dict) -> None:
    """Save schedule state to JSON file."""
    try:
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
    except Exception as e:
        log(f"Error: Failed to save state file: {e}")


def generate_plist_xml(target_weekday: int) -> str:
    """Generate launchd plist XML content with Sunday + target_weekday intervals."""
    intervals_xml = """        <dict>
            <key>Weekday</key>
            <integer>0</integer>
            <key>Hour</key>
            <integer>10</integer>
            <key>Minute</key>
            <integer>0</integer>
        </dict>"""

    if target_weekday != 0:
        intervals_xml += f"""
        <dict>
            <key>Weekday</key>
            <integer>{target_weekday}</integer>
            <key>Hour</key>
            <integer>10</integer>
            <key>Minute</key>
            <integer>0</integer>
        </dict>"""

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.jairo.webpage-update</string>

    <key>ProgramArguments</key>
    <array>
        <string>{PYTHON_BIN}</string>
        <string>{REPO_ROOT}/scripts/schedule-runner.py</string>
    </array>

    <key>StartCalendarInterval</key>
    <array>
{intervals_xml}
    </array>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/Users/java1127/anaconda3/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>

    <key>WorkingDirectory</key>
    <string>{REPO_ROOT}</string>

    <key>StandardOutPath</key>
    <string>/Users/java1127/Library/Logs/webpage-update.log</string>

    <key>StandardErrorPath</key>
    <string>/Users/java1127/Library/Logs/webpage-update-error.log</string>

    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>
"""


def update_launchagent_plist(target_weekday: int) -> bool:
    """Write updated plist file and reload launchctl."""
    log(f"Updating LaunchAgent plist with target weekday {target_weekday} ({DAY_NAMES[target_weekday]})...")
    xml_content = generate_plist_xml(target_weekday)

    try:
        PLIST_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(PLIST_PATH, "w", encoding="utf-8") as f:
            f.write(xml_content)

        # Unload and load with launchctl
        subprocess.run(["launchctl", "unload", str(PLIST_PATH)], capture_output=True, check=False)
        res = subprocess.run(["launchctl", "load", str(PLIST_PATH)], capture_output=True, text=True)
        if res.returncode != 0:
            log(f"Warning: launchctl load returned code {res.returncode}: {res.stderr.strip()}")
        else:
            log("LaunchAgent successfully reloaded.")
        return True
    except Exception as e:
        log(f"Error updating LaunchAgent plist: {e}")
        return False


def run_update_all() -> bool:
    """Execute scripts/update-all.py."""
    log("Executing update-all.py sync...")
    result = subprocess.run([PYTHON_BIN, str(UPDATE_ALL_SCRIPT)], cwd=REPO_ROOT)
    return result.returncode == 0


def make_decision(state: dict, sunday_date: str, force: bool = False, dry_run: bool = False) -> int:
    """Make uniform random choice for the week (1/7 prob per day)."""
    # Uniform choice from Sunday (0) to Saturday (6)
    chosen = random.choice([0, 1, 2, 3, 4, 5, 6])
    chosen_name = DAY_NAMES[chosen]

    log(f"Decision process: Selected '{chosen_name}' (weekday index {chosen}) with uniform 1/7 probability.")

    if dry_run:
        log("[DRY-RUN] No changes saved.")
        return chosen

    state["week_start"] = sunday_date
    state["target_weekday"] = chosen
    state["target_day_name"] = chosen_name
    state["decision_timestamp"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Update launchagent schedule
    update_launchagent_plist(chosen)

    # If Sunday itself was chosen, run update now!
    if chosen == 0:
        log("Sunday selected as update day. Triggering update now.")
        success = run_update_all()
        if success:
            state["last_run_week"] = sunday_date
            state["last_run_timestamp"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    save_state(state)
    return chosen


def main() -> int:
    parser = argparse.ArgumentParser(description="Schedule Runner for Personal Webpage Updates")
    parser.add_argument("--status", action="store_true", help="Display current schedule status")
    parser.add_argument("--dry-run", action="store_true", help="Simulate random selection without saving")
    parser.add_argument("--force", action="store_true", help="Force a new decision run regardless of current state")
    args = parser.parse_args()

    now = datetime.now()
    today_weekday = get_launchd_weekday(now)
    today_name = DAY_NAMES[today_weekday]
    sunday_date = get_sunday_date(now)

    state = load_state()

    if args.status:
        print("=" * 60)
        print("Personal Webpage Update Schedule Status")
        print("=" * 60)
        print(f"Current Date:            {now.strftime('%Y-%m-%d %H:%M:%S')} ({today_name})")
        print(f"Current Week Start:      {sunday_date} (Sunday)")
        print(f"Scheduled Week Start:    {state.get('week_start', 'None')}")
        print(f"Target Update Day:       {state.get('target_day_name', 'Not set')} (Index {state.get('target_weekday', 'N/A')})")
        print(f"Last Decision Timestamp: {state.get('decision_timestamp', 'Never')}")
        print(f"Last Update Timestamp:   {state.get('last_run_timestamp', 'Never')}")
        print(f"Last Update Week:        {state.get('last_run_week', 'Never')}")
        print("=" * 60)
        return 0

    log("=" * 60)
    log(f"Starting schedule runner check. Today is {today_name} ({now.strftime('%Y-%m-%d')})")
    log("=" * 60)

    # 1. Check if Sunday Decision Run is needed
    decision_needed = (today_weekday == 0 and state.get("week_start") != sunday_date) or args.force or args.dry_run

    if decision_needed:
        log("Running Sunday decision task...")
        make_decision(state, sunday_date, force=args.force, dry_run=args.dry_run)
        return 0

    # 2. Check if today is the scheduled update day
    target_weekday = state.get("target_weekday")
    week_start = state.get("week_start")

    if week_start == sunday_date and target_weekday == today_weekday:
        if state.get("last_run_week") == sunday_date:
            log(f"Update for week of {sunday_date} was already executed on {state.get('last_run_timestamp')}.")
        else:
            log(f"Today ({today_name}) matches target update day for week {sunday_date}. Launching update...")
            success = run_update_all()
            if success:
                state["last_run_week"] = sunday_date
                state["last_run_timestamp"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                save_state(state)
    else:
        target_name = state.get("target_day_name", "Unknown")
        log(f"No update scheduled for today ({today_name}). This week's update is scheduled for {target_name}.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
