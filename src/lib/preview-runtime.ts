export const RUNTIME_MARKER = 'data-ghighais-runtime="true"';

export const PREVIEW_RUNTIME_SCRIPT = `
(function() {
  // 1. Error Handler
  window.addEventListener("error", function(e) {
    if (parent && parent !== window) {
      parent.postMessage({
        source: "ghighais-preview",
        type: "error",
        message: (e.message || "Error") + " @" + (e.lineno || 0)
      }, "*");
    }
  });

  window.addEventListener("unhandledrejection", function(e) {
    if (parent && parent !== window) {
      parent.postMessage({
        source: "ghighais-preview",
        type: "error",
        message: "Promise: " + ((e.reason && e.reason.message) || e.reason)
      }, "*");
    }
  });

  // 2. Database Sync Helper
  function getDbSnapshot() {
    var snapshot = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k) continue;
        try {
          snapshot[k] = JSON.parse(localStorage.getItem(k) || "");
        } catch (_) {
          snapshot[k] = localStorage.getItem(k);
        }
      }
    } catch (_) {}

    // Periksa database in-memory jika ada (window.db, window.appData, dll)
    try {
      if (window.db && typeof window.db === "object") snapshot["__in_memory_db__"] = window.db;
      if (window.appData && typeof window.appData === "object") snapshot["__app_data__"] = window.appData;
    } catch (_) {}

    return snapshot;
  }

  function emitDbSync() {
    try {
      if (parent && parent !== window) {
        parent.postMessage({
          source: "ghighais-preview",
          type: "db_sync",
          database: getDbSnapshot()
        }, "*");
      }
    } catch (_) {}
  }

  // Intersep localStorage.setItem & removeItem untuk deteksi perubahan live
  try {
    var origSet = localStorage.setItem.bind(localStorage);
    var origRemove = localStorage.removeItem.bind(localStorage);
    var origClear = localStorage.clear.bind(localStorage);

    localStorage.setItem = function(k, v) {
      origSet(k, v);
      setTimeout(emitDbSync, 50);
    };
    localStorage.removeItem = function(k) {
      origRemove(k);
      setTimeout(emitDbSync, 50);
    };
    localStorage.clear = function() {
      origClear();
      setTimeout(emitDbSync, 50);
    };
  } catch (_) {}

  // 3. Login & Authentication Preserver
  function applyPersistedAuth() {
    try {
      var authDataStr = localStorage.getItem("ghighais_auth_user") || localStorage.getItem("auth_user") || localStorage.getItem("user");
      if (!authDataStr) return;
      var auth = typeof authDataStr === "string" && authDataStr.startsWith("{") ? JSON.parse(authDataStr) : { username: authDataStr };

      // Cari elemen tampilan profil / username di DOM dan perbarui
      var nameNodes = document.querySelectorAll("[data-user-name], .user-name, #username-display, .profile-name");
      nameNodes.forEach(function(el) {
        el.textContent = auth.username || auth.name || auth.email || "Pengguna Aktif";
      });

      // Buka panel atau sembunyikan modal login jika ada
      var loginModals = document.querySelectorAll("#login-modal, .login-modal, #auth-screen, .auth-modal, [data-auth-modal]");
      loginModals.forEach(function(el) {
        el.style.display = "none";
      });

      var dashPanels = document.querySelectorAll("#dashboard, .dashboard-view, [data-auth-required], .logged-in-only");
      dashPanels.forEach(function(el) {
        el.style.display = "";
        el.classList.remove("hidden");
      });
    } catch (_) {}
  }

  // Tangkap form login dan pertahankan sesi aktif
  function setupAuthForms() {
    document.addEventListener("submit", function(e) {
      var form = e.target;
      if (!form || form.tagName !== "FORM") return;

      var passInput = form.querySelector('input[type="password"]');
      var userInput = form.querySelector('input[type="text"], input[type="email"], input[name*="user"], input[name*="email"], input[id*="user"]');

      if (passInput || userInput) {
        var username = (userInput && userInput.value.trim()) || "admin";
        var authUser = {
          username: username,
          email: username.includes("@") ? username : username + "@example.com",
          role: "admin",
          loggedIn: true,
          token: "gh_auth_" + Date.now(),
          loginTime: new Date().toISOString()
        };

        try {
          localStorage.setItem("ghighais_auth_user", JSON.stringify(authUser));
          localStorage.setItem("isLoggedIn", "true");
          localStorage.setItem("user", JSON.stringify(authUser));
        } catch (_) {}

        emitDbSync();

        // Cegah navigasi reload form kosong yang merusak iframe
        if (!form.getAttribute("action") || form.getAttribute("action") === "#" || form.getAttribute("action").startsWith("javascript:")) {
          e.preventDefault();
          applyPersistedAuth();

          // Kirim notifikasi toast ke parent
          if (parent && parent !== window) {
            parent.postMessage({
              source: "ghighais-preview",
              type: "auth_success",
              username: username
            }, "*");
          }
        }
      }
    }, true);
  }

  // 4. Cegah navigasi URL luar yang merusak preview iframe
  document.addEventListener("click", function(e) {
    var a = e.target.closest("a");
    if (!a) return;
    var href = a.getAttribute("href");
    if (href && (href.startsWith("http://") || href.startsWith("https://")) && !href.includes(window.location.host)) {
      e.preventDefault();
      window.open(href, "_blank");
    }
  }, true);

  // 5. Tangkap pesan dari Parent (Update Database & Sesi)
  window.addEventListener("message", function(e) {
    var data = e.data;
    if (!data || data.source !== "ghighais-parent") return;

    if (data.type === "update_database") {
      try {
        var valStr = typeof data.value === "string" ? data.value : JSON.stringify(data.value);
        localStorage.setItem(data.key, valStr);
        emitDbSync();

        // Picu event storage tiruan agar UI mendeteksi pembaruan
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new CustomEvent("db:updated", { detail: { key: data.key, value: data.value } }));
      } catch (_) {}
    }

    if (data.type === "delete_database_key") {
      try {
        localStorage.removeItem(data.key);
        emitDbSync();
        window.dispatchEvent(new Event("storage"));
      } catch (_) {}
    }

    if (data.type === "request_db_sync") {
      emitDbSync();
    }
  });

  // Jalankan inisialisasi awal saat DOM siap
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function() {
      setupAuthForms();
      applyPersistedAuth();
      emitDbSync();
    });
  } else {
    setupAuthForms();
    applyPersistedAuth();
    emitDbSync();
  }

  // Periodic poll untuk menjamin sync awal
  setTimeout(emitDbSync, 500);
  setTimeout(emitDbSync, 1500);
})();
`;
