# MVSI × Amplitude technical review test site

A static site that works through the technical questions MVSI raised about using Amplitude on
KYB onboarding forms with hundreds of fields across many client tenants, plus a sourced
comparison with LogRocket.

Live site: https://shermozle.github.io/mvsi-testing/

## Pages, in sequence

| # | Page | What it demonstrates |
|---|------|----------------------|
| 1 | `performance/` | Eight copies of the same 70-field KYB form with different Amplitude components. Measured transfer sizes, runtime notes, and a WebPageTest method. |
| 2 | `masking/` | One of every field type, a Light / Medium / Conservative switch, and an in-page inspector that decodes every payload before it leaves the browser. |
| 3 | `tenant-control/` | A deliberately misconfigured tenant form (Light masking, sensitive fields unmasked) against live project-level settings that override it. Table of central controls vs implementation responsibilities. |
| 4 | `recording-privacy/` | Where masking happens, what it cannot cover, and what rule changes do to replays that already exist. |
| 5 | `instrumentation/` | Proposal for a fixed event model built into MVSI's form renderer, starting from Autocapture, never carrying a field value. |
| – | `logrocket/` | Desk research on LogRocket against the same questions, every claim sourced. Notes in `logrocket/research.md`. |

## How it is built

- Plain HTML, CSS and JS, no build step. GitHub Pages serves `main` from the root.
- SDKs load from Amplitude's CDN with static `<script>` tags so WebPageTest sees a realistic waterfall.
- `assets/config.js` holds the API key and project link. Browser API keys are public by design.
- `assets/kyb-form.js` renders the fictional KYB form from a schema and emits a small set of safe custom events when an SDK is present.
- `assets/wire-inspector.js` wraps `fetch`, `XMLHttpRequest` and `sendBeacon` to show requests to Amplitude in-page. It observes only.
- `assets/perf-panel.js` reports resource timing, long tasks and Web Vitals on the variant pages.
- `tools/build-variants.py` regenerates `performance/*.html` from `tools/variant.template.html`. Run it after changing a version or init option.
- `sr-config/` holds a pinned copy of the project's remote config so the masking page can show what the SDK does on its own. The tenant-control page uses Amplitude's live endpoint.

## Demo-only query parameters

- `?level=light|medium|conservative` on the masking, tenant-control and recording-privacy pages sets the local mask level.
- `?debug=1` turns on SDK debug logging and makes Session Replay ignore window focus, for testing in embedded browsers.

## Amplitude project

Data goes to the `[SR] MVSI demo` project (884898) in the AmpliDemo org. The project API key is accepted as an
Experiment deployment key, so the Experiment variant needs no extra key.
