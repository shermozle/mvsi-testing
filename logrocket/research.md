# LogRocket desk research (source notes)

Collected 2026-10-20 from LogRocket's public docs, website, live CDN bundles and named third parties.
Where a documented answer could not be found, the note says so. Several LogRocket docs pages are stale
or mislabelled (see section 2), so treat the docs as weaker than the marketing on specifics.
The public comparison page at `/logrocket/` is built from these notes.

## 1. SDK delivery and performance

- Install: npm package `logrocket`, then `LogRocket.init(YOUR_APP_ID)`. CDN snippet is `<script src="https://cdn.logr-in.com/LogRocket.min.js" crossorigin="anonymous"></script>` followed by `window.LogRocket && window.LogRocket.init(YOUR_APP_ID)`. The snippet has no `async` or `defer` attribute, and `init()` "must be called client-side" (https://docs.logrocket.com/docs/quickstart). Troubleshooting docs add that `init()` "must run before other application code is loaded" (https://docs.logrocket.com/docs/troubleshooting-sessions).
- Published size (npm 12.4.0, zero dependencies): 58,690 bytes minified, 16,498 bytes gzipped (https://bundlephobia.com/api/size?package=logrocket). Unpacked tarball 361,775 bytes, UMD `main` only (https://registry.npmjs.org/logrocket/latest).
- Measured CDN shim: `LogRocket.min.js` is 48,853 bytes raw, 14,630 bytes gzip, 13,064 bytes brotli; embeds version 12.4.0 (https://cdn.logr-in.com/LogRocket.min.js, curl).
- Two-stage load: docs say only "a small portion of the recording script is ever loaded synchronously: LogRocket.min.js, a compressed, 8 KB script" which "acts as a shim responsible for instrumenting critical browser APIs and asynchronously loading parts of the recording script" (https://docs.logrocket.com/docs/performance). The shim appends `<script async src=".../logger-1.min.js">` to `document.head`.
- Measured second stage: `logger-1.min.js` is 765,564 bytes raw and 171,463 bytes gzipped (https://cdn.logr-in.com/logger-1.min.js, curl). Neither the docs nor bundlephobia mention this payload.
- Runtime claims: "we offload most processing to a worker thread", main thread "never blocked for more than 5 milliseconds", protocol buffers encoded on the worker, static assets fetched server-side, circuit breakers pause Redux or console capture when expensive (https://docs.logrocket.com/docs/performance). FAQ: "1-10kb of additional data per minute" and "negligible impact on website performance" (https://docs.logrocket.com/docs/q-a).
- Mechanisms in source: `MutationObserver` in both bundles, `new Worker` three times in the chunk. Network capture wraps XHR and fetch (https://docs.logrocket.com/reference/network); console capture covers log/info/debug/warn/error by default (https://docs.logrocket.com/reference/console); Redux state only with LogRocket's middleware (https://docs.logrocket.com/reference/redux-logging).
- Measuring impact: the performance page gives no benchmarking method, only console notifications when circuit breakers trip.
- Recent changelog: 12.4.0 async request/response sanitizers; 12.3.0 shared instance when loaded twice; 12.2.0 `dom.redactSelectors`/`dom.hideSelectors`; 12.1.0 `dom.imageSanitizer`; 12.0.0 dropped IE11 (https://unpkg.com/logrocket@12.4.0/CHANGELOG.md).

## 2. Data collection

- Default capture: all DOM except `type="password"` inputs ("The LogRocket SDK will not record input elements where type="password"; all other elements are captured by default", https://docs.logrocket.com/reference/dom); third-party iframes never captured; XHR and fetch requests; five console methods; uncaught exceptions; IP address (`shouldCaptureIP` default `true`, https://docs.logrocket.com/reference/shouldcaptureip). Page titles captured unless disabled (https://docs.logrocket.com/reference/disable-page-titles).
- Network bodies: the sanitizer docs operate on `request.body`, `response.body` and headers, and recommend "using the requestSanitizer and responseSanitizer to remove all headers and bodies, instead of isEnabled: false" (https://docs.logrocket.com/reference/network). Blob responses stored as `[object Blob]` unless `shouldParseXHRBlob: true`. The shim drops bodies over 104,857,600 characters. WebSockets not recorded by default.
- Doc defect: the web SDK's network page opens "By default, the LogRocket React Native SDK captures all network requests..." (https://docs.logrocket.com/reference/network.md).
- Endpoints: recommended CSP allows scripts from 12 `cdn.*` hosts and connections to 13 wildcard domain families: logrocket.io, logrocket.com, lr-ingest.io, lr-in.com, lr-in-prod.com, lr-ingest.com, ingest-lr.com, lr-intake.com, intake-lr.com, logr-ingest.com, lrkt-in.com, lgrckt-in.com, logr-in.com (https://docs.logrocket.com/docs/troubleshooting-sessions). A CSP breakage from a newly added domain: https://github.com/PrefectHQ/prefect/issues/9436.
- Transport: queued in memory and sent "incrementally and asynchronously" as protobufs; "Exact bandwidth usage varies depending on the application being recorded". TLS enforced; hosted on Google Cloud; "For SaaS customers, data is hosted in the United States" (https://docs.logrocket.com/docs/security, https://docs.logrocket.com/docs/q-a).
- Session boundaries: ends after 30 minutes of inactivity or 2 minutes after leaving the app; multi-tab sessions merged (https://docs.logrocket.com/docs/what-defines-a-session).

## 3. Privacy and masking

All SDK-code or HTML-attribute mechanisms (https://docs.logrocket.com/reference/dom unless noted):

- `data-private`: records element dimensions only, children included. Values: default `redact`; `lipsum` (inputs/textarea only, keeps character count); `delete` (element removed). Once excluded "it can't be re-included on that page" (https://docs.logrocket.com/docs/privacy).
- `data-public`: allowlists a node against the global sanitizers; does not override `data-private`.
- `dom.inputSanitizer` (default `false`, accepts `true` or `"lipsum"`): obfuscates inputs/selects plus `mailto` hrefs, `alt`, `title`, `aria-label`, `aria-description`.
- `dom.textSanitizer` (default `false`): obfuscates all text nodes and the same attributes. `dom.imageSanitizer` (default `false`).
- `dom.redactSelectors` and `dom.hideSelectors` (12.2.0+), `dom.hiddenAttributes`, `dom.isEnabled` (`false` gives blank replay but still records network/console).
- `dom.privateAttributeBlocklist` and `dom.privateClassNameBlocklist` deprecated in favour of `redactSelectors`; `_lr-hide` class is legacy.
- Network: `network.requestSanitizer` / `responseSanitizer`, `network.isEnabled`; async sanitizers since 12.4.0. `browser.urlSanitizer` rewrites URLs (https://docs.logrocket.com/reference/browser). Redux `stateSanitizer`/`actionSanitizer`. `console.isEnabled` per method. `shouldCaptureIP: false` stops IP storage.
- Conditional recording is configured in the dashboard with rules on clicks, URLs (with sampling %), duration, network, visible elements, logs, custom events, platform; keeps "up to 10MB of activity prior to the recording condition being met"; "a separate add on for Pro and Enterprise customers" (https://docs.logrocket.com/docs/conditional-recording).
- Where masking happens: client-side. "None of that data will be recorded or sent to LogRocket" (https://docs.logrocket.com/reference/dom); PII "is removed using standard client-side expressions before it is sent across the network" (https://docs.logrocket.com/docs/security).
- Central (dashboard) control: Admin-only Recording Settings offers pause recording, monthly and daily session limits per project, geographic allow/block, IP/CIDR block, app-version block and user-agent block (https://docs.logrocket.com/docs/recording-settings). No documented dashboard-side DOM or network masking policy, no server-side redaction for replay data, and no mechanism by which the dashboard overrides what page code sends. The only server-side PII screening documented is for the separate Feedback product (https://docs.logrocket.com/docs/feedback). The marketing "PII audit" is a session filter to find sessions where inputs were redacted but network requests were not (https://logrocket.com/products/safety-security-performance).

## 4. Retroactivity, retention, deletion

- Retroactive masking: not documented. Because redaction runs in the browser, sessions recorded before a rule change already hold the unredacted DOM; the documented remedy is deletion (https://docs.logrocket.com/docs/privacy, https://docs.logrocket.com/docs/gdpr).
- Retention: official docs do not publish day counts. The Plans page shows per-org "Session Retention" and "Analytics Retention" values (https://docs.logrocket.com/docs/your-plans-page); pricing page says "Final price depends on seats, retention length, and add-ons" (https://logrocket.com/pricing). Third parties report 30 days standard with 60/90/180-day paid extensions (https://www.vendr.com/marketplace/logrocket; https://rumcost.com/logrocket-pricing). Extended Session Retention keeps watched sessions 12 months, capped at 5% of monthly quota, Pro and Enterprise only (https://docs.logrocket.com/docs/extended-session-retention).
- Deletion tooling: GDPR/CCPA portal and API, `POST /v1/orgs/<org>/apps/<app>/gdpr/exclusion/` by email or user ID, which deletes and adds a do-not-record flag (https://docs.logrocket.com/docs/gdpr). Bulk delete by filter and date range, Admin only, up to 100,000 sessions per request, "cannot be undone", audit-logged, and "Deleted sessions still count toward session usage" (https://docs.logrocket.com/docs/deleting-sessions). Full account erasure by emailing support, "within 24 hours"; LogRocket does "not currently make point-in-time backups" (https://docs.logrocket.com/docs/security).

## 5. Multi-tenant and organisational controls

- Hierarchy: organisation → projects; App ID is `<org_id>/<project_id>` (https://docs.logrocket.com/docs/mcp). Session quota "is shared by all projects within a LogRocket organization"; per-project monthly caps are Pro/Enterprise and Admin-only (https://docs.logrocket.com/docs/impose-session-limit).
- Org-level settings documented are limited to name, slug and "App Access Requests" (https://docs.logrocket.com/docs/organization-settings). No documented way to push SDK configuration or masking rules across projects from the org level; recording settings are per project.
- RBAC: Admin, Developer (default), Guest; custom roles can "restrict access on a per-project basis", but "the selected set of permissions will apply across all projects the role has access to" and a user "cannot be a Guest on one project and a Developer on another". Admin is the only role for audit logging, GDPR deletion and session deletion (https://docs.logrocket.com/docs/role-based-access). Custom roles and audit logging are tier-gated (https://docs.logrocket.com/docs/user-management, https://logrocket.com/pricing).
- SSO: Google domain SSO self-serve; SAML/Azure AD/Okta "reach out to support@logrocket.com" (https://docs.logrocket.com/docs/single-sign-on). A third party reports no SCIM on any plan (https://www.stitchflow.com/scim/logrocket).

## 6. Form analytics and instrumentation

- Autocaptured, searchable activity: Clicked/Touched, Text Input ("values that a user inputs to text fields"), Visited URL, Browser Navigated, Page Refreshed, Rage Clicked, Dead Clicked (web only), Element Visible/Not Visible, Network Request (incl. body text), Network Error, Log Message, Custom Event, User Trait, Event Count, Web Vitals filters (https://docs.logrocket.com/docs/logrocket-filters).
- Non-retroactive filters: Time Between Events, Log/Error Message and Element Not Visible "must be saved before sessions will meet the search criteria"; Error States are "non-retroactive" (https://docs.logrocket.com/docs/signals).
- Frustration signals: rage click, dead click (only if "the clicked element looks interactive"), "frustrating network request". No numeric thresholds published. No "error click" signal. All except Exceptions are paid-plan only (https://docs.logrocket.com/docs/signals, https://docs.logrocket.com/docs/issues).
- Forms: no form-level analytics (field drop-off, time-in-field, abandonment reports) found in docs or product pages. Autocapture page claims capture of "every event, page, and action without the need for additional instrumentation" and that "LogRocket retroactively captures Definition data" (https://logrocket.com/products/autocapture).
- `LogRocket.track(name, props)`: scalar or array props, names under 100 chars, "A maximum of 2000 properties may be uploaded per session" (https://docs.logrocket.com/reference/track).
- `LogRocket.identify(uid, traits)`: `name`/`email` reserved, other traits filterable but not range-queryable, up to 10 calls per page, traits apply across all of the user's sessions (https://docs.logrocket.com/reference/identify).
- Product analytics: Timeseries, Tables, Conversion Funnels, Path Analysis, Heatmaps (https://docs.logrocket.com/docs/logrocket-metrics). Funnel steps: Custom Event, Clicks, Redux Action Type, Visited URL, Definitions, Element Visible; group-by limited and "cannot be used with" period comparison (https://docs.logrocket.com/docs/funnels-1).
- Galileo AI: Highlights summarise up to 10 sessions per user; Funnel Insights; Issues need "a minimum of 3" occurrences; auto-dispatch of Cursor Cloud Agents (https://docs.logrocket.com/docs/galileo). Highlights "sees exactly what you would see, so any elements or fields you've redacted will not be considered" (https://docs.logrocket.com/docs/galileo-highlights).

## 7. Pricing and packaging

- Official page (https://logrocket.com/pricing): tiers Core, Pro, Enterprise; "Starting at $176/ month based on annual plan savings"; volume slider 1K to 4M+ sessions; 14-day trial. Conditional Recording is a separate add-on at "≈$860/month, billed annually". Core: unlimited logs + network, funnels, path analysis, heatmaps, SSO, surveys, MCP/API access. Pro adds AI session summaries, AI funnel insights, Ask Galileo, "RBAC & audit logging". Enterprise adds unlimited seats, Streaming Data Export, self-hosted option. "Final price depends on seats, retention length, and add-ons".
- Metering: sessions per month, pooled across projects; deleted sessions still count.
- Third-party context: RUMCost (verified 2026-09-17) reports Core $176/month for 25,000 sessions, 30-day retention (https://rumcost.com/logrocket-pricing). Vendr reports 10K to 50K session contracts at roughly $500 to $2,000/month and 100K+ at $3,000 to $8,000/month (https://www.vendr.com/marketplace/logrocket).

## 8. Position in market

- Founded 2016 by Matthew Arbesfeld and Ben Edelstein, ex-Google; Boston, MA (https://www.crunchbase.com/organization/logrocket/company_financials).
- Funding: $4M seed (2017), $11M Series A (2019), $15M Series B (2019), $25M Series C (2022); roughly $55M total.
- Customers: "Trusted by 3,000+ customers"; named Cox Automotive, 7-Eleven, thredUP, Blue Cross Blue Shield, Tecovas (https://logrocket.com/).
- Positioning: "frontend monitoring and product analytics platform"; heritage is bug reproduction (network, console, Redux, errors), with analytics, surveys and Galileo AI layered on since 2024 (https://blog.logrocket.com/product-management/galileo-ai-fall-24/). SOC 2 Type II; HIPAA/FINRA "compliant" is a marketing claim (https://docs.logrocket.com/docs/security).
