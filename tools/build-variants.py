#!/usr/bin/env python3
"""Generate the SDK performance variant pages from one template.

Each variant is a real, copy-pasteable implementation: the SDK script tags sit
statically in <head> exactly as a customer would deploy them, so WebPageTest
sees a realistic waterfall. Run from the repo root:

    python3 tools/build-variants.py
"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
API_KEY = "f191237affdc9c7730461b55cce0f71d"
V_ANALYTICS = "2.48.0"
V_SR = "1.36.3"
V_EXP = "1.24.0"

CDN = "https://cdn.amplitude.com/libs"
ANALYTICS = f'<script src="{CDN}/analytics-browser-{V_ANALYTICS}-min.js.gz"></script>'
SR = f'<script src="{CDN}/plugin-session-replay-browser-{V_SR}-min.js.gz"></script>'
ENGAGEMENT = f'<script src="https://cdn.amplitude.com/script/{API_KEY}.engagement.js"></script>'
EXPERIMENT = f'<script src="https://unpkg.com/@amplitude/experiment-js-client@{V_EXP}/dist/experiment.umd.js"></script>'
UNIFIED = f'<script src="https://cdn.amplitude.com/script/{API_KEY}.js"></script>'

def init(body):
    return "<script>\n" + body.strip("\n") + "\n</script>"

ANALYTICS_ONLY_INIT = f"""
window.__ampPerf = {{ t0: performance.now() }};
amplitude.init("{API_KEY}", {{
  fetchRemoteConfig: true,
  autocapture: {{ sessions: true, pageViews: true, attribution: true,
                 fileDownloads: false, formInteractions: false, elementInteractions: false }}
}}).promise.then(function () {{ window.__ampPerf.sdkReady = performance.now(); }});
"""

AUTOCAPTURE_INIT = f"""
window.__ampPerf = {{ t0: performance.now() }};
amplitude.init("{API_KEY}", {{
  fetchRemoteConfig: true,
  autocapture: true   // sessions, page views, attribution, file downloads, form interactions, element interactions
}}).promise.then(function () {{ window.__ampPerf.sdkReady = performance.now(); }});
"""

REPLAY_INIT = f"""
window.__ampPerf = {{ t0: performance.now() }};
amplitude.add(window.sessionReplay.plugin({{
  sampleRate: 1,                       // 100% for testing; production rates are usually far lower
  privacyConfig: {{ defaultMaskLevel: "medium" }}
}}));
amplitude.init("{API_KEY}", {{
  fetchRemoteConfig: true,
  autocapture: {{ sessions: true, pageViews: true, attribution: true,
                 fileDownloads: false, formInteractions: false, elementInteractions: false }}
}}).promise.then(function () {{ window.__ampPerf.sdkReady = performance.now(); }});
"""

GUIDES_INIT = f"""
window.__ampPerf = {{ t0: performance.now() }};
amplitude.add(window.engagement.plugin());
amplitude.init("{API_KEY}", {{
  fetchRemoteConfig: true,
  autocapture: {{ sessions: true, pageViews: true, attribution: true,
                 fileDownloads: false, formInteractions: false, elementInteractions: false }}
}}).promise.then(function () {{ window.__ampPerf.sdkReady = performance.now(); }});
"""

EXPERIMENT_INIT = f"""
window.__ampPerf = {{ t0: performance.now() }};
amplitude.init("{API_KEY}", {{
  fetchRemoteConfig: true,
  autocapture: {{ sessions: true, pageViews: true, attribution: true,
                 fileDownloads: false, formInteractions: false, elementInteractions: false }}
}}).promise.then(function () {{
  // The project API key doubles as a deployment key. Replace with a dedicated
  // client-side deployment key if you create one in Experiment.
  window.experiment = Experiment.initializeWithAmplitudeAnalytics("{API_KEY}");
  return window.experiment.fetch();
}}).then(function () {{
  window.__ampPerf.sdkReady = performance.now();
  var v = window.experiment.variant("kyb-form-layout", {{ value: "control" }});
  document.documentElement.setAttribute("data-variant-kyb-form-layout", v.value);
}});
"""

ALL_INIT = f"""
window.__ampPerf = {{ t0: performance.now() }};
amplitude.add(window.sessionReplay.plugin({{ sampleRate: 1, privacyConfig: {{ defaultMaskLevel: "medium" }} }}));
amplitude.add(window.engagement.plugin());
amplitude.init("{API_KEY}", {{
  fetchRemoteConfig: true,
  autocapture: true
}}).promise.then(function () {{
  window.experiment = Experiment.initializeWithAmplitudeAnalytics("{API_KEY}");
  return window.experiment.fetch();
}}).then(function () {{ window.__ampPerf.sdkReady = performance.now(); }});
"""

UNIFIED_INIT = f"""
window.__ampPerf = {{ t0: performance.now() }};
// This is the documented "one line" install. The script above is a loader:
// it ships the Web Experiment tag inline, then fetches the analytics SDK and
// the Session Replay plugin as separate files from cdn.amplitude.com.
window.amplitude.init("{API_KEY}", {{
  fetchRemoteConfig: true,
  autocapture: true
}}).promise.then(function () {{ window.__ampPerf.sdkReady = performance.now(); }});
window.amplitude.add(window.sessionReplay.plugin({{ sampleRate: 1, privacyConfig: {{ defaultMaskLevel: "medium" }} }}));
"""

VARIANTS = [
  dict(slug="none", title="No SDK (baseline)", components=[],
       head="", summary="The KYB form with no analytics at all. Every other variant is compared against this."),
  dict(slug="analytics", title="Analytics only", components=["Analytics"],
       head=ANALYTICS + "\n" + init(ANALYTICS_ONLY_INIT),
       summary="Browser SDK 2 with sessions, page views and attribution. Element and form autocapture switched off."),
  dict(slug="autocapture", title="Analytics + Autocapture", components=["Analytics", "Autocapture"],
       head=ANALYTICS + "\n" + init(AUTOCAPTURE_INIT),
       summary="Same SDK file, with element interactions and form interactions on. No extra script; the cost is runtime listeners and event volume."),
  dict(slug="session-replay", title="Analytics + Session Replay", components=["Analytics", "Session Replay"],
       head=ANALYTICS + "\n" + SR + "\n" + init(REPLAY_INIT),
       summary="Adds the Session Replay plugin at 100% sample rate with Medium masking. This is the heaviest single component."),
  dict(slug="guides-surveys", title="Analytics + Guides & Surveys", components=["Analytics", "Guides & Surveys"],
       head=ANALYTICS + "\n" + ENGAGEMENT + "\n" + init(GUIDES_INIT),
       summary="Adds the Guides & Surveys engagement plugin. The small script is a loader that fetches the full engagement bundle."),
  dict(slug="experiment", title="Analytics + Feature Experiment", components=["Analytics", "Experiment"],
       head=ANALYTICS + "\n" + EXPERIMENT + "\n" + init(EXPERIMENT_INIT),
       summary="Adds the Experiment JavaScript client and fetches variants after analytics initialises."),
  dict(slug="all", title="Everything enabled", components=["Analytics", "Autocapture", "Session Replay", "Guides & Surveys", "Experiment"],
       head=ANALYTICS + "\n" + SR + "\n" + ENGAGEMENT + "\n" + EXPERIMENT + "\n" + init(ALL_INIT),
       summary="All components together, the way a maximal deployment would look."),
  dict(slug="unified-script", title="Unified Script, as shipped", components=["Analytics", "Autocapture", "Session Replay", "Web Experiment"],
       head=UNIFIED + "\n" + init(UNIFIED_INIT),
       summary="The documented one-line install for this project key. Included so the numbers reflect the default path, not just hand-assembled builds."),
]

TEMPLATE = (ROOT / "tools/variant.template.html").read_text()

def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

for v in VARIANTS:
    html = (TEMPLATE
            .replace("{{TITLE}}", v["title"])
            .replace("{{SLUG}}", v["slug"])
            .replace("{{SUMMARY}}", v["summary"])
            .replace("{{COMPONENTS}}", ", ".join(v["components"]) or "none")
            .replace("{{SDK_HEAD}}", v["head"])
            .replace("{{SDK_HEAD_ESCAPED}}", esc(v["head"]) if v["head"] else "<!-- no SDK -->"))
    out = ROOT / "performance" / f"{v['slug']}.html"
    out.write_text(html)
    print("wrote", out.relative_to(ROOT))
