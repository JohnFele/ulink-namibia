async function loadPartial(selector, url) {
  const target = document.querySelector(selector);
  if (!target) return;
  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) {
      console.error("Failed to load partial " + url + ": " + res.status);
      return;
    }
    target.innerHTML = await res.text();
  } catch (err) {
    console.error("Failed to load partial " + url + ":", err);
  }
}
// function initMenu() {
//   const menuBtn = document.getElementById("menuBtn");
//   const closeBtn = document.getElementById("closeMenuBtn");
//   const overlay = document.getElementById("menuOverlay");
//   const menu = document.getElementById("mobileMenu");
//   if (!menuBtn || !overlay || !menu) return;
//   const openMenu = () => {
//     menu.style.transform = "translateX(0)";
//     overlay.style.opacity = "1";
//     overlay.style.pointerEvents = "auto";
//     menu.setAttribute("aria-hidden", "false");
//     menu.removeAttribute("inert");
//     menuBtn.setAttribute("aria-expanded", "true");
//     document.body.style.overflow = "hidden";
//   };
//   const closeMenu = () => {
//     menu.style.transform = "translateX(100%)";
//     overlay.style.opacity = "0";
//     overlay.style.pointerEvents = "none";
//     menu.setAttribute("aria-hidden", "true");
//     menu.setAttribute("inert", "");
//     menuBtn.setAttribute("aria-expanded", "false");
//     document.body.style.overflow = "";
//   };
//   menuBtn.addEventListener("click", openMenu);
//   if (closeBtn) closeBtn.addEventListener("click", closeMenu);
//   overlay.addEventListener("click", closeMenu);
//   document.addEventListener("keydown", (e) => {
//     if (e.key === "Escape") closeMenu();
//   });
//   menu.querySelectorAll("a").forEach((link) => {
//     link.addEventListener("click", closeMenu);
//   });
// }
function initMenu() {
  const headerHost = document.querySelector("#site-header") || document;
  const menuBtn = headerHost.querySelector("#menuBtn");
  const closeBtn = headerHost.querySelector("#closeMenuBtn");
  const overlay = headerHost.querySelector("#menuOverlay");
  const menu = headerHost.querySelector("#mobileMenu");

  if (!menuBtn || !overlay || !menu) {
    console.warn("Menu elements not found in #site-header");
    return;
  }

  const openMenu = () => {
    menu.classList.remove("translate-x-full");
    overlay.classList.remove("opacity-0", "pointer-events-none");

    menu.setAttribute("aria-hidden", "false");
    menuBtn.setAttribute("aria-expanded", "true");

    // inert fallback (some mobile browsers are inconsistent)
    menu.removeAttribute("inert");
    menu
      .querySelectorAll("a, button")
      .forEach((el) => el.removeAttribute("tabindex"));

    document.documentElement.style.overflow = "hidden";
  };

  const closeMenu = () => {
    menu.classList.add("translate-x-full");
    overlay.classList.add("opacity-0", "pointer-events-none");

    menu.setAttribute("aria-hidden", "true");
    menuBtn.setAttribute("aria-expanded", "false");

    menu.setAttribute("inert", "");
    menu
      .querySelectorAll("a, button")
      .forEach((el) => el.setAttribute("tabindex", "-1"));

    document.documentElement.style.overflow = "";
  };

  // Prevent double-binding if initMenu runs more than once
  menuBtn.onclick = openMenu;
  if (closeBtn) closeBtn.onclick = closeMenu;
  overlay.onclick = closeMenu;

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.onclick = closeMenu;
  });
}
function initActiveNav() {
  const path = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("[data-nav]").forEach((link) => {
    const href = link.getAttribute("href") || "";
    const clean = href.split("#")[0];
    if (clean === path) {
      link.classList.add("is-active");
      link.setAttribute("aria-current", "page");
    }
  });
}
function initHeaderEffects() {
  const header = document.getElementById("mainHeader");
  const indicator = document.getElementById("scrollIndicator");
  const onScroll = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    if (indicator) indicator.style.width = progress + "%";
    if (header) header.classList.toggle("header-scrolled", scrollTop > 8);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}
function initFooterYear() {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  const items = document.querySelectorAll(".footer-reveal");
  if (!items.length) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-in"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  items.forEach((el) => io.observe(el));
}
function showToast(message, type = "success") {
  const host = document.getElementById("toastHost");
  if (!host) return;
  const toast = document.createElement("div");
  toast.className = "toast " + (type === "error" ? "toast-error" : "toast-success");
  toast.textContent = message;
  host.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("toast-hide");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

const isProduction = window.location.hostname === "ulink.co.za" || window.location.hostname === "test.ulink.co.za";

function initForms() {
  const endpoints = {
    contact: isProduction
      ? "https://ulink-new-site-backend.onrender.com/api/contact"
      : "http://localhost:5000/api/contact",
    demo: isProduction
      ? "https://ulink-new-site-backend.onrender.com/api/demo"
      : "http://localhost:5000/api/demo",
    generic: isProduction
      ? "https://ulink-new-site-backend.onrender.com/api/contact"
      : "http://localhost:5000/api/contact",
  };

  document.querySelectorAll("[data-ulink-form]").forEach((form) => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      let invalid = false;
      form.querySelectorAll("[data-required=\"true\"]").forEach((field) => {
        const value = (field.value || "").trim();
        const isEmpty = value.length === 0;
        field.classList.toggle("input-invalid", isEmpty);
        field.setAttribute("aria-invalid", isEmpty ? "true" : "false");
        if (isEmpty) invalid = true;
      });

      if (invalid) {
        showToast("Please fill in the required fields.", "error");
        return;
      }

      const submitBtn = form.querySelector("[type=\"submit\"]");
      if (submitBtn) submitBtn.disabled = true;

      const payload = {};
      new FormData(form).forEach((value, key) => {
        payload[key] = value;
      });
      const formType = form.getAttribute("data-form-type") || "generic";
      payload.formType = formType;
      payload.page = window.location.pathname;
      payload.timestamp = new Date().toISOString();

      try {
        const endpoint = endpoints[formType] || endpoints.generic;
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          showToast("Submission failed. Please try again.", "error");
          return;
        }

        showToast("Thanks! We will get back to you shortly.");
        form.reset();
      } catch (err) {
        showToast("Network error. Please try again.", "error");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  });
}
// Initialize privacy policy page functionality
function initPrivacyPolicy() {
  const backToTopBtn = document.getElementById("backToTop");
  if (backToTopBtn) {
    window.addEventListener("scroll", function () {
      if (window.scrollY > 300) {
        backToTopBtn.classList.add("visible");
      } else {
        backToTopBtn.classList.remove("visible");
      }
    });
    backToTopBtn.addEventListener("click", function () {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  }
  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const href = this.getAttribute("href");
      if (href !== "#") {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }
    });
  });
}
function initPageSpecific() {
  const currentPath = window.location.pathname;
  if (currentPath.includes("privacy-policy.html")) initPrivacyPolicy();
}
async function boot() {
  await loadPartial("#site-header", "partials/header.html");
  await loadPartial("#site-footer", "partials/footer.html");
  initMenu();
  initActiveNav();
  initHeaderEffects();
  initFooterYear();
  initForms();
  initPageSpecific();
}
document.addEventListener("DOMContentLoaded", boot);
