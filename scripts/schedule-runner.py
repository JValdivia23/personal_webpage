#!/usr/bin/env python3
"""
Schedule Runner for Personal Webpage Updates (self-healing, limited-fire).

Schedule shape:
  - LaunchAgent plist fires on Sunday 10:00 (decision anchor) + the chosen
    target weekday 10:00 (max 2 calendar fires/week). RunAtLoad=true so a
    login also fires the script (cheap catch-up).
  - The plist is rewritten only when a new *future* target day is picked.

Decision logic (any fire: Sunday, target day, or login):
  - No valid decision for the current week (week_start != current Sunday):
      pick a uniform random day (1/7, Sun..Sat).
        * pick already passed this week (pick <= today) -> run update-all now.
        * pick is in the future                -> save it; rewrite plist to
          Sunday + pick (deferred reload) so launchd fires on that day.
  - Valid decision exists:
      * today == target and not yet run this week -> run update-all.py.
      * otherwise -> no-op.

This is self-healing: a missed Sunday can never orphan a week, because the
next fire (target day from prior week, or login) detects the stale/missing
decision and makes a fresh one. A fully-missed week (no fire at all) simply
rolls to the next Sunday.

Usage:
    python scripts/schedule-runner.py              # launchd execution
    python scripts/schedule-runner.py --status     # show schedule state
    python scripts/schedule-runner.py --dry-run    # simulate (no side effects)
    python scripts/schedule-runner.py --dry-run --today 2026-08-16
    python scripts/schedule-runner.py --force       # force a fresh decision now
    python scripts/schedule-runner.py --install     # write initial Sun-only plist
"""

import argparse
import fcntl
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
LOCK_FILE = REPO_ROOT / "scripts" / ".update-schedule.lock"
PLIST_PATH = Path.home() / "Library" / "LaunchAgents" / "com.jairo.webpage-update.plist"
# Pin the interpreter so generated plists never drift from manual/launchd runs.
PYTHON_BIN = "/Users/java1127/anaconda3/bin/python3"

DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]


def log(msg: str) -> None:
    """Print timestamped log message (also captured by launchd -> log file)."""
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}", flush=True)


def now_iso() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def get_launchd_weekday(dt: datetime) -> int:
    """launchd weekday: 0=Sunday, 1=Monday, ..., 6=Saturday."""
    return (dt.weekday() + 1) % 7


def get_sunday_date(dt: datetime) -> str:
    """YYYY-MM-DD of the Sunday starting the current week (launchd weekday 0)."""
    sunday_dt = dt - timedelta(days=get_launchd_weekday(dt))
    return sunday_dt.strftime("%Y-%m-%d")


def load_state() -> dict:
    if STATE_FILE.exists():
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            log(f"Warning: could not read state file ({e}); resetting.")
    return {}


def save_state(state: dict) -> None:
    try:
        tmp = STATE_FILE.with_suffix(".json.tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
        os.replace(tmp, STATE_FILE)
    except Exception as e:
        log(f"Error: failed to save state file: {e}")


def acquire_lock() -> bool:
    """Advisory lock to prevent overlapping runs (calendar fire + login, etc.)."""
    try:
        LOCK_FILE.parent.mkdir(parents=True, exist_ok=True)
        fd = os.open(str(LOCK_FILE), os.O_CREAT | os.O_RDWR, 0o644)
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        return True
    except OSError:
        return False


def generate_plist_xml(target_weekday: int) -> str:
    """Build plist XML. Sunday anchor always present; add target if != Sunday."""
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
    <true/>
</dict>
</plist>
"""


def reload_launchagent_async() -> None:
    """Defer the launchctl reload ~2s so we don't unload the running job itself."""
    helper = (
        f'sleep 2; '
        f'launchctl unload "{PLIST_PATH}" >/dev/null 2>&1; '
        f'launchctl load "{PLIST_PATH}" >/dev/null 2>&1'
    )
    try:
        subprocess.Popen(
            ["sh", "-c", helper],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
        log("Scheduled deferred LaunchAgent reload (~2s).")
    except Exception as e:
        log(f"Warning: could not schedule reload: {e}")


def write_plist(target_weekday: int) -> bool:
    """Atomically write the plist file (no launchctl here)."""
    try:
        PLIST_PATH.parent.mkdir(parents=True, exist_ok=True)
        tmp = PLIST_PATH.with_suffix(".plist.tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            f.write(generate_plist_xml(target_weekday))
        os.replace(tmp, PLIST_PATH)
        return True
    except Exception as e:
        log(f"Error writing plist: {e}")
        return False


def update_launchagent_plist(target_weekday: int) -> None:
    """Write plist (Sun + target) and schedule a deferred reload."""
    log(f"Updating LaunchAgent plist -> Sunday + {DAY_NAMES[target_weekday]} (idx {target_weekday}).")
    if write_plist(target_weekday):
        reload_launchagent_async()


def run_update_all() -> bool:
    """Execute scripts/update-all.py."""
    log("Executing update-all.py sync...")
    result = subprocess.run([PYTHON_BIN, str(UPDATE_ALL_SCRIPT)], cwd=REPO_ROOT)
    ok = result.returncode == 0
    log("update-all.py " + ("succeeded." if ok else "FAILED."))
    return ok


def valid_decision(state: dict, current_sunday: str) -> bool:
    return state.get("week_start") == current_sunday and "target_weekday" in state


def make_decision(state: dict, today_weekday: int, current_sunday: str, dry_run: bool = False) -> int:
    """Pick a uniform random day; run now if it has already passed this week."""
    chosen = random.choice([0, 1, 2, 3, 4, 5, 6])
    name = DAY_NAMES[chosen]
    log(f"Decision: selected {name} (idx {chosen}).")

    if chosen <= today_weekday:
        if dry_run:
            log("[DRY-RUN] Would run update-all now (chosen day <= today).")
            return chosen
        # Already passed (or today): run now. Do NOT rewrite plist/reload
        # (avoids a concurrent RunAtLoad re-fire double-running update-all).
        if state.get("last_run_week") != current_sunday:
            ok = run_update_all()
            if ok:
                state["last_run_week"] = current_sunday
                state["last_run_timestamp"] = now_iso()
        else:
            log("Already ran an update this week; not re-running.")
    else:
        if dry_run:
            log(f"[DRY-RUN] Would schedule update for {name} (rewrite plist + deferred reload).")
            return chosen
        # Future day: persist decision, rewrite plist to fire on it.
        update_launchagent_plist(chosen)

    if not dry_run:
        state["week_start"] = current_sunday
        state["target_weekday"] = chosen
        state["target_day_name"] = name
        state["decision_timestamp"] = now_iso()
        save_state(state)
    return chosen


def print_status(now: datetime, state: dict) -> None:
    today_weekday = get_launchd_weekday(now)
    current_sunday = get_sunday_date(now)
    print("=" * 60)
    print("Personal Webpage Update Schedule Status")
    print("=" * 60)
    print(f"Current Date:            {now.strftime('%Y-%m-%d %H:%M:%S')} ({DAY_NAMES[today_weekday]})")
    print(f"Current Week Start:      {current_sunday} (Sunday)")
    print(f"Decision for This Week:  {'yes' if valid_decision(state, current_sunday) else 'NO'}")
    print(f"Target Update Day:       {state.get('target_day_name', 'Not set')} (idx {state.get('target_weekday', 'N/A')})")
    print(f"Scheduled Week Start:    {state.get('week_start', 'None')}")
    print(f"Last Decision Timestamp: {state.get('decision_timestamp', 'Never')}")
    print(f"Last Update Timestamp:   {state.get('last_run_timestamp', 'Never')}")
    print(f"Last Update Week:        {state.get('last_run_week', 'Never')}")
    print("=" * 60)


def main() -> int:
    parser = argparse.ArgumentParser(description="Schedule Runner for Personal Webpage Updates")
    parser.add_argument("--status", action="store_true", help="Display current schedule state")
    parser.add_argument("--dry-run", action="store_true", help="Simulate without side effects")
    parser.add_argument("--force", action="store_true", help="Force a fresh decision now")
    parser.add_argument("--install", action="store_true", help="Write initial Sunday-only plist and exit")
    parser.add_argument("--today", help="Override current date for testing (YYYY-MM-DD; implies --dry-run use)")
    args = parser.parse_args()

    if args.install:
        log(f"Writing initial Sunday-only plist with RunAtLoad=true -> {PLIST_PATH}")
        ok = write_plist(0)
        return 0 if ok else 1

    now = datetime.now()
    if args.today:
        if not args.dry_run:
            print("Note: --today ignored unless --dry-run is also set (safety). Using real date.")
        else:
            try:
                now = datetime.strptime(args.today, "%Y-%m-%d").replace(hour=10, minute=0)
            except ValueError as e:
                print(f"Bad --today value: {e}")
                return 2

    today_weekday = get_launchd_weekday(now)
    today_name = DAY_NAMES[today_weekday]
    current_sunday = get_sunday_date(now)
    state = load_state()

    if args.status:
        print_status(now, state)
        return 0

    log("=" * 60)
    log(f"Starting schedule runner. Today is {today_name} ({now.strftime('%Y-%m-%d')}). Week start {current_sunday}.")
    log("=" * 60)

    if args.dry_run:
        log(f"[DRY-RUN] Current state: {state}")
        if valid_decision(state, current_sunday):
            t = state["target_weekday"]
            if today_weekday == t:
                if state.get("last_run_week") == current_sunday:
                    log(f"[DRY-RUN] Today is target ({DAY_NAMES[t]}); already ran -> no-op.")
                else:
                    log(f"[DRY-RUN] Today is target ({DAY_NAMES[t]}); WOULD run update-all now.")
            else:
                log(f"[DRY-RUN] Today != target ({DAY_NAMES[t]}); no-op.")
        else:
            log("[DRY-RUN] No valid decision for current week; simulating a fresh decision:")
            make_decision(state, today_weekday, current_sunday, dry_run=True)
        return 0

    if not acquire_lock():
        log("Another instance is running; exiting.")
        return 0

    if args.force:
        log("Force: making a fresh decision for the current week.")
        make_decision(state, today_weekday, current_sunday)
        return 0

    if not valid_decision(state, current_sunday):
        log("No valid decision for the current week; making one now.")
        make_decision(state, today_weekday, current_sunday)
        return 0

    target = state["target_weekday"]
    if today_weekday == target:
        if state.get("last_run_week") == current_sunday:
            log(f"Update for week {current_sunday} already ran ({state.get('last_run_timestamp')}); no-op.")
        else:
            log(f"Today ({today_name}) is the target day; running update...")
            if run_update_all():
                state["last_run_week"] = current_sunday
                state["last_run_timestamp"] = now_iso()
                save_state(state)
    else:
        log(f"No update scheduled for today ({today_name}); this week's target is {DAY_NAMES[target]}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
