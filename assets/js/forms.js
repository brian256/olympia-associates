/*
 * Olympia & Associates — shared popup forms (waitlist + referral)
 * ---------------------------------------------------------------------------
 * ONE file serves every page. A page only needs:
 *     <script src="/assets/js/forms.js" defer></script>
 * and any link or button carrying   data-oa-form="waitlist-hs" | "waitlist-lbc"
 * | "referral-hs"   opens the matching popup.
 *
 * Submitting posts to the Olympia hub Worker, which emails brian@ with the
 * details (reply-to = the visitor). If the Worker can't be reached, the popup
 * says so plainly and shows the address to write to — it never silently
 * opens a mail app.
 *
 * To change where submissions go, edit ENDPOINT below. Nothing else on the
 * site needs to change.
 */
(function () {
  "use strict";

  var ENDPOINT = "https://oa-internal-hub.brian-bc2.workers.dev/api/inbound";
  var CONTACT = "hello@olympia-associates.ca";
  var TIMEOUT_MS = 15000;

  var FORMS = {
    "waitlist-hs": {
      type: "waitlist", stream: "hs",
      title: "Join the waitlist",
      intro: "Career Consulting — High School. Leave your details and you'll hear back within 48 hours with your estimated wait time.",
      button: "Join the waitlist",
      done: "You're on the waitlist. Watch your inbox — you'll hear from us by email.",
      fields: [
        { key: "name", label: "Parent or guardian name", type: "text", required: true, autocomplete: "name" },
        { key: "email", label: "Email address", type: "email", required: true, autocomplete: "email" },
        { key: "grade", label: "Student's current grade", type: "select", options: [["", "Select…"], ["Grade 9", "Grade 9"], ["Grade 10", "Grade 10"], ["Grade 11", "Grade 11"], ["Grade 12", "Grade 12"], ["Not sure yet", "Not sure yet"]] },
        { key: "note", label: "Anything you'd like us to know? (optional)", type: "textarea" }
      ]
    },
    "waitlist-lbc": {
      type: "waitlist", stream: "lbc",
      title: "Join the waitlist",
      intro: "Leadership & Business Consulting. Leave your details and you'll hear back within 48 hours with your estimated wait time.",
      button: "Join the waitlist",
      done: "You're on the waitlist. Watch your inbox — you'll hear from us by email.",
      fields: [
        { key: "name", label: "Your name", type: "text", required: true, autocomplete: "name" },
        { key: "email", label: "Email address", type: "email", required: true, autocomplete: "email" },
        { key: "interest", label: "What would you like to talk about?", type: "select", options: [
          ["", "Select…"],
          ["career-review", "Career Review: résumé, LinkedIn and interviews"],
          ["positioning", "Application Positioning Session"],
          ["coaching", "Coaching"],
          ["facilitation", "A talk or facilitation"],
          ["business", "Strategy Session or Project Engagement"],
          ["unsure", "Not sure yet"]
        ] },
        { key: "note", label: "One sentence: what's your situation? (optional)", type: "textarea" }
      ]
    },
    "referral-hs": {
      type: "referral", stream: "hs",
      title: "Send a referral",
      intro: "Tell us who you'd like us to reach out to and how to reach them. When they book, we'll contact you directly with a thank-you.",
      button: "Send referral",
      done: "Thank you — your referral is with us. We'll be in touch with you directly.",
      fields: [
        { key: "name", label: "Your name", type: "text", required: true, autocomplete: "name" },
        { key: "email", label: "Your email address", type: "email", required: true, autocomplete: "email" },
        { key: "referred_name", label: "Family you're referring", type: "text", required: true },
        { key: "referred_contact", label: "How can we reach them? (email or phone)", type: "text", required: true },
        { key: "note", label: "Anything that would help us? (optional)", type: "textarea" },
        { key: "consent", label: "I've let them know I'm sharing their contact details, and they're happy to hear from Olympia & Associates.", type: "checkbox", required: true }
      ]
    }
  };

  var CSS = [
    ".oa-overlay{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(26,26,26,.62);overflow-y:auto}",
    ".oa-modal{position:relative;width:100%;max-width:480px;max-height:calc(100vh - 32px);overflow-y:auto;background:#fff;border-top:3px solid var(--gold,#90660C);border-radius:2px;padding:32px 28px 28px;box-shadow:0 18px 50px rgba(0,0,0,.28);font-family:var(--font-body,system-ui,-apple-system,sans-serif);color:var(--near-black,#1A1A1A)}",
    ".oa-modal h2{margin:0 0 8px;font-size:1.4rem;line-height:1.25;font-weight:600;color:var(--near-black,#1A1A1A)}",
    ".oa-intro{margin:0 0 20px;font-size:.92rem;line-height:1.55;color:var(--muted,#6b6b6b)}",
    ".oa-close{position:absolute;top:10px;right:12px;width:36px;height:36px;border:0;background:none;font-size:1.6rem;line-height:1;color:var(--muted,#6b6b6b);cursor:pointer}",
    ".oa-close:hover{color:var(--near-black,#1A1A1A)}",
    ".oa-field{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}",
    ".oa-field label{font-size:.82rem;font-weight:600;color:var(--near-black,#1A1A1A)}",
    ".oa-field input,.oa-field select,.oa-field textarea{width:100%;box-sizing:border-box;padding:12px 14px;font:inherit;font-size:16px;border:1.5px solid var(--border,#d9d4c7);background:var(--bg-warm,#F7F4ED);color:var(--near-black,#1A1A1A);border-radius:2px;outline:none}",
    ".oa-field textarea{min-height:84px;resize:vertical}",
    ".oa-field input:focus,.oa-field select:focus,.oa-field textarea:focus{border-color:var(--gold,#90660C);background:#fff}",
    ".oa-check{display:flex;gap:10px;align-items:flex-start;margin-bottom:14px;font-size:.88rem;line-height:1.5}",
    ".oa-check input{margin-top:3px;flex:none;width:18px;height:18px}",
    ".oa-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;opacity:0}",
    ".oa-submit{width:100%;padding:14px 24px;border:0;border-radius:2px;background:var(--gold,#90660C);color:#fff;font:inherit;font-size:.95rem;font-weight:600;cursor:pointer}",
    ".oa-submit:hover{background:var(--near-black,#1A1A1A)}",
    ".oa-submit:disabled{opacity:.6;cursor:default}",
    ".oa-msg{margin:14px 0 0;font-size:.88rem;line-height:1.5}",
    ".oa-msg:empty{display:none}",
    ".oa-err{color:#9b2c2c}",
    ".oa-err a{color:inherit;font-weight:600}",
    ".oa-fine{margin:14px 0 0;font-size:.75rem;line-height:1.5;color:var(--muted,#6b6b6b)}",
    ".oa-fine a{color:inherit}",
    ".oa-done{text-align:center;padding:12px 0 4px}",
    ".oa-done p{margin:0 0 20px;font-size:1rem;line-height:1.6}",
    "body.oa-locked{overflow:hidden}",
    "@media (max-width:480px){.oa-modal{padding:28px 18px 22px}}"
  ].join("\n");

  var styleEl = null, overlay = null, lastFocus = null, current = null;

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "class") n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  function ensureStyle() {
    if (styleEl) return;
    styleEl = el("style", { text: CSS });
    document.head.appendChild(styleEl);
  }

  function close() {
    if (!overlay) return;
    document.removeEventListener("keydown", onKey, true);
    overlay.parentNode.removeChild(overlay);
    overlay = null; current = null;
    document.body.classList.remove("oa-locked");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function onKey(e) {
    if (!overlay) return;
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key !== "Tab") return;
    var f = overlay.querySelectorAll("input:not([tabindex='-1']),select,textarea,button");
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function setError(msgEl, text, code) {
    msgEl.className = "oa-msg oa-err";
    msgEl.textContent = "";
    msgEl.appendChild(document.createTextNode(text + " "));
    var a = el("a", { href: "mailto:" + CONTACT, text: CONTACT });
    msgEl.appendChild(a);
    if (code) msgEl.appendChild(document.createTextNode(" (ref: " + code + ")"));
  }

  function showDone(box, cfg) {
    box.innerHTML = "";
    var close1 = el("button", { type: "button", class: "oa-submit", text: "Close" });
    close1.addEventListener("click", close);
    box.appendChild(el("button", { type: "button", class: "oa-close", "aria-label": "Close", text: "×" }));
    box.lastChild.addEventListener("click", close);
    box.appendChild(el("h2", { id: "oa-title", text: "Thank you" }));
    box.appendChild(el("div", { class: "oa-done" }, [el("p", { text: cfg.done }), close1]));
    close1.focus();
  }

  function submit(cfg, form, btn, msgEl, box) {
    if (!form.reportValidity()) return;
    var payload = { type: cfg.type, stream: cfg.stream };
    cfg.fields.forEach(function (f) {
      var inp = form.elements[f.key];
      payload[f.key] = f.type === "checkbox" ? !!inp.checked : (inp.value || "").trim();
    });
    payload.website = form.elements["website"].value;

    var label = btn.textContent;
    btn.disabled = true; btn.textContent = "Sending…";
    msgEl.className = "oa-msg"; msgEl.textContent = "";

    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS) : null;

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, j: j }; });
    }).then(function (x) {
      if (timer) clearTimeout(timer);
      if (x.j && x.j.ok) { showDone(box, cfg); return; }
      btn.disabled = false; btn.textContent = label;
      if (x.status >= 400 && x.status < 500 && x.j && x.j.error) {
        msgEl.className = "oa-msg oa-err"; msgEl.textContent = x.j.error;
      } else {
        setError(msgEl, "Something went wrong on our side, so that didn't go through. Please try again, or email", "HTTP " + x.status);
      }
    }).catch(function (err) {
      if (timer) clearTimeout(timer);
      if (window.console) console.error("[Olympia form] request failed:", err);
      btn.disabled = false; btn.textContent = label;
      setError(msgEl, "We couldn't reach our server just now, so that didn't go through. Please try again in a moment, or email", err && err.name === "AbortError" ? "timeout" : "network");
    });
  }

  function open(key, trigger) {
    var cfg = FORMS[key];
    if (!cfg) return;
    if (overlay) close();
    ensureStyle();
    lastFocus = trigger || document.activeElement;
    current = key;

    var box = el("div", { class: "oa-modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "oa-title" });
    var closeBtn = el("button", { type: "button", class: "oa-close", "aria-label": "Close", text: "×" });
    closeBtn.addEventListener("click", close);
    box.appendChild(closeBtn);
    box.appendChild(el("h2", { id: "oa-title", text: cfg.title }));
    box.appendChild(el("p", { class: "oa-intro", text: cfg.intro }));

    var form = el("form");
    cfg.fields.forEach(function (f, i) {
      var id = "oa-f-" + f.key;
      if (f.type === "checkbox") {
        var cb = el("input", { type: "checkbox", id: id, name: f.key });
        if (f.required) cb.required = true;
        form.appendChild(el("div", { class: "oa-check" }, [cb, el("label", { for: id, text: f.label })]));
        return;
      }
      var inp;
      if (f.type === "select") {
        inp = el("select", { id: id, name: f.key });
        f.options.forEach(function (o) { inp.appendChild(el("option", { value: o[0], text: o[1] })); });
      } else if (f.type === "textarea") {
        inp = el("textarea", { id: id, name: f.key, maxlength: "1000", rows: "3" });
      } else {
        inp = el("input", { id: id, name: f.key, type: f.type, maxlength: "200" });
        if (f.autocomplete) inp.setAttribute("autocomplete", f.autocomplete);
      }
      if (f.required) inp.required = true;
      form.appendChild(el("div", { class: "oa-field" }, [el("label", { for: id, text: f.label }), inp]));
    });

    // Honeypot — hidden from people, tempting to bots.
    var hp = el("div", { class: "oa-hp", "aria-hidden": "true" }, [
      el("label", { for: "oa-f-website", text: "Leave this empty" }),
      el("input", { id: "oa-f-website", name: "website", type: "text", tabindex: "-1", autocomplete: "off" })
    ]);
    form.appendChild(hp);

    var btn = el("button", { type: "submit", class: "oa-submit", text: cfg.button });
    var msgEl = el("p", { class: "oa-msg", role: "status", "aria-live": "polite" });
    form.appendChild(btn);
    form.appendChild(msgEl);
    var fine = el("p", { class: "oa-fine" });
    fine.appendChild(document.createTextNode("We use these details only to respond to you. See our "));
    fine.appendChild(el("a", { href: "/privacy.html", target: "_blank", rel: "noopener", text: "Privacy Policy" }));
    fine.appendChild(document.createTextNode("."));
    form.appendChild(fine);

    form.addEventListener("submit", function (e) { e.preventDefault(); submit(cfg, form, btn, msgEl, box); });
    box.appendChild(form);

    overlay = el("div", { class: "oa-overlay" }, [box]);
    overlay.addEventListener("mousedown", function (e) { if (e.target === overlay) close(); });
    document.body.appendChild(overlay);
    document.body.classList.add("oa-locked");
    document.addEventListener("keydown", onKey, true);
    var first = form.querySelector("input,select,textarea");
    if (first) first.focus();
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("[data-oa-form]") : null;
    if (!t) return;
    e.preventDefault();
    open(t.getAttribute("data-oa-form"), t);
  });

  window.OAForms = { open: open };
})();
