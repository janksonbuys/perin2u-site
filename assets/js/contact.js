/* RFQ form: compose a pre-filled email, no backend, no data leaves the browser */
(function () {
  var form = document.getElementById("rfq");
  if (!form) return;
  var sent = document.getElementById("sent");

  function val(id) {
    var el = document.getElementById(id);
    return el && el.value ? el.value.trim() : "";
  }

  function body() {
    return [
      "Company: " + val("company"),
      "Name: " + val("name"),
      "Email: " + val("email"),
      "Country: " + val("country"),
      "Enquiry: " + val("type"),
      "",
      "Part numbers / message:",
      val("msg")
    ].join("\n");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!val("name") || !val("email") || !val("msg")) {
      alert("Please fill in your name, email and the part numbers or message.");
      return;
    }
    var subject = "Part number enquiry" + (val("company") ? " — " + val("company") : "");
    var url = "mailto:lynn@perin2u.com?subject=" + encodeURIComponent(subject) +
              "&body=" + encodeURIComponent(body());
    window.location.href = url;
    sent.style.display = "block";
  });

  var copyBtn = document.getElementById("copy");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var text = body();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          copyBtn.textContent = "Copied";
          setTimeout(function () { copyBtn.textContent = "Copy details"; }, 1800);
        });
      } else {
        var ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch (err) {}
        document.body.removeChild(ta);
        copyBtn.textContent = "Copied";
        setTimeout(function () { copyBtn.textContent = "Copy details"; }, 1800);
      }
    });
  }
})();
