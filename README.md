# Personal Webpage - Jairo M. Valdivia

A living portfolio and research dashboard for Jairo M. Valdivia, Ph.D. Student in Atmospheric and Oceanic Sciences at CU Boulder.

🔴 **Live Site:** [https://jvaldivia23.github.io/personal_webpage/](https://jvaldivia23.github.io/personal_webpage/)

![Build Status](https://github.com/JValdivia23/personal_webpage/actions/workflows/deploy.yml/badge.svg)

## Maintaining the AI benchmarks

**New agents and contributors: start with [AI Models Maintenance](docs/AI_MODELS_MAINTENANCE.md).** It covers model/variant research, default visibility, parser compatibility, full-dataset validation, setup, and safe deployment without previous chat history.

See the [metrics reference](src/data/ai-models-metrics-documentation.md) for benchmark definitions and derived scores. Current model counts and timestamps come from `src/data/ai-models.json`, not an old session summary. Local `AGENTS.md` is gitignored; the maintenance guide is the tracked handoff for fresh clones.

## 🌟 Features

*   **Research Dashboard:** Interactive visualization of active projects (e.g., 3D CTGC Tracking).
*   **Publications:** Locally synced publication and citation data.
*   **Reading List:** A "News & Views" style feed for scientific commentary, powered by Markdown.
*   **Active Stats:** Synced citation counts and h-index display.
*   **Agentic AI Benchmarks:** Interactive model comparisons using Artificial Analysis data.

## 🚀 Getting Started

Use Node.js 20.9+ for the current Next.js version. AI model sync also needs Python and Playwright; see the maintenance guide above.

1.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn
    ```

2.  **Run development server:**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000/personal_webpage](http://localhost:3000/personal_webpage).

## 📂 Project Structure

*   `src/app`: Next.js App Router pages (Home, Research, Publications, Reading, Agentic AI).
*   `src/content/reading`: Markdown files for the Reading List.
*   `src/data`: JSON data for publications, stats, GitHub repositories, and AI benchmarks.
*   `docs`: Tracked maintenance guides for contributors and new agent sessions.
*   `public/projects`: Standalone web projects (e.g., 3D CTGC visualization).
*   `scripts`: Python/Node.js scripts for fetching external data.

## 🛠 Manual Updates

Some content is curated manually. The maintainer's local, gitignored `MANUAL_UPDATES.md` covers the following; it is not included in a fresh clone:
*   Bio & Contact Info
*   Featured/Active Research
*   Reading List Articles
*   Recommended Papers

## 🤖 Automation

*   **Local data sync:** Scholar/GitHub updates use `scripts/update-all.py`, scheduled locally by the maintainer's macOS LaunchAgent and `scripts/schedule-runner.py`, not GitHub Actions.
*   **AI benchmarks:** Updated separately with `python3 scripts/sync-ai-models.py` after reviewing the requested model additions; follow the [maintenance guide](docs/AI_MODELS_MAINTENANCE.md).
*   **Auto-Deploy:** GitHub Actions builds and deploys the static site to GitHub Pages on pushes to `main`.
