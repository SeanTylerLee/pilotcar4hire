(function () {
  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  ready(function () {
    if (typeof initNav === "function") initNav();

    var form = document.getElementById("contact-form");
    var statusEl = document.getElementById("contact-message-status");
    if (!form || !statusEl) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      var name = (document.getElementById("contact-name").value || "").trim();
      var email = (document.getElementById("contact-email").value || "").trim();
      var message = (document.getElementById("contact-message").value || "").trim();

      if (!name || !email || !message) {
        statusEl.hidden = false;
        statusEl.classList.remove("is-success");
        statusEl.classList.add("is-error");
        statusEl.textContent = "Name, email, and message are required.";
        return;
      }

      if (btn) btn.disabled = true;
      statusEl.hidden = false;
      statusEl.classList.remove("is-error", "is-success");
      statusEl.textContent = "Sending…";

      submitStudioInbox({
        p_source: "contact",
        p_name: name,
        p_email: email,
        p_message: message,
        p_site: "pilotcar4hire.com"
      }).then(function () {
        statusEl.classList.add("is-success");
        statusEl.textContent = "Message sent. We’ll get back to you.";
        form.reset();
      }).catch(function (err) {
        statusEl.classList.add("is-error");
        statusEl.textContent = (err && err.message) ? err.message : "Something went wrong. Please try again.";
      }).finally(function () {
        if (btn) btn.disabled = false;
      });
    });
  });
})();
