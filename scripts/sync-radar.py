#!/usr/bin/env python3
"""
Sync the standalone NOAA MRMS radar viewer into public/radar/.

Downloads the self-contained viewer from the mrms-radar repository
(direct NOAA WMS, no proxy/backend) and writes it to public/radar/index.html.

PWA/service-worker caching was intentionally removed: this script scrubs any
manifest / apple-touch-icon / serviceWorker registration markers so re-syncs
stay PWA-free. It also injects a one-time cleanup snippet that unregisters
any previously installed radar service worker (cache "mrms-*") in returning
visitors' browsers.

Usage:
    python scripts/sync-radar.py [--source-url URL] [--min-bytes N]
"""

import argparse
import ssl
import sys
import urllib.request
from pathlib import Path

SOURCE_URL = (
    "https://raw.githubusercontent.com/JValdivia23/mrms-radar"
    "/main/standalone/noaa_wms/index.html"
)
MIN_BYTES = 1_000_000  # standalone file is ~2 MB; anything smaller is suspicious

REPO_ROOT = Path(__file__).parent.parent.resolve()
DEST_FILE = REPO_ROOT / "public" / "radar" / "index.html"

# Markers the downloaded file MUST contain (proves it is the new viewer).
REQUIRED_MARKERS = [
    "<!DOCTYPE html>",
    'id="radar-app"',
    "opengeo.ncep.noaa.gov",
]

# Markers from the old proxied viewer that must NOT appear.
FORBIDDEN_MARKERS = [
    "PROXY_URL",
    "netlify",
    "unpkg.com",
]

# PWA marker substrings: any line containing one of these is dropped.
# (Line-based filtering keeps the scrub linear-time even on megabyte-long
# minified/base64 lines, where a leading ".*" regex would backtrack.)
PWA_LINE_MARKERS = [
    'rel="manifest"',
    "rel='manifest'",
    "apple-touch-icon",
    "serviceWorker",
]


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "personal-webpage-sync/1.0"})
    try:
        import certifi  # type: ignore

        context = ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        context = None  # fall back to system CA store
    with urllib.request.urlopen(req, timeout=60, context=context) as resp:
        return resp.read()


def scrub_pwa(html: str) -> tuple[str, int]:
    lines = html.splitlines(keepends=True)
    kept = [ln for ln in lines if not any(m in ln for m in PWA_LINE_MARKERS)]
    return "".join(kept), len(lines) - len(kept)


CLEANUP_MARKER = "radar-sw-cleanup"

FAVICON_LINK = '<link rel="icon" href="/personal_webpage/icon.svg">\n'

CLEANUP_SNIPPET = """<!-- radar-sw-cleanup: PWA removed; drop any previously installed radar SW/caches -->
<script>
(function(){try{
if("serviceWorker" in navigator){navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){if((r.scope||"").indexOf("/radar")!==-1){r.unregister();}});}).catch(function(){});}
if(window.caches&&caches.keys){caches.keys().then(function(ks){ks.forEach(function(k){if(k.indexOf("mrms")===0){caches.delete(k);}});}).catch(function(){});}
}catch(e){}})();
</script>
"""


def inject_cleanup(html: str) -> tuple[str, bool]:
    """Insert favicon link + SW-cleanup snippet right after <head>. Idempotent."""
    if CLEANUP_MARKER in html:
        return html, False
    if html.count("<head>") != 1:
        print("WARNING: <head> anchor not unique; skipping head injection.")
        return html, False
    injection = "<head>\n" + FAVICON_LINK + CLEANUP_SNIPPET
    return html.replace("<head>", injection, 1), True


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-url", default=SOURCE_URL)
    parser.add_argument("--min-bytes", type=int, default=MIN_BYTES)
    args = parser.parse_args()

    print(f"Fetching radar viewer from:\n  {args.source_url}")
    try:
        raw = fetch(args.source_url)
    except Exception as e:
        print(f"ERROR: download failed: {e}", file=sys.stderr)
        return 1

    print(f"Downloaded {len(raw)} bytes.")
    if len(raw) < args.min_bytes:
        print(
            f"ERROR: file too small ({len(raw)} < {args.min_bytes} bytes). "
            "Refusing to overwrite.",
            file=sys.stderr,
        )
        return 1

    try:
        html = raw.decode("utf-8")
    except UnicodeDecodeError as e:
        print(f"ERROR: file is not valid UTF-8: {e}", file=sys.stderr)
        return 1

    missing = [m for m in REQUIRED_MARKERS if m not in html]
    if missing:
        print(f"ERROR: missing required markers: {missing}", file=sys.stderr)
        return 1

    forbidden = [m for m in FORBIDDEN_MARKERS if m in html]
    if forbidden:
        print(
            f"ERROR: file contains old-viewer markers {forbidden} "
            "(proxy/CDN viewer?). Refusing to overwrite.",
            file=sys.stderr,
        )
        return 1

    html, removals = scrub_pwa(html)
    if removals:
        print(f"Scrubbed {removals} PWA marker(s).")
    else:
        print("No PWA markers found (already PWA-free).")

    html, injected = inject_cleanup(html)
    print("Head extras injected (favicon + cleanup)." if injected else "Head extras already present/skipped.")

    DEST_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = DEST_FILE.with_suffix(".tmp")
    tmp.write_text(html, encoding="utf-8")
    tmp.replace(DEST_FILE)
    print(f"Wrote {DEST_FILE} ({len(html.encode('utf-8'))} bytes).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
