"""Browser regression: python3 scripts/check-ai-family-view.py [--url LIVE_URL].

Requires Playwright and Chromium. By default serves the existing `out` build
on an ephemeral local port. Uses private contexts; never clears user settings.
Checks rendered circle/line geometry, not just tooltip payload names.
"""

import argparse
from collections import Counter
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import re
from threading import Thread

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parent.parent
MODELS = json.loads((ROOT / "src/data/ai-models.json").read_text())["models"]
PAGE_SOURCE = (ROOT / "src/app/agentic-ai/page.tsx").read_text()
DEFAULT_HIDDEN = set(re.findall(
    r'"([^"]+)"', PAGE_SOURCE.split("const DEFAULT_HIDDEN_IDS", 1)[1].split("]);", 1)[0],
))
FILTER_VERSION = re.search(r"const FILTER_VERSION\s*=\s*(\d+)", PAGE_SOURCE).group(1)
EFFORT = re.compile(r"^(.*?)\s+\((non-reasoning|low|medium|high|xhigh|max)( with fallback)?\)$", re.I)
EFFORT_ORDER = {"non-reasoning": 0, "low": 1, "medium": 2, "high": 3, "xhigh": 4, "max": 5}


def family(model):
    match = EFFORT.match(model["shortName"])
    return model["provider"], match[1] if match else model["id"]


def effort(model):
    match = EFFORT.match(model["shortName"])
    return match[2].lower() if match else None


def expand(selected):
    families = {family(model) for model in selected}
    ids = {model["id"] for model in selected}
    return [model for model in MODELS if model["id"] in ids or (
        family(model) in families and effort(model) != "non-reasoning"
    )]


def check_chart(page, selected, metric="intelligenceIndex", cost="blendedPrice"):
    expected = {model["id"] for model in selected if isinstance(model.get(metric), (int, float))
                and isinstance(model.get(cost), (int, float)) and model[cost] > 0}
    circles = page.locator("svg g[data-model-id]").evaluate_all("""els => Object.fromEntries(els.map(el => {
      const circle = el.querySelector('circle');
      return [el.dataset.modelId, [Number(circle.getAttribute('cx')), Number(circle.getAttribute('cy'))]];
    }))""")
    assert set(circles) == expected, f"Wrong plotted models: missing={expected - circles.keys()}, extra={circles.keys() - expected}"
    if page.get_by_role("button", name="Family view on", exact=True).count() == 0:
        return
    expected_segments = []
    groups = {}
    for model in selected:
        groups.setdefault(family(model), []).append(model)
    for group in groups.values():
        ordered = sorted(group, key=lambda model: EFFORT_ORDER.get(effort(model), -1))
        for previous, current in zip(ordered, ordered[1:]):
            if previous["id"] in circles and current["id"] in circles:
                expected_segments.append(circles[previous["id"]] + circles[current["id"]])
    actual_segments = page.locator(".model-family-connection line").evaluate_all("""els => els.map(el =>
      ['x1', 'y1', 'x2', 'y2'].map(attr => Number(el.getAttribute(attr))))""")
    rounded = lambda segments: Counter(tuple(round(value, 4) for value in segment) for segment in segments)
    assert rounded(expected_segments) == rounded(actual_segments), "Family connections must end at their actual variant circles"


def check_selection(page, selected):
    actual = set(page.locator('#model-filter-content button[data-model-id][aria-pressed="true"]').evaluate_all(
        "els => els.map(el => el.dataset.modelId)",
    ))
    assert actual == {model["id"] for model in selected}, "Models panel and chart selection must agree"


def run_context(browser, url, saved_hidden=None, mobile=False, saved_version=None):
    context = browser.new_context(viewport={"width": 390 if mobile else 1440, "height": 1000},
                                  has_touch=mobile, is_mobile=mobile)
    if saved_hidden is not None:
        context.add_init_script("""if (!sessionStorage.getItem('selection-seeded')) {
          localStorage.setItem('filterVersion', %s);
          localStorage.setItem('hiddenModelIds', %s);
          sessionStorage.setItem('selection-seeded', 'true');
        }""" % (json.dumps(saved_version or FILTER_VERSION), json.dumps(json.dumps(sorted(saved_hidden)))))
    page = context.new_page()
    page.goto(url, wait_until="networkidle", timeout=90000)
    page.get_by_role("button", name="Models", exact=True).click()
    hidden = DEFAULT_HIDDEN if saved_hidden is None else saved_hidden
    if saved_hidden is not None and saved_version and saved_version != FILTER_VERSION:
        hidden = hidden | DEFAULT_HIDDEN
    selected = [model for model in MODELS if model["id"] not in hidden]
    saved = page.evaluate("localStorage.getItem('hiddenModelIds')")
    check_selection(page, selected)
    check_chart(page, selected)
    page.get_by_role("button", name="Family view off", exact=True).click()
    expanded = expand(selected)
    check_selection(page, expanded)
    for label, cost in [("Price / 1M tokens", "blendedPrice"), ("Total cost to run", "costToRunIndex"),
                        ("Cost per task", "costPerTask")]:
        page.get_by_role("button", name=label, exact=True).click()
        check_chart(page, expanded, cost=cost)
    for label, metric in [("Coding Ability", "codingIndex"), ("Knowledge Work", "knowledgeWorkIndex"),
                          ("Scientific Capability", "scienceIndex"), ("General Capability", "generalIndex")]:
        page.get_by_role("button", name=re.compile("^" + label + r"\s*Local v5")).click()
        check_chart(page, expanded, metric=metric, cost="costPerTask")
    # The mode must survive chart remounts when visiting Documentation.
    page.get_by_role("button", name="Documentation", exact=True).click()
    check_selection(page, expanded)
    page.get_by_role("button", name="Documentation", exact=True).click()
    assert page.get_by_role("button", name="Family view on", exact=True).count() == 1
    # Individual toggles in Family view edit the shared temporary selection.
    extra = next(model for model in expanded if model not in selected)
    page.locator(f'#model-filter-content button[data-model-id="{extra["id"]}"]').click()
    check_selection(page, [model for model in expanded if model != extra])
    check_chart(page, [model for model in expanded if model != extra], metric="generalIndex", cost="costPerTask")
    page.get_by_role("button", name="Family view on", exact=True).click()
    check_selection(page, selected)
    assert page.evaluate("localStorage.getItem('hiddenModelIds')") == saved, "Family mode must not overwrite saved choices"
    page.reload(wait_until="networkidle")
    page.get_by_role("button", name="Models", exact=True).click()
    check_selection(page, selected)
    assert page.get_by_role("button", name="Family view off", exact=True).count() == 1
    context.close()


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/personal_webpage"):
            self.path = self.path[len("/personal_webpage"):] or "/"
        if self.path == "/agentic-ai":
            self.path = "/agentic-ai.html"
        super().do_GET()

    def log_message(self, *_args):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", help="Test a deployed page instead of the local static export")
    args = parser.parse_args()
    server = None
    if not args.url:
        server = ThreadingHTTPServer(("127.0.0.1", 0), partial(Handler, directory=str(ROOT / "out")))
        Thread(target=server.serve_forever, daemon=True).start()
        args.url = f"http://127.0.0.1:{server.server_port}/personal_webpage/agentic-ai"
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            run_context(browser, args.url)
            print("PASS: fresh defaults, shared family selection, actual connections, all cost modes/categories, mode restore")
            # Max-only saved choices plus one deliberately selected non-reasoning
            # variant. Unselected families must remain absent.
            selected = {"claude-fable-5-2", "gpt-6-1-terra", "gpt-6-1-terra-non-reasoning", "muse-ember"}
            run_context(browser, args.url, {model["id"] for model in MODELS} - selected)
            print("PASS: saved max-only selection and explicit non-reasoning override")
            run_context(browser, args.url, {"muse-ember"}, saved_version=str(int(FILTER_VERSION) - 1))
            print("PASS: previous filter-version migration preserves user-hidden models and applies max-only defaults")
            run_context(browser, args.url, mobile=True)
            print("PASS: touch-sized viewport")
            browser.close()
    finally:
        if server:
            server.shutdown()
            server.server_close()


if __name__ == "__main__":
    main()
