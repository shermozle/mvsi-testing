// Renders the site header and the previous/next footer so the pages read as one sequence.
(function () {
  var SEQUENCE = [
    { href: "/", label: "Start", title: "MVSI technical review" },
    { href: "/performance/", label: "1 · SDK performance", title: "SDK performance" },
    { href: "/masking/", label: "2 · Data collection & masking", title: "Data collection and masking" },
    { href: "/tenant-control/", label: "3 · Control across tenants", title: "Control across tenants" },
    { href: "/recording-privacy/", label: "4 · Recording-time privacy", title: "Recording-time privacy" },
    { href: "/instrumentation/", label: "5 · Form instrumentation", title: "Form instrumentation" },
    { href: "/logrocket/", label: "LogRocket comparison", title: "LogRocket comparison" }
  ];

  // Works at the domain root and under a /repo-name/ GitHub Pages prefix.
  var base = (function () {
    var m = document.querySelector('meta[name="site-base"]');
    if (m && m.content) return m.content.replace(/\/$/, "");
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      var s = scripts[i].getAttribute("src") || "";
      var idx = s.indexOf("assets/nav.js");
      if (idx >= 0) {
        var a = document.createElement("a");
        a.href = s.slice(0, idx);
        return a.pathname.replace(/\/$/, "");
      }
    }
    return "";
  })();

  function path() {
    var p = location.pathname;
    if (base && p.indexOf(base) === 0) p = p.slice(base.length);
    p = p.replace(/index\.html$/, "");
    // Variant pages sit under /performance/, count them as that section.
    var parts = p.split("/").filter(Boolean);
    return parts.length ? "/" + parts[0] + "/" : "/";
  }

  var current = path();
  var idx = SEQUENCE.findIndex(function (s) { return s.href === current; });

  var header = document.createElement("header");
  header.className = "site-header";
  var inner = document.createElement("div");
  inner.className = "wrap";
  var brand = document.createElement("a");
  brand.className = "brand";
  brand.href = base + "/";
  brand.innerHTML = 'MVSI × Amplitude <small>technical review test site</small>';
  inner.appendChild(brand);
  var ul = document.createElement("ul");
  ul.className = "steps";
  SEQUENCE.forEach(function (s, i) {
    var li = document.createElement("li");
    var a = document.createElement("a");
    a.href = base + s.href;
    a.textContent = s.label;
    if (i === idx) a.className = "current";
    li.appendChild(a);
    ul.appendChild(li);
  });
  inner.appendChild(ul);
  header.appendChild(inner);
  document.body.insertBefore(header, document.body.firstChild);

  var wrap = document.querySelector("main.wrap") || document.querySelector(".wrap:not(.site-header .wrap)");
  if (wrap && idx >= 0) {
    var nav = document.createElement("nav");
    nav.className = "page-nav";
    var prev = SEQUENCE[idx - 1], next = SEQUENCE[idx + 1];
    nav.innerHTML =
      (prev ? '<a href="' + base + prev.href + '">← ' + prev.title + "</a>" : "<span></span>") +
      (next ? '<a href="' + base + next.href + '">' + next.title + " →</a>" : "<span></span>");
    wrap.appendChild(nav);
  }
  window.MVSI_BASE = base;
})();
