(function () {
  var script =
    document.currentScript ||
    document.querySelector('script[data-form-id][src*="/widget.js"]')

  if (!script || script.dataset.formdeskMounted === "true") {
    return
  }

  script.dataset.formdeskMounted = "true"

  var formId = script.getAttribute("data-form-id")

  if (!formId) {
    console.error("Missing data-form-id.")
    return
  }

  var apiBase = script.getAttribute("data-api-base")

  try {
    apiBase = apiBase || new URL(script.src, window.location.href).origin
  } catch (_error) {
    apiBase = window.location.origin
  }

  function mountWidget() {
    if (!document.body) {
      return
    }

    var host = document.createElement("div")
    var shadow = host.attachShadow({ mode: "open" })

    host.setAttribute("data-formdesk-widget", "")
    host.style.position = "fixed"
    host.style.inset = "0"
    host.style.zIndex = "2147483647"
    host.style.pointerEvents = "none"

    shadow.innerHTML =
      '<style>' +
      ':host,*{box-sizing:border-box}button,input,textarea{font:inherit}' +
      '.fd-root{position:fixed;inset:0;pointer-events:none}' +
      '.fd-backdrop{position:fixed;inset:0;background:rgba(16,18,27,.36);opacity:0;transition:opacity .2s ease;pointer-events:none}' +
      '.fd-trigger,.fd-panel,.fd-close,.fd-submit,.fd-finish{pointer-events:auto}' +
      '.fd-trigger{position:fixed;right:24px;bottom:24px;border:0;border-radius:999px;padding:14px 20px;background:linear-gradient(135deg,#111827,#2f3a57);color:#fff;cursor:pointer;box-shadow:0 20px 45px rgba(15,23,42,.3);font:600 14px/1 "Avenir Next","Segoe UI",sans-serif;letter-spacing:.02em;transition:transform .18s ease,box-shadow .18s ease}' +
      '.fd-trigger:hover{transform:translateY(-1px);box-shadow:0 24px 50px rgba(15,23,42,.35)}' +
      '.fd-panel{position:fixed;right:24px;bottom:88px;width:min(360px,calc(100vw - 24px));max-width:calc(100vw - 24px);padding:24px 24px 20px;border-radius:24px;background:linear-gradient(180deg,#fff,#f7f2ea);color:#161616;box-shadow:0 28px 90px rgba(17,24,39,.28);opacity:0;transform:translateY(18px) scale(.98);transform-origin:bottom right;transition:opacity .22s ease,transform .22s ease;pointer-events:none}' +
      '.fd-panel::before{content:"";position:absolute;inset:0;border-radius:24px;padding:1px;background:linear-gradient(160deg,rgba(190,150,92,.35),rgba(24,34,57,.1));-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none}' +
      '.fd-open .fd-backdrop{opacity:1;pointer-events:auto}' +
      '.fd-open .fd-panel{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}' +
      '.fd-open .fd-trigger{transform:translateY(6px) scale(.98);opacity:0}' +
      '.fd-brow{display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.72);color:#805b2c;font:700 11px/1 "Avenir Next","Segoe UI",sans-serif;letter-spacing:.12em;text-transform:uppercase}' +
      '.fd-title{margin:16px 0 8px;font:600 28px/1.05 "Iowan Old Style","Palatino Linotype","Book Antiqua",serif;letter-spacing:-.02em}' +
      '.fd-copy{margin:0 0 18px;color:#4b5563;font:500 14px/1.6 "Avenir Next","Segoe UI",sans-serif}' +
      '.fd-close{position:absolute;top:14px;right:14px;width:34px;height:34px;border:0;border-radius:999px;background:rgba(17,24,39,.06);color:#111827;cursor:pointer;font-size:20px;line-height:1}' +
      '.fd-field{display:block;margin:0 0 12px}' +
      '.fd-label{display:block;margin:0 0 6px;color:#334155;font:700 12px/1.2 "Avenir Next","Segoe UI",sans-serif;letter-spacing:.08em;text-transform:uppercase}' +
      '.fd-input{display:block;width:100%;padding:12px 14px;border:1px solid rgba(148,163,184,.38);border-radius:14px;background:rgba(255,255,255,.88);color:#0f172a;outline:none;font:500 14px/1.4 "Avenir Next","Segoe UI",sans-serif;transition:border-color .16s ease,box-shadow .16s ease,background .16s ease}' +
      '.fd-input:focus{border-color:#b48a4a;box-shadow:0 0 0 3px rgba(180,138,74,.16);background:#fff}' +
      '.fd-textarea{min-height:116px;resize:vertical}' +
      '.fd-submit,.fd-finish{display:inline-flex;align-items:center;justify-content:center;width:100%;min-height:48px;border:0;border-radius:14px;background:#161b2d;color:#fff;cursor:pointer;font:700 14px/1 "Avenir Next","Segoe UI",sans-serif;letter-spacing:.03em;transition:transform .16s ease,opacity .16s ease}' +
      '.fd-submit:hover,.fd-finish:hover{transform:translateY(-1px)}' +
      '.fd-submit[disabled]{opacity:.6;cursor:wait;transform:none}' +
      '.fd-status{min-height:20px;margin:12px 0 0;color:#c2410c;font:600 13px/1.4 "Avenir Next","Segoe UI",sans-serif}' +
      '.fd-success{padding:10px 0 2px}' +
      '.fd-success-card{padding:18px;border-radius:18px;background:rgba(255,255,255,.72)}' +
      '.fd-success-title{margin:0 0 8px;font:600 24px/1.08 "Iowan Old Style","Palatino Linotype","Book Antiqua",serif}' +
      '.fd-success-copy{margin:0 0 16px;color:#475569;font:500 14px/1.6 "Avenir Next","Segoe UI",sans-serif}' +
      '@media (max-width:640px){.fd-trigger{right:16px;bottom:16px}.fd-panel{right:12px;left:12px;bottom:78px;width:auto;max-width:none;padding:22px 18px 18px}}' +
      "</style>" +
      '<div class="fd-root">' +
      '<div class="fd-backdrop"></div>' +
      '<button class="fd-trigger" type="button" aria-expanded="false">Contact Us</button>' +
      '<section class="fd-panel" role="dialog" aria-modal="true" aria-labelledby="fd-title">' +
      '<button class="fd-close" type="button" aria-label="Close">×</button>' +
      '<div class="fd-brow">FormDesk</div>' +
      '<h2 class="fd-title" id="fd-title">Contact</h2>' +
      '<p class="fd-copy">Send a note and we will reply by email.</p>' +
      '<form novalidate>' +
      '<label class="fd-field"><span class="fd-label">Name</span><input class="fd-input" name="name" type="text" maxlength="120" autocomplete="name" required></label>' +
      '<label class="fd-field"><span class="fd-label">Email</span><input class="fd-input" name="email" type="email" maxlength="320" autocomplete="email" required></label>' +
      '<label class="fd-field"><span class="fd-label">Message</span><textarea class="fd-input fd-textarea" name="message" maxlength="5000" required></textarea></label>' +
      '<button class="fd-submit" type="submit">Send message</button>' +
      '<p class="fd-status" aria-live="polite"></p>' +
      "</form>" +
      '<div class="fd-success" hidden>' +
      '<div class="fd-success-card">' +
      '<h3 class="fd-success-title">Sent.</h3>' +
      '<p class="fd-success-copy">Thanks. We will be in touch soon.</p>' +
      '<button class="fd-finish" type="button">Close</button>' +
      "</div>" +
      "</div>" +
      "</section>" +
      "</div>"

    document.body.appendChild(host)

    var root = shadow.querySelector(".fd-root")
    var trigger = shadow.querySelector(".fd-trigger")
    var backdrop = shadow.querySelector(".fd-backdrop")
    var closeButton = shadow.querySelector(".fd-close")
    var form = shadow.querySelector("form")
    var submitButton = shadow.querySelector(".fd-submit")
    var finishButton = shadow.querySelector(".fd-finish")
    var status = shadow.querySelector(".fd-status")
    var success = shadow.querySelector(".fd-success")
    var firstField = shadow.querySelector('input[name="name"]')
    var timer = 0

    function setOpen(next) {
      root.classList.toggle("fd-open", next)
      trigger.setAttribute("aria-expanded", next ? "true" : "false")

      if (next) {
        window.clearTimeout(timer)
        window.setTimeout(function () {
          firstField.focus()
        }, 30)
        return
      }

      status.textContent = ""
      form.hidden = false
      success.hidden = true
    }

    function showError(message) {
      status.textContent = message
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    function closeAfterSuccess() {
      window.clearTimeout(timer)
      timer = window.setTimeout(function () {
        setOpen(false)
      }, 1800)
    }

    trigger.addEventListener("click", function () {
      setOpen(true)
    })
    closeButton.addEventListener("click", function () {
      setOpen(false)
    })
    finishButton.addEventListener("click", function () {
      setOpen(false)
    })
    backdrop.addEventListener("click", function () {
      setOpen(false)
    })
    window.addEventListener("keydown", handleEscape)

    form.addEventListener("submit", function (event) {
      event.preventDefault()

      if (!form.reportValidity()) {
        return
      }

      var formData = new FormData(form)
      var payload = {
        name: String(formData.get("name") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        message: String(formData.get("message") || "").trim(),
      }

      submitButton.disabled = true
      submitButton.textContent = "Sending..."
      showError("")

      fetch(
        apiBase.replace(/\/$/, "") + "/api/submit/" + encodeURIComponent(formId),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      )
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Request failed")
          }

          form.reset()
          form.hidden = true
          success.hidden = false
          closeAfterSuccess()
        })
        .catch(function () {
          showError("Unable to send right now. Please try again.")
        })
        .finally(function () {
          submitButton.disabled = false
          submitButton.textContent = "Send message"
        })
    })
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountWidget, { once: true })
    return
  }

  mountWidget()
})()
