/* Fitment search — runs entirely in the browser against assets/data/parts.json */
(function () {
  var DATA_URL = "assets/data/parts.json";
  var PAGE = 20;

  var parts = [];
  var tokenIndex = {};   // normalized token -> array of part indexes
  var makesSet = {};
  var loaded = false;
  var shown = 0;
  var lastMatches = [];

  var $q = document.getElementById("q");
  var $make = document.getElementById("make");
  var $results = document.getElementById("results");
  var $go = document.getElementById("go");

  function norm(v) {
    return String(v == null ? "" : v).toUpperCase().replace(/[^0-9A-Z]/g, "");
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function addTok(tok, i) {
    if (!tok) return;
    (tokenIndex[tok] || (tokenIndex[tok] = [])).push(i);
  }

  function build() {
    parts.forEach(function (p, i) {
      addTok(norm(p.n), i);
      p.o.forEach(function (o) { addTok(norm(o), i); });
      p.x.forEach(function (x) { addTok(norm(x), i); });
      p.f.forEach(function (f) { makesSet[f[0]] = (makesSet[f[0]] || 0) + 1; });
    });
    Object.keys(makesSet).sort().forEach(function (m) {
      var o = document.createElement("option");
      o.value = m;
      o.textContent = m;
      $make.appendChild(o);
    });
  }

  function hasMake(p, make) {
    if (!make) return true;
    return p.f.some(function (f) { return f[0] === make; });
  }

  function search(raw, make) {
    var q = norm(raw);
    var hits = [];
    var seen = {};
    if (q.length < 2) return [];

    // 1. exact token hit (OE number / part number / cross-reference)
    (tokenIndex[q] || []).forEach(function (i) {
      if (!seen[i]) { seen[i] = 1; hits.push(parts[i]); }
    });

    // 2. prefix match on any indexed token
    if (hits.length < 40 && q.length >= 3) {
      Object.keys(tokenIndex).forEach(function (tok) {
        if (tok.length > q.length && tok.indexOf(q) === 0) {
          tokenIndex[tok].forEach(function (i) {
            if (!seen[i]) { seen[i] = 1; hits.push(parts[i]); }
          });
        }
      });
    }

    // 3. free text against make / model
    if (raw.trim().length >= 3) {
      var needle = raw.trim().toLowerCase();
      parts.forEach(function (p, i) {
        if (seen[i]) return;
        var hit = p.f.some(function (f) {
          return (f[0] + " " + f[1]).toLowerCase().indexOf(needle) !== -1;
        });
        if (hit) { seen[i] = 1; hits.push(p); }
      });
    }

    hits = hits.filter(function (p) { return hasMake(p, make); });
    hits.sort(function (a, b) {
      if (a.a !== b.a) return b.a - a.a;
      return b.f.length - a.f.length;
    });
    return hits;
  }

  function fitLine(f) {
    var yrs = f[4] === f[5] ? f[4] : f[4] + "–" + f[5];
    return (
      '<div class="fitline">' + yrs + " &nbsp;" + esc(f[0]) + " " + esc(f[1]) +
      (f[2] ? " &nbsp;<i>" + esc(f[2]) + "</i>" : "") +
      (f[3] ? " &nbsp;·&nbsp; " + esc(f[3]) : "") +
      "</div>"
    );
  }

  function card(p) {
    var inter = p.o.concat(p.x);
    var shownInter = inter.slice(0, 8).map(esc).join(" · ");
    var moreInter = inter.length > 8 ? " +" + (inter.length - 8) + " more" : "";
    var fits = p.f.slice(0, 6).map(fitLine).join("");
    var moreFit = p.f.length > 6 ? '<div class="fitline" style="color:var(--muted-2)">+ ' + (p.f.length - 6) + " more applications in this part's record</div>" : "";
    return (
      '<div class="rcard">' +
        '<div class="top">' +
          '<div class="pn">' + esc(p.n) + "</div>" +
          '<div class="yrs">Model years ' + (p.y[0] && p.y[1] ? esc(p.y[0]) + "–" + esc(p.y[1]) : "on request") + "</div>" +
        "</div>" +
        (inter.length
          ? '<div class="kv"><b>Interchange:</b> ' + shownInter + moreInter + "</div>"
          : '<div class="kv"><b>Interchange:</b> not published for this number — ask us</div>') +
        (p.f.length
          ? '<div class="fit">' + fits + moreFit + "</div>"
          : '<div class="fit"><div class="fitline" style="color:var(--muted-2)">No fitment rows in the published file. We can still source this number — ask for confirmation.</div></div>') +
      "</div>"
    );
  }

  function render(reset) {
    if (reset) { shown = 0; $results.innerHTML = ""; }
    if (!lastMatches.length) {
      $results.innerHTML =
        '<div class="empty"><div style="color:var(--ink);margin-bottom:6px">No match for “' +
        esc($q.value) + "”.</div>Send the number to <a href=\"mailto:lynn@perin2u.com\" style=\"color:var(--gold-d)\">lynn@perin2u.com</a> — our working file is wider than the published one.</div>";
      return;
    }
    var next = lastMatches.slice(shown, shown + PAGE);
    var html = next.map(card).join("");
    if (shown === 0) {
      $results.innerHTML =
        '<div class="meta">' + lastMatches.length + " part number" + (lastMatches.length > 1 ? "s" : "") +
        " matched" + ($make.value ? " · filtered to " + esc($make.value) : "") + "</div>" + html;
    } else {
      var m = $results.querySelector(".meta");
      if (m) m.textContent = lastMatches.length + " part numbers matched";
      $results.insertAdjacentHTML("beforeend", html);
    }
    shown += next.length;
    var old = $results.querySelector(".more-wrap");
    if (old) old.remove();
    if (shown < lastMatches.length) {
      var w = document.createElement("div");
      w.className = "more-wrap";
      w.innerHTML = '<button class="btn ghost" id="more">Show more (' + (lastMatches.length - shown) + ")</button>";
      $results.appendChild(w);
      document.getElementById("more").onclick = function () { render(false); };
    }
  }

  function run() {
    if (!loaded) return;
    lastMatches = search($q.value, $make.value);
    render(true);
  }

  function boot() {
    fetch(DATA_URL)
      .then(function (r) { return r.json(); })
      .then(function (d) {
        parts = d.parts || [];
        build();
        loaded = true;
        var params = new URLSearchParams(location.search);
        if (params.get("q")) { $q.value = params.get("q"); run(); }
        if (params.get("make")) { $make.value = params.get("make"); run(); }
      })
      .catch(function () {
        $results.innerHTML = '<div class="empty">The fitment file could not be loaded. Please email <a href="mailto:lynn@perin2u.com" style="color:var(--gold-d)">lynn@perin2u.com</a>.</div>';
      });
  }

  var t;
  $q.addEventListener("input", function () {
    clearTimeout(t);
    t = setTimeout(function () {
      if (norm($q.value).length >= 2) run();
    }, 260);
  });
  $q.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); run(); } });
  $go.addEventListener("click", run);
  $make.addEventListener("change", function () { if (norm($q.value).length >= 2) run(); });

  Array.prototype.forEach.call(document.querySelectorAll(".chips button"), function (b) {
    b.addEventListener("click", function () {
      $q.value = b.getAttribute("data-q");
      run();
      $q.focus();
    });
  });

  boot();
})();
