// A fictional KYB (know-your-business) onboarding form.
// Six steps, about 70 fields, rendered from a schema so every variant page
// shows exactly the same DOM. Nothing is submitted anywhere.
//
// It also emits a small, deliberately safe set of custom analytics events
// through window.amplitude when an SDK is present. Field VALUES are never
// included in any event. See /instrumentation/ for the reasoning.
(function () {
  var T = { text: "text", email: "email", tel: "tel", number: "number", date: "date", select: "select",
            radio: "radio", check: "checkbox", textarea: "textarea", password: "password", file: "file", url: "url" };

  var AU_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];
  var COUNTRIES = ["Australia", "New Zealand", "Singapore", "United Kingdom", "United States", "Other"];
  var ENTITY_TYPES = ["Private company (Pty Ltd)", "Public company (Ltd)", "Sole trader", "Partnership", "Trust", "Incorporated association", "Government body"];
  var INDUSTRIES = ["Financial services", "Professional services", "Construction", "Retail", "Hospitality", "Healthcare", "Technology", "Transport and logistics", "Agriculture", "Other"];
  var ID_TYPES = ["Australian driver licence", "Australian passport", "Foreign passport", "Medicare card", "Proof of age card"];

  var STEPS = [
    {
      id: "entity", title: "1. Business entity", help: "Tell us about the entity applying for an account.",
      fields: [
        { id: "legal_name", label: "Registered legal name", type: T.text, required: true, autocomplete: "organization", wide: true },
        { id: "trading_name", label: "Trading name (if different)", type: T.text },
        { id: "entity_type", label: "Entity type", type: T.select, options: ENTITY_TYPES, required: true },
        { id: "abn", label: "ABN", type: T.text, required: true, pattern: "^\\d{2} ?\\d{3} ?\\d{3} ?\\d{3}$", help: "11 digits", inputmode: "numeric" },
        { id: "acn", label: "ACN (companies only)", type: T.text, pattern: "^\\d{3} ?\\d{3} ?\\d{3}$", inputmode: "numeric" },
        { id: "incorporation_date", label: "Date of incorporation", type: T.date, required: true },
        { id: "incorporation_country", label: "Country of incorporation", type: T.select, options: COUNTRIES, required: true },
        { id: "industry", label: "Industry", type: T.select, options: INDUSTRIES, required: true },
        { id: "anzsic", label: "ANZSIC code", type: T.text, help: "4 digits if known" },
        { id: "website", label: "Website", type: T.url, autocomplete: "url" },
        { id: "employees", label: "Number of employees", type: T.select, options: ["1 to 4", "5 to 19", "20 to 199", "200 or more"] },
        { id: "annual_turnover", label: "Expected annual turnover (AUD)", type: T.select, options: ["Under 250k", "250k to 2m", "2m to 10m", "10m to 50m", "Over 50m"], required: true },
        { id: "business_description", label: "Describe what the business does", type: T.textarea, required: true, wide: true, minlength: 20 }
      ]
    },
    {
      id: "addresses", title: "2. Addresses and contact", help: "Registered office and principal place of business.",
      fields: [
        { id: "reg_street", label: "Registered address: street", type: T.text, required: true, autocomplete: "address-line1", wide: true },
        { id: "reg_suburb", label: "Suburb", type: T.text, required: true, autocomplete: "address-level2" },
        { id: "reg_state", label: "State", type: T.select, options: AU_STATES, required: true },
        { id: "reg_postcode", label: "Postcode", type: T.text, required: true, pattern: "^\\d{4}$", autocomplete: "postal-code", inputmode: "numeric" },
        { id: "same_address", label: "Principal place of business is the same as the registered address", type: T.check, wide: true },
        { id: "biz_street", label: "Principal place of business: street", type: T.text, autocomplete: "address-line1", wide: true },
        { id: "biz_suburb", label: "Suburb", type: T.text, autocomplete: "address-level2" },
        { id: "biz_state", label: "State", type: T.select, options: AU_STATES },
        { id: "biz_postcode", label: "Postcode", type: T.text, pattern: "^\\d{4}$", inputmode: "numeric" },
        { id: "contact_name", label: "Primary contact name", type: T.text, required: true, autocomplete: "name" },
        { id: "contact_role", label: "Role", type: T.text, autocomplete: "organization-title" },
        { id: "contact_email", label: "Contact email", type: T.email, required: true, autocomplete: "email" },
        { id: "contact_phone", label: "Contact phone", type: T.tel, required: true, autocomplete: "tel" },
        { id: "preferred_contact", label: "Preferred contact method", type: T.radio, options: ["Email", "Phone", "SMS"], required: true, wide: true }
      ]
    },
    {
      id: "directors", title: "3. Directors and officers", help: "Add every director. We verify each person's identity.",
      repeat: { label: "Director", count: 2 },
      fields: [
        { id: "dir_given", label: "Given names", type: T.text, required: true, autocomplete: "given-name" },
        { id: "dir_family", label: "Family name", type: T.text, required: true, autocomplete: "family-name" },
        { id: "dir_dob", label: "Date of birth", type: T.date, required: true, autocomplete: "bday" },
        { id: "dir_email", label: "Email", type: T.email, autocomplete: "email" },
        { id: "dir_phone", label: "Mobile", type: T.tel, autocomplete: "tel" },
        { id: "dir_address", label: "Residential address", type: T.text, required: true, autocomplete: "street-address", wide: true },
        { id: "dir_id_type", label: "Identity document", type: T.select, options: ID_TYPES, required: true },
        { id: "dir_id_number", label: "Document number", type: T.text, required: true, sensitive: true },
        { id: "dir_id_expiry", label: "Document expiry", type: T.date },
        { id: "dir_pep", label: "Is this person a politically exposed person?", type: T.radio, options: ["No", "Yes"], required: true, wide: true }
      ]
    },
    {
      id: "owners", title: "4. Beneficial owners", help: "Anyone who owns or controls 25% or more.",
      repeat: { label: "Beneficial owner", count: 2 },
      fields: [
        { id: "ubo_given", label: "Given names", type: T.text, required: true, autocomplete: "given-name" },
        { id: "ubo_family", label: "Family name", type: T.text, required: true, autocomplete: "family-name" },
        { id: "ubo_dob", label: "Date of birth", type: T.date, required: true },
        { id: "ubo_percent", label: "Ownership %", type: T.number, required: true, min: 25, max: 100 },
        { id: "ubo_country", label: "Country of residence", type: T.select, options: COUNTRIES, required: true },
        { id: "ubo_tfn", label: "Tax file number (optional)", type: T.text, sensitive: true, inputmode: "numeric" },
        { id: "ubo_source_of_wealth", label: "Source of wealth", type: T.select, options: ["Business income", "Employment", "Investments", "Inheritance", "Other"], required: true },
        { id: "ubo_control", label: "How is control exercised?", type: T.textarea, wide: true }
      ]
    },
    {
      id: "banking", title: "5. Settlement account and documents", help: "Where should we settle funds, and upload your supporting documents.",
      fields: [
        { id: "account_name", label: "Account name", type: T.text, required: true },
        { id: "bsb", label: "BSB", type: T.text, required: true, pattern: "^\\d{3}-?\\d{3}$", inputmode: "numeric", sensitive: true },
        { id: "account_number", label: "Account number", type: T.text, required: true, pattern: "^\\d{6,10}$", inputmode: "numeric", sensitive: true },
        { id: "card_number", label: "Card for verification deposit", type: T.text, autocomplete: "cc-number", inputmode: "numeric", sensitive: true, help: "Used for a $1 verification" },
        { id: "card_expiry", label: "Card expiry", type: T.text, autocomplete: "cc-exp", placeholder: "MM/YY" },
        { id: "card_cvc", label: "CVC", type: T.password, autocomplete: "cc-csc", sensitive: true },
        { id: "monthly_volume", label: "Expected monthly volume (AUD)", type: T.number, required: true, min: 0 },
        { id: "avg_transaction", label: "Average transaction (AUD)", type: T.number, min: 0 },
        { id: "doc_incorporation", label: "Certificate of incorporation", type: T.file, required: true },
        { id: "doc_id", label: "Director identity documents", type: T.file },
        { id: "doc_bank", label: "Bank statement (last 3 months)", type: T.file },
        { id: "doc_notes", label: "Notes for our compliance team", type: T.textarea, wide: true }
      ]
    },
    {
      id: "review", title: "6. Declarations and review", help: "Confirm the information is accurate and submit.",
      fields: [
        { id: "decl_accurate", label: "I confirm the information provided is true and complete", type: T.check, required: true, wide: true },
        { id: "decl_authorised", label: "I am authorised to act on behalf of the entity", type: T.check, required: true, wide: true },
        { id: "decl_aml", label: "I agree to AML/CTF checks on all named individuals", type: T.check, required: true, wide: true },
        { id: "marketing_optin", label: "Send me product updates", type: T.check, wide: true },
        { id: "signature_name", label: "Type your full name as a signature", type: T.text, required: true, autocomplete: "name" },
        { id: "portal_password", label: "Choose a portal password", type: T.password, required: true, autocomplete: "new-password", minlength: 10 },
        { id: "portal_password_confirm", label: "Confirm password", type: T.password, required: true, autocomplete: "new-password" }
      ]
    }
  ];

  // ---------- safe analytics hooks ----------
  function amp() { return (window.amplitude && typeof window.amplitude.track === "function") ? window.amplitude : null; }
  var formMeta = { form_id: "kyb-onboarding", form_version: "2026.10", tenant_id: "demo-tenant", steps_total: STEPS.length };
  var stepStarted = {};
  function track(name, props) {
    var a = amp();
    if (!a) return;
    try { a.track(name, Object.assign({}, formMeta, props || {})); } catch (e) { /* ignore */ }
  }

  // ---------- rendering ----------
  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "text") e.textContent = attrs[k];
      else if (k === "html") e.innerHTML = attrs[k];
      else if (attrs[k] !== undefined && attrs[k] !== null && attrs[k] !== false) e.setAttribute(k, attrs[k] === true ? "" : attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }

  function renderField(f, suffix, stepIndex) {
    var id = f.id + (suffix || "");
    var wrap = el("div", { class: "field" + (f.wide ? " wide" : ""), "data-field": f.id, "data-step": stepIndex + 1 });
    var labelText = f.label;
    if (f.type === T.check) {
      var cb = el("input", { type: "checkbox", id: id, name: id, required: f.required });
      var l = el("label", { for: id }, [cb, document.createTextNode(" " + labelText)]);
      l.style.fontWeight = "400";
      wrap.appendChild(l);
      wrap.appendChild(el("div", { class: "err", "aria-live": "polite" }));
      return wrap;
    }
    var label = el("label", { for: id, html: labelText + (f.required ? ' <span class="req">*</span>' : "") });
    wrap.appendChild(label);
    var input;
    if (f.type === T.select) {
      input = el("select", { id: id, name: id, required: f.required });
      input.appendChild(el("option", { value: "", text: "Select…" }));
      f.options.forEach(function (o) { input.appendChild(el("option", { value: o, text: o })); });
    } else if (f.type === T.radio) {
      input = el("div", { class: "choices", role: "radiogroup", "aria-labelledby": id });
      label.removeAttribute("for"); label.id = id;
      f.options.forEach(function (o, i) {
        var r = el("input", { type: "radio", name: id, value: o, id: id + "_" + i, required: f.required && i === 0 });
        input.appendChild(el("label", { for: id + "_" + i }, [r, document.createTextNode(o)]));
      });
    } else if (f.type === T.textarea) {
      input = el("textarea", { id: id, name: id, required: f.required, minlength: f.minlength });
    } else {
      input = el("input", {
        type: f.type, id: id, name: id, required: f.required, autocomplete: f.autocomplete,
        pattern: f.pattern, inputmode: f.inputmode, placeholder: f.placeholder, min: f.min, max: f.max, minlength: f.minlength
      });
    }
    if (f.sensitive) input.setAttribute("data-sensitive", "true");
    wrap.appendChild(input);
    if (f.help) wrap.appendChild(el("div", { class: "help", text: f.help }));
    wrap.appendChild(el("div", { class: "err", "aria-live": "polite" }));
    return wrap;
  }

  function renderStep(step, index, flat) {
    var fs = el("fieldset", { "data-step-id": step.id, "data-step-index": index + 1 });
    if (!flat && index !== 0) fs.hidden = true;
    fs.appendChild(el("legend", { text: step.title }));
    fs.appendChild(el("p", { class: "step-help", text: step.help }));
    if (step.repeat) {
      for (var r = 1; r <= step.repeat.count; r++) {
        var box = el("div", { class: "repeat" });
        box.appendChild(el("h4", { text: step.repeat.label + " " + r }));
        var grid = el("div", { class: "fields" });
        step.fields.forEach(function (f) { grid.appendChild(renderField(f, "_" + r, index)); });
        box.appendChild(grid);
        fs.appendChild(box);
      }
    } else {
      var g = el("div", { class: "fields" });
      step.fields.forEach(function (f) { g.appendChild(renderField(f, "", index)); });
      fs.appendChild(g);
    }
    return fs;
  }

  function validateStep(fs, stepIndex) {
    var ok = true, firstBad = null, errors = 0;
    fs.querySelectorAll(".field").forEach(function (w) {
      var input = w.querySelector("input, select, textarea");
      if (!input) return;
      var err = w.querySelector(".err");
      var valid = true, msg = "";
      if (input.type === "radio") {
        var group = w.querySelectorAll("input[type=radio]");
        var req = Array.prototype.some.call(group, function (r) { return r.required; });
        var checked = Array.prototype.some.call(group, function (r) { return r.checked; });
        valid = !req || checked; if (!valid) msg = "Choose one";
      } else if (!input.checkValidity()) {
        valid = false;
        msg = input.validity.valueMissing ? "Required" : input.validity.patternMismatch ? "Check the format" :
              input.validity.tooShort ? "Too short" : input.validity.typeMismatch ? "Not a valid " + input.type : "Invalid";
      }
      w.classList.toggle("invalid", !valid);
      err.textContent = msg;
      if (!valid) {
        ok = false; errors++;
        if (!firstBad) firstBad = input;
        track("Field Validation Failed", {
          step_index: stepIndex + 1, step_id: fs.getAttribute("data-step-id"),
          field_id: w.getAttribute("data-field"), field_type: input.type || input.tagName.toLowerCase(),
          error_type: msg.toLowerCase()
        });
      }
    });
    if (firstBad) firstBad.focus();
    return { ok: ok, errors: errors };
  }

  function mount(container, opts) {
    opts = opts || {};
    var flat = opts.mode === "flat";
    var form = el("form", { id: "kyb-onboarding", name: "kyb-onboarding", action: "/kyb/submit", method: "post", novalidate: true, class: "kyb" });
    var progress = el("div", { class: "progress" });
    STEPS.forEach(function () { progress.appendChild(el("span")); });
    if (!flat) form.appendChild(progress);
    STEPS.forEach(function (s, i) { form.appendChild(renderStep(s, i, flat)); });

    var actions = el("div", { class: "actions" });
    var back = el("button", { type: "button", class: "secondary", text: "Back" });
    var next = el("button", { type: "button", text: flat ? "Submit application" : "Continue" });
    actions.appendChild(back); actions.appendChild(next);
    form.appendChild(actions);
    container.appendChild(form);

    var current = 0;
    var fieldsets = form.querySelectorAll("fieldset");
    function show(i) {
      current = i;
      fieldsets.forEach(function (fs, j) { fs.hidden = !flat && j !== i; });
      progress.querySelectorAll("span").forEach(function (sp, j) { sp.classList.toggle("done", j <= i); });
      back.disabled = i === 0;
      next.textContent = i === STEPS.length - 1 ? "Submit application" : "Continue";
      if (!stepStarted[i]) {
        stepStarted[i] = Date.now();
        track("Form Step Viewed", { step_index: i + 1, step_id: STEPS[i].id, fields_in_step: fieldsets[i].querySelectorAll(".field").length });
      }
      if (i !== 0 || Object.keys(stepStarted).length > 1) form.scrollIntoView({ block: "start", behavior: "smooth" });
    }
    back.addEventListener("click", function () { if (current > 0) show(current - 1); });
    next.addEventListener("click", function () {
      var fs = fieldsets[current];
      var res = validateStep(fs, current);
      if (!res.ok) return;
      track("Form Step Completed", { step_index: current + 1, step_id: STEPS[current].id, seconds_on_step: Math.round((Date.now() - stepStarted[current]) / 1000) });
      if (current < STEPS.length - 1 && !flat) { show(current + 1); return; }
      // Submit: nothing leaves the page. Autocapture sees a real submit event.
      form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      track("Form Submitted", { seconds_total: Math.round((Date.now() - stepStarted[0]) / 1000) });
      form.innerHTML = '<div class="done-panel"><h3>Application received</h3><p>This is a demo. Nothing was sent anywhere; the submit was intercepted in the page.</p><p><a href="" class="button secondary">Start again</a></p></div>';
    });
    show(0);
    if (!flat) track("Form Started", {});
    return form;
  }

  function fieldCount() {
    return STEPS.reduce(function (n, s) { return n + s.fields.length * (s.repeat ? s.repeat.count : 1); }, 0);
  }

  window.KYBForm = { STEPS: STEPS, mount: mount, fieldCount: fieldCount };
})();
