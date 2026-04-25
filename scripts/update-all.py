#!/usr/bin/env python3
"""
Unified data sync script for the personal webpage.

Run this locally to update publications, stats, and GitHub repos,
then commit and push the changes. GitHub Pages will auto-deploy.

Usage:
    python scripts/update-all.py

What it does:
    1. Pulls latest changes from origin/main
    2. Runs sync-scholar.py  (Google Scholar -> publications.json + stats.json)
    3. Runs sync-github.js   (GitHub GraphQL -> github.json)
    4. Validates the output files (safety checks)
    5. Commits and pushes only if data actually changed
    6. Triggers the Deploy workflow on GitHub Pages automatically

Requirements:
    - Python 3.x with `scholarly` installed
    - Node.js with dependencies installed (`npm install`)
    - Git configured with push access to origin
    - GITHUB_TOKEN or GH_PAT environment variable for GitHub sync
"""

import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
REPO_ROOT = Path(__file__).parent.parent.resolve()
DATA_DIR = REPO_ROOT / "src" / "data"
SCHOLAR_SCRIPT = REPO_ROOT / "scripts" / "sync-scholar.py"
GITHUB_SCRIPT = REPO_ROOT / "scripts" / "sync-github.js"

PUBLICATIONS_FILE = DATA_DIR / "publications.json"
STATS_FILE = DATA_DIR / "stats.json"
GITHUB_FILE = DATA_DIR / "github.json"

MIN_PUBLICATIONS = 10
MIN_GITHUB_REPOS = 1

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def log(msg: str) -> None:
    """Print a timestamped log message."""
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}")


def run(cmd: list[str], **kwargs) -> subprocess.CompletedProcess:
    """Run a shell command and return the result."""
    log(f"Running: {' '.join(cmd)}")
    return subprocess.run(cmd, cwd=REPO_ROOT, **kwargs)


def git_pull() -> bool:
    """Pull latest changes from origin. Returns True on success."""
    result = run(["git", "pull", "origin", "main"], capture_output=True, text=True)
    if result.returncode != 0:
        log(f"ERROR: git pull failed:\n{result.stderr}")
        return False
    log("Git pull successful.")
    return True


def run_scholar_sync() -> bool:
    """Run the Google Scholar sync script. Returns True on success."""
    result = run([sys.executable, str(SCHOLAR_SCRIPT)], capture_output=True, text=True)
    print(result.stdout)
    if result.returncode != 0:
        log(f"Google Scholar sync FAILED (exit {result.returncode}).")
        if result.stderr:
            print(result.stderr, file=sys.stderr)
        return False
    log("Google Scholar sync succeeded.")
    return True


def run_github_sync() -> bool:
    """Run the GitHub repo sync script. Returns True on success."""
    env = os.environ.copy()
    # Ensure token is available (workflow uses GH_PAT || GITHUB_TOKEN)
    if not env.get("GITHUB_TOKEN") and not env.get("GH_PAT"):
        log("WARNING: GITHUB_TOKEN or GH_PAT not set. GitHub sync may fail.")

    result = run(["node", str(GITHUB_SCRIPT)], capture_output=True, text=True, env=env)
    print(result.stdout)
    if result.returncode != 0:
        log(f"GitHub sync FAILED (exit {result.returncode}).")
        if result.stderr:
            print(result.stderr, file=sys.stderr)
        return False
    log("GitHub sync succeeded.")
    return True


def validate_data() -> tuple[bool, str]:
    """
    Validate generated data files to prevent bad syncs from being committed.
    Returns (is_valid, reason).
    """
    # Check publications
    try:
        with open(PUBLICATIONS_FILE, "r", encoding="utf-8") as f:
            pubs = json.load(f)
        if not isinstance(pubs, list):
            return False, "publications.json is not a list"
        if len(pubs) < MIN_PUBLICATIONS:
            return False, f"publications.json has only {len(pubs)} entries (min {MIN_PUBLICATIONS})"
    except (json.JSONDecodeError, FileNotFoundError) as e:
        return False, f"publications.json unreadable: {e}"

    # Check stats
    try:
        with open(STATS_FILE, "r", encoding="utf-8") as f:
            stats = json.load(f)
        if "googleScholar" not in stats:
            return False, "stats.json missing googleScholar key"
        if stats["googleScholar"].get("citations", 0) == 0:
            return False, "stats.json shows 0 citations (suspicious)"
    except (json.JSONDecodeError, FileNotFoundError) as e:
        return False, f"stats.json unreadable: {e}"

    # Check github repos
    try:
        with open(GITHUB_FILE, "r", encoding="utf-8") as f:
            repos = json.load(f)
        if not isinstance(repos, list):
            return False, "github.json is not a list"
        if len(repos) < MIN_GITHUB_REPOS:
            return False, f"github.json has only {len(repos)} repos (min {MIN_GITHUB_REPOS})"
    except (json.JSONDecodeError, FileNotFoundError) as e:
        return False, f"github.json unreadable: {e}"

    log(f"Validation passed: {len(pubs)} publications, {stats['googleScholar']['citations']} citations, {len(repos)} repos.")
    return True, ""


def commit_and_push() -> bool:
    """Stage data files, commit if changed, and push. Returns True if pushed."""
    # Stage only data files
    run(["git", "add", "src/data/*.json"], capture_output=True, text=True)

    # Check if there is anything staged
    diff_result = run(["git", "diff", "--staged", "--quiet"], capture_output=True, text=True)
    if diff_result.returncode == 0:
        log("No data changes to commit.")
        return False  # Nothing to push

    # Commit
    commit_result = run(
        ["git", "commit", "-m", "chore: update data [skip ci]"],
        capture_output=True,
        text=True,
    )
    if commit_result.returncode != 0:
        log(f"ERROR: git commit failed:\n{commit_result.stderr}")
        return False
    log("Changes committed.")

    # Push
    push_result = run(["git", "push", "origin", "main"], capture_output=True, text=True)
    if push_result.returncode != 0:
        log(f"ERROR: git push failed:\n{push_result.stderr}")
        return False
    log("Changes pushed to origin/main. Deploy workflow will trigger automatically.")
    return True


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> int:
    log("=" * 60)
    log("Starting unified data update")
    log("=" * 60)

    # 1. Pull latest
    if not git_pull():
        log("Aborting: could not pull latest changes.")
        return 1

    # 2. Run syncs (best effort: if one fails, still try the other)
    scholar_ok = run_scholar_sync()
    github_ok = run_github_sync()

    if not scholar_ok and not github_ok:
        log("Both syncs failed. Nothing to commit.")
        return 1

    # 3. Validate outputs
    is_valid, reason = validate_data()
    if not is_valid:
        log(f"VALIDATION FAILED: {reason}")
        log("Aborting commit to prevent bad data from going live.")
        return 1

    # 4. Commit and push if changed
    pushed = commit_and_push()

    log("=" * 60)
    if pushed:
        log("Update complete. Site will deploy shortly.")
    else:
        log("Update complete. No changes detected.")
    log("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
