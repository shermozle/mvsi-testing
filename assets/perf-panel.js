// In-page measurement panel for the SDK performance variants.
// Reports what the browser can measure itself: resource timing for third-party
// scripts and beacons, long tasks, Web Vitals and time until the SDK is usable.
// WebPageTest remains the source of truth for bytes and filmstrips; this panel
// is for live demos and sanity checks.
(function () {
  var THIRD_PARTY = /amplitude\.com|unpkg\.com|lab\.amplitude|amplitude\.com\/libs|lr-ingest|logrocket/i;
  // cdn.amplitude.com sends no Timing-Allow-Origin header, so transferSize is 0
  // cross-origin. These are the sizes measured with curl on 2026-10-20 (bytes on the wire).
  var KNOWN_SIZES = {
    "analytics-browser-2.48.0-min.js.gz": 68659,
    "plugin-session-replay-browser-1.36.3-min.js.gz": 145771,
    "plugin-session-replay-browser-1.32.1-min.js.gz": 145000,
    "plugin-autocapture-browser-1.0.0-min.js.gz": 16135,
    "experiment.umd.js": 42458,
    ".engagement.js": 3642,
    "engagement-browser/prod/index.min.js.gz": 489021,
    ".async.js": 1122,
    "/script/f191237affdc9c7730461b55cce0f71d.js": 54259
  };
  function knownSize(url) {
    for (var k in KNOWN_SIZES) if (url.indexOf(k) >= 0) return KNOWN_SIZES[k];
    return null;
  }

  var state = { longTasks: [], lcp: null, cls: 0, inp: 0, fcp: null, sdkReady: null };
  window.__ampPerf = window.__ampPerf || {};

  try {
    new PerformanceObserver(function (list) {
      list.getEntries().forEach(function (e) { state.longTasks.push(e); });
    }).observe({ type: "longtask", buffered: true });
  } catch (e) {}
  try {
    new PerformanceObserver(function (list) {
      var entries = list.getEntries(); state.lcp = entries[entries.length - 1].startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch (e) {}
  try {
    new PerformanceObserver(function (list) {
      list.getEntries().forEach(function (e) { if (!e.hadRecentInput) state.cls += e.value; });
    }).observe({ type: "layout-shift", buffered: true });
  } catch (e) {}
  try {
    new PerformanceObserver(function (list) {
      list.getEntries().forEach(function (e) { if (e.duration > state.inp) state.inp = e.duration; });
    }).observe({ type: "event", buffered: true, durationThreshold: 16 });
  } catch (e) {}
  try {
    new PerformanceObserver(function (list) {
      list.getEntries().forEach(function (e) { if (e.name === "first-contentful-paint") state.fcp = e.startTime; });
    }).observe({ type: "paint", buffered: true });
  } catch (e) {}

  function fmtMs(v) { return v == null ? "–" : Math.round(v) + " ms"; }
  function fmtKb(v) { return v == null ? "–" : (v / 1024).toFixed(1) + " kB"; }

  function collect() {
    var res = performance.getEntriesByType("resource").filter(function (r) { return THIRD_PARTY.test(r.name); });
    var scripts = res.filter(function (r) { return r.initiatorType === "script" || /\.js(\.gz)?(\?|$)/.test(r.name); });
    var beacons = res.filter(function (r) { return scripts.indexOf(r) < 0; });
    var scriptBytes = 0, scriptBytesKnown = true;
    scripts.forEach(function (r) {
      var b = r.transferSize || knownSize(r.name);
      if (b == null) scriptBytesKnown = false; else scriptBytes += b;
    });
    var tbt = state.longTasks.reduce(function (s, t) { return s + Math.max(0, t.duration - 50); }, 0);
    var nav = performance.getEntriesByType("navigation")[0];
    return {
      variant: document.body.getAttribute("data-variant") || "unknown",
      scripts: scripts, beacons: beacons, scriptBytes: scriptBytes, scriptBytesKnown: scriptBytesKnown,
      longTasks: state.longTasks.length, longTaskMs: state.longTasks.reduce(function (s, t) { return s + t.duration; }, 0), tbt: tbt,
      fcp: state.fcp, lcp: state.lcp, cls: state.cls, inp: state.inp,
      domContentLoaded: nav ? nav.domContentLoadedEventEnd : null, load: nav ? nav.loadEventEnd : null,
      sdkReady: window.__ampPerf.sdkReady || null,
      fields: window.KYBForm ? window.KYBForm.fieldCount() : null
    };
  }

  function render(panel) {
    var d = collect();
    var rows = d.scripts.map(function (r) {
      var b = r.transferSize || knownSize(r.name);
      return "<tr><td class=\"mono\" title=\"" + r.name + "\">" + r.name.replace(/^https?:\/\//, "").slice(0, 60) + "</td>" +
        "<td class=\"num\">" + (b ? fmtKb(b) + (r.transferSize ? "" : "*") : "–") + "</td><td class=\"num\">" + fmtMs(r.duration) + "</td></tr>";
    }).join("");
    panel.innerHTML =
      '<h3>What this page measured <small>live, this load</small></h3>' +
      '<dl class="kv">' +
      "<dt>Variant</dt><dd><strong>" + d.variant + "</strong></dd>" +
      "<dt>Form fields in DOM</dt><dd>" + (d.fields || "–") + "</dd>" +
      "<dt>Third-party scripts</dt><dd>" + d.scripts.length + " (" + (d.scriptBytesKnown ? fmtKb(d.scriptBytes) : "size unknown") + " on the wire)</dd>" +
      "<dt>Beacons / config calls so far</dt><dd>" + d.beacons.length + "</dd>" +
      "<dt>SDK ready</dt><dd>" + fmtMs(d.sdkReady) + "</dd>" +
      "<dt>DOMContentLoaded</dt><dd>" + fmtMs(d.domContentLoaded) + "</dd>" +
      "<dt>Load</dt><dd>" + fmtMs(d.load) + "</dd>" +
      "<dt>FCP / LCP</dt><dd>" + fmtMs(d.fcp) + " / " + fmtMs(d.lcp) + "</dd>" +
      "<dt>Long tasks</dt><dd>" + d.longTasks + " (" + fmtMs(d.longTaskMs) + " total, TBT " + fmtMs(d.tbt) + ")</dd>" +
      "<dt>CLS / INP</dt><dd>" + d.cls.toFixed(3) + " / " + fmtMs(d.inp) + "</dd>" +
      "</dl>" +
      (rows ? '<table><thead><tr><th>Script</th><th class="num">Bytes</th><th class="num">Fetch</th></tr></thead><tbody>' + rows + "</tbody></table>" : "<p class=\"muted small\">No third-party scripts.</p>") +
      // Kept short and collapsed on purpose: a long paragraph rendered after load
      // became the page's Largest Contentful Paint on the baseline variant.
      '<details class="small muted"><summary>About these numbers</summary>* cdn.amplitude.com sends no Timing-Allow-Origin header, so the browser hides transfer sizes; starred values come from a curl measurement of the same URL. WebPageTest is authoritative for bytes and filmstrips.</details>' +
      '<p><button class="secondary" id="perf-copy">Copy as JSON</button> <button class="secondary" id="perf-refresh">Refresh</button></p>';
    panel.querySelector("#perf-copy").onclick = function () {
      var out = Object.assign({}, d, { scripts: d.scripts.map(function (r) { return { url: r.name, bytes: r.transferSize || knownSize(r.name), ms: Math.round(r.duration) }; }), beacons: d.beacons.length, url: location.href, ua: navigator.userAgent, at: new Date().toISOString() });
      navigator.clipboard && navigator.clipboard.writeText(JSON.stringify(out, null, 2));
      this.textContent = "Copied";
    };
    panel.querySelector("#perf-refresh").onclick = function () { render(panel); };
  }

  window.addEventListener("load", function () {
    var panel = document.getElementById("perf-panel");
    if (!panel) return;
    // Render at load, not after a delay, so the panel is on screen with the
    // rest of the page rather than appearing later as a fresh paint. Refresh
    // once more after beacons and remote config have had time to go out.
    render(panel);
    setTimeout(function () { render(panel); }, 6000);
  });
})();
