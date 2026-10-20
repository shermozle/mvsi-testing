// Captures every request the page makes to Amplitude so the audience can see
// exactly what left the browser, without opening DevTools. Must load before
// any SDK script. Nothing here changes what is sent: it only observes.
(function () {
  var MATCH = /amplitude\.com|lab\.amplitude|api-sr|sr-client-cfg|\/sr-config\//i;
  var log = [];
  var listeners = [];
  function notify() { listeners.forEach(function (l) { try { l(log); } catch (e) {} }); }

  function toText(body) {
    // Returns a Promise<string|null>. Handles strings, Blobs, ArrayBuffers and gzip.
    if (body == null) return Promise.resolve(null);
    if (typeof body === "string") return Promise.resolve(body);
    if (body instanceof URLSearchParams) return Promise.resolve(body.toString());
    var blob = body instanceof Blob ? body : (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) ? new Blob([body]) : null;
    if (!blob) { try { return Promise.resolve(JSON.stringify(body)); } catch (e) { return Promise.resolve(String(body)); } }
    return blob.slice(0, 2).arrayBuffer().then(function (head) {
      var u = new Uint8Array(head);
      var gz = u[0] === 0x1f && u[1] === 0x8b;
      if (gz && window.DecompressionStream) {
        return new Response(blob.stream().pipeThrough(new DecompressionStream("gzip"))).text();
      }
      return blob.text();
    });
  }

  function record(url, method, body, via) {
    var entry = { t: Date.now(), url: String(url), method: method || "GET", via: via, size: null, text: null, json: null };
    log.push(entry); notify();
    toText(body).then(function (txt) {
      entry.size = txt ? new Blob([txt]).size : 0;
      entry.text = txt;
      if (txt && /^[\[{]/.test(txt.trim())) { try { entry.json = JSON.parse(txt); } catch (e) {} }
      notify();
    });
  }

  // fetch
  var _fetch = window.fetch;
  if (_fetch) window.fetch = function (input, init) {
    try {
      var url = typeof input === "string" ? input : (input && input.url) || "";
      if (MATCH.test(url)) record(url, (init && init.method) || (input && input.method) || "GET", init && init.body, "fetch");
    } catch (e) {}
    return _fetch.apply(this, arguments);
  };
  // XHR
  var _open = XMLHttpRequest.prototype.open, _send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m, u) { this.__wi = { m: m, u: u }; return _open.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function (body) {
    try { if (this.__wi && MATCH.test(this.__wi.u)) record(this.__wi.u, this.__wi.m, body, "xhr"); } catch (e) {}
    return _send.apply(this, arguments);
  };
  // sendBeacon
  var _beacon = navigator.sendBeacon;
  if (_beacon) navigator.sendBeacon = function (u, body) {
    try { if (MATCH.test(u)) record(u, "POST", body, "beacon"); } catch (e) {}
    return _beacon.apply(this, arguments);
  };

  // Session Replay 1.36 uploads from a dedicated Web Worker, so the page never
  // sees the fetch. The events still pass through postMessage on their way to
  // the worker, which is where we observe them. Observation only.
  if (window.Worker && Worker.prototype.postMessage) {
    var _post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (msg) {
      try {
        var payload = msg && (msg.events || (msg.payload && msg.payload.events) || (msg.data && msg.data.events));
        var url = msg && (msg.url || msg.serverUrl || msg.trackServerUrl || (msg.payload && msg.payload.url) || "");
        if (payload || /api-sr|sessions\/v2\/track/.test(String(url))) {
          var body = payload ? JSON.stringify({ events: payload, _via: "worker postMessage", _keys: Object.keys(msg) }) : JSON.stringify(msg);
          record(url || "https://api-sr.amplitude.com/sessions/v2/track (via worker)", "POST", body, "worker");
        } else if (msg && typeof msg === "object") {
          window.__wiUnknownWorkerMsgs = (window.__wiUnknownWorkerMsgs || []).concat([{ keys: Object.keys(msg), sample: JSON.stringify(msg).slice(0, 300) }]);
        }
      } catch (e) {}
      return _post.apply(this, arguments);
    };
  }

  // ---------- rrweb helpers: pull the human-readable content out of a replay payload ----------
  function walk(node, out) {
    if (!node) return;
    if (node.type === 3 && typeof node.textContent === "string" && node.textContent.trim()) out.text.push(node.textContent.trim());
    if (node.type === 2 && node.attributes) {
      if (typeof node.attributes.value === "string" && node.attributes.value !== "") out.inputs.push({ tag: node.tagName, name: node.attributes.name || node.attributes.id, value: node.attributes.value });
      ["placeholder", "title", "alt", "aria-label"].forEach(function (a) { if (node.attributes[a]) out.attrs.push(a + "=" + node.attributes[a]); });
    }
    (node.childNodes || []).forEach(function (c) { walk(c, out); });
  }
  function extractReplay(json) {
    var out = { text: [], inputs: [], attrs: [], events: 0, types: {} };
    var events = Array.isArray(json) ? json : (json && json.events) || [];
    events.forEach(function (ev) {
      if (typeof ev === "string") { try { ev = JSON.parse(ev); } catch (e) { return; } }
      out.events++;
      out.types[ev.type] = (out.types[ev.type] || 0) + 1;
      if (ev.type === 2 && ev.data && ev.data.node) walk(ev.data.node, out);
      if (ev.type === 3 && ev.data) {
        if (ev.data.source === 5 && typeof ev.data.text === "string") out.inputs.push({ tag: "input", name: "id " + ev.data.id, value: ev.data.text });
        if (ev.data.source === 0 && ev.data.adds) ev.data.adds.forEach(function (a) { walk(a.node, out); });
        if (ev.data.source === 0 && ev.data.texts) ev.data.texts.forEach(function (t) { if (t.value) out.text.push(t.value); });
      }
    });
    return out;
  }

  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
  function kind(url) {
    if (/sessions\/v2\/track|sessions\/track/.test(url)) return "Session Replay payload";
    if (/sr-client-cfg|sessions\/config|\/config\b/.test(url)) return "Remote config";
    if (/2\/httpapi|\/batch/.test(url)) return "Analytics events";
    if (/lab\.amplitude/.test(url)) return "Experiment";
    if (/gs\.amplitude|engagement/.test(url)) return "Guides & Surveys";
    if (/\/sr-config\//.test(url)) return "Remote config (pinned copy served by this site)";
    return "Other";
  }

  function render(panel) {
    var q = (panel.__q || "").trim();
    var html = '<h3>What left the browser <small>' + log.length + " request" + (log.length === 1 ? "" : "s") + "</small></h3>" +
      '<p class="small muted">Every request to an Amplitude endpoint, captured in-page. Type something into the form, then search for it here.</p>' +
      '<p><input id="wi-q" type="search" placeholder="Search payloads for a value you typed…" value="' + esc(q) + '" style="width:100%;padding:7px 9px;border:1px solid var(--line);border-radius:6px"></p>';
    if (q) {
      var hits = 0; log.forEach(function (e) { if (e.text && e.text.toLowerCase().indexOf(q.toLowerCase()) >= 0) hits++; });
      html += '<p class="small"><strong>' + hits + "</strong> request" + (hits === 1 ? "" : "s") + ' contain "' + esc(q) + '"' + (hits ? ' <span class="badge bad">sent in clear</span>' : ' <span class="badge ok">not found in any payload</span>') + "</p>";
    }
    html += '<ul class="req-list">';
    log.slice().reverse().forEach(function (e) {
      var k = kind(e.url);
      var hit = q && e.text && e.text.toLowerCase().indexOf(q.toLowerCase()) >= 0;
      var body = "";
      if (e.json && /Session Replay/.test(k)) {
        var x = extractReplay(e.json);
        body += '<div class="small"><strong>' + x.events + "</strong> rrweb events (" + Object.keys(x.types).map(function (t) { return "type " + t + ": " + x.types[t]; }).join(", ") + ")</div>";
        body += '<div class="small"><strong>Input values in payload</strong> (' + x.inputs.length + "):<br>" + (x.inputs.length ? x.inputs.slice(0, 40).map(function (i) { return '<code>' + esc(i.name || i.tag) + " = " + esc(i.value) + "</code>"; }).join("<br>") : "<em>none</em>") + "</div>";
        body += '<div class="small"><strong>Text nodes in payload</strong> (' + x.text.length + "):<br>" + esc(x.text.slice(0, 60).join(" · ")).replace(/\*{3,}/g, '<span class="badge ok">masked</span>') + (x.text.length > 60 ? " …" : "") + "</div>";
        if (x.attrs.length) body += '<div class="small"><strong>Attribute values</strong> (not covered by masking): ' + esc(x.attrs.slice(0, 20).join(" · ")) + "</div>";
      }
      var pretty = e.json ? JSON.stringify(e.json, null, 1) : (e.text || "");
      if (pretty.length > 20000) pretty = pretty.slice(0, 20000) + "\n… truncated";
      if (q && hit) pretty = esc(pretty).replace(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), function (m) { return '<span class="hit">' + m + "</span>"; }); else pretty = esc(pretty);
      html += "<li" + (hit ? ' class="hit-row"' : "") + "><details><summary>" + (hit ? "🔴 " : "") + "<strong>" + k + "</strong> · " + e.method + " · " + (e.size == null ? "…" : e.size + " B") + "<br>" + esc(e.url.replace(/^https?:\/\//, "")).slice(0, 110) + "</summary>" + body + "<pre>" + pretty + "</pre></details></li>";
    });
    html += "</ul>";
    panel.innerHTML = html;
    var inp = panel.querySelector("#wi-q");
    inp.oninput = function () { panel.__q = inp.value; render(panel); panel.querySelector("#wi-q").focus(); var v = panel.querySelector("#wi-q"); v.setSelectionRange(v.value.length, v.value.length); };
  }

  window.WireInspector = {
    log: log,
    onChange: function (fn) { listeners.push(fn); },
    extractReplay: extractReplay,
    mount: function (panel) { render(panel); listeners.push(function () { render(panel); }); }
  };
})();
