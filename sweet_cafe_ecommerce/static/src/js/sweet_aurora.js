/** @odoo-module **/
import publicWidget from "@web/legacy/js/public/public_widget";

publicWidget.registry.SweetAuroraWidget = publicWidget.Widget.extend({
  selector: "body",

  start() {
    this._super(...arguments);
    this._initRestoreTheme();
    this._initThemeToggle();
    this._initScrollReveal();
    this._initNavbarScroll();
    return Promise.resolve();
  },

  // ── Restore saved theme preference (also done inline in <head>) ───────
  _initRestoreTheme() {
    try {
      const saved = localStorage.getItem("sw-theme");
      if (saved) document.documentElement.setAttribute("data-bs-theme", saved);
    } catch (e) {}
  },

  // ── Theme toggle — button is rendered via XML, JS just wires the click ──
  _initThemeToggle() {
    const isDark = () =>
      document.documentElement.getAttribute("data-bs-theme") === "dark";

    const btn = document.getElementById("sw-theme-toggle");
    if (!btn) return;

    // Sync icon with current state on load
    const icon = btn.querySelector(".sw-theme-icon");
    if (icon) icon.textContent = isDark() ? "\uD83C\uDF19" : "\u2600\uFE0F";

    btn.addEventListener("click", () => {
      const next = isDark() ? "light" : "dark";
      document.documentElement.setAttribute("data-bs-theme", next);
      try {
        localStorage.setItem("sw-theme", next);
      } catch (e) {}
      if (icon)
        icon.textContent = next === "dark" ? "\uD83C\uDF19" : "\u2600\uFE0F";
    });
  },

  // ── Scroll-reveal using IntersectionObserver ──────────────────────────
  _initScrollReveal() {
    if (!("IntersectionObserver" in globalThis)) {
      document
        .querySelectorAll(".sw-reveal")
        .forEach((el) => el.classList.add("sw-active"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("sw-active");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px 60px 0px" },
    );
    document.querySelectorAll(".sw-reveal").forEach((el) => io.observe(el));
    // Activate immediately any element already in viewport
    document.querySelectorAll(".sw-reveal").forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight + 60) {
        el.classList.add("sw-active");
      }
    });
  },

  // ── Navbar glass shadow on scroll ────────────────────────────────────
  _initNavbarScroll() {
    const header = document.querySelector(
      "#wrapwrap > header, .o_header_standard",
    );
    if (!header) return;

    const onScroll = () => {
      if (window.scrollY > 40) {
        header.style.boxShadow = "0 4px 30px rgba(44,24,16,0.12)";
      } else {
        header.style.boxShadow = "";
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    this._onScrollHandler = onScroll;
  },

  destroy() {
    if (this._onScrollHandler) {
      window.removeEventListener("scroll", this._onScrollHandler);
    }
    this._super(...arguments);
  },
});

export default publicWidget.registry.SweetAuroraWidget;
