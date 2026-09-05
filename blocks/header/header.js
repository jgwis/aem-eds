import { getMetadata, decorateIcons } from "../../scripts/aem.js";
import { loadFragment } from "../fragment/fragment.js";
import { getDropdowns, createDropdown } from "../dropdowns/dropdowns.js";

const isDesktop = window.matchMedia("(min-width: 900px)");

function closeOnEscape(e) {
  if (e.code !== "Escape") return;

  const nav = document.getElementById("nav");
  const navSections = nav?.querySelector(".nav-sections");
  if (!navSections) return;

  const expanded = navSections.querySelector('.nav-item[aria-expanded="true"]');

  if (expanded && isDesktop.matches) {
    toggleAllNavSections(navSections, false);
    expanded.querySelector("a")?.focus();
  } else if (!isDesktop.matches) {
    toggleMenu(nav, navSections, false);
    nav.querySelector(".nav-hamburger button")?.focus();
  }
}

function closeOnFocusLost(e) {
  const nav = e.currentTarget;
  if (nav.contains(e.relatedTarget)) return;

  const navSections = nav.querySelector(".nav-sections");
  if (!navSections) return;

  toggleMenu(nav, navSections, false);
}

function toggleAllNavSections(sections, expanded = false) {
  if (!sections) return;
  sections.querySelectorAll(".nav-item.has-dropdown").forEach((section) => {
    section.setAttribute("aria-expanded", expanded ? "true" : "false");
    const link = section.querySelector(":scope > a");
    if (link) link.setAttribute("aria-expanded", expanded ? "true" : "false");
  });
}

function toggleMenu(nav, navSections, forceExpanded = null) {
  if (!nav || !navSections) return;

  const expanded =
    forceExpanded !== null
      ? !forceExpanded
      : nav.getAttribute("aria-expanded") === "true";
  const button = nav.querySelector(".nav-hamburger button");

  document.body.style.overflowY = expanded || isDesktop.matches ? "" : "hidden";
  nav.setAttribute("aria-expanded", expanded ? "false" : "true");

  // Collapse dropdowns when switching views or closing menu
  toggleAllNavSections(navSections, false);

  if (button) {
    button.setAttribute(
      "aria-label",
      expanded ? "Open navigation" : "Close navigation",
    );
  }

  if (!expanded || isDesktop.matches) {
    window.addEventListener("keydown", closeOnEscape);
    nav.addEventListener("focusout", closeOnFocusLost);
  } else {
    window.removeEventListener("keydown", closeOnEscape);
    nav.removeEventListener("focusout", closeOnFocusLost);
  }
}

function normalizeNavLinks(fragment) {
  fragment.querySelectorAll("a[href]").forEach((link) => {
    const url = new URL(link.href, window.location.href);
    if (url.hostname.endsWith(".aem.page")) {
      link.href = `${url.pathname}${url.search}${url.hash}`;
    }
  });
}

function setupDropdownEvents(navSections) {
  const dropdownItems = navSections.querySelectorAll(".nav-item.has-dropdown");

  dropdownItems.forEach((item) => {
    const link = item.querySelector(":scope > a");
    if (!link) return;

    // Desktop Hover Events
    item.addEventListener("mouseenter", () => {
      if (!isDesktop.matches) return;
      toggleAllNavSections(navSections, false);
      item.setAttribute("aria-expanded", "true");
      link.setAttribute("aria-expanded", "true");
    });

    item.addEventListener("mouseleave", () => {
      if (!isDesktop.matches) return;
      item.setAttribute("aria-expanded", "false");
      link.setAttribute("aria-expanded", "false");
    });

    // Mobile Click & Keyboard Accessibility Events
    link.addEventListener("click", (e) => {
      // Toggle accordion on mobile or when href is placeholder (#)
      if (!isDesktop.matches || link.getAttribute("href") === "#") {
        e.preventDefault();
        const isExpanded = item.getAttribute("aria-expanded") === "true";

        // Close other open sections
        toggleAllNavSections(navSections, false);

        // Toggle current dropdown
        item.setAttribute("aria-expanded", isExpanded ? "false" : "true");
        link.setAttribute("aria-expanded", isExpanded ? "false" : "true");
      }
    });

    link.addEventListener("keydown", (e) => {
      if (e.code === "Enter" || e.code === "Space") {
        e.preventDefault();
        const isExpanded = item.getAttribute("aria-expanded") === "true";
        toggleAllNavSections(navSections, false);
        item.setAttribute("aria-expanded", isExpanded ? "false" : "true");
        link.setAttribute("aria-expanded", isExpanded ? "false" : "true");
      }

      if (e.code === "Escape") {
        item.setAttribute("aria-expanded", "false");
        link.setAttribute("aria-expanded", "false");
        link.focus();
      }
    });
  });
}

export default async function decorate(block) {
  const navMeta = getMetadata("nav");
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : "/nav";
  const fragment = await loadFragment(navPath);

  normalizeNavLinks(fragment);
  block.textContent = "";

  const nav = document.createElement("nav");
  nav.id = "nav";
  while (fragment.firstElementChild) {
    nav.append(fragment.firstElementChild);
  }

  ["brand", "sections", "tools"].forEach((className, index) => {
    nav.children[index]?.classList.add(`nav-${className}`);
  });

  const dropdowns = getDropdowns(nav);
  const menuBlock = nav.querySelector(".menu.block");
  const navSections = nav.querySelector(".nav-sections");

  if (menuBlock && navSections) {
    const navList = document.createElement("ul");
    navList.className = "nav-list";

    menuBlock.querySelectorAll(":scope > div").forEach((row) => {
      const cells = row.children;
      if (cells.length < 2) return;

      const label = cells[0]?.textContent.trim();
      const href = cells[1]?.textContent.trim() || "#";
      if (!label) return;

      const li = document.createElement("li");
      li.className = "nav-item";

      const link = document.createElement("a");
      link.href = href.startsWith("#") ? "#" : href;
      link.textContent = label;
      li.append(link);

      const dropdownContent = dropdowns.get(label.toLowerCase());
      if (dropdownContent) {
        createDropdown(li, dropdownContent, isDesktop);
      }

      navList.append(li);
    });

    menuBlock.replaceWith(navList);
  }

  // Remove residual dropdown blocks from DOM
  nav.querySelectorAll(".dropdowns.block").forEach((b) => {
    b.closest(".dropdowns-container")?.remove();
  });

  const navBrand = nav.querySelector(".nav-brand");
  if (navBrand) {
    const brandLink = navBrand.querySelector("a");
    if (brandLink) {
      brandLink.innerHTML = `<img src="/icons/Genmab_Logo.svg" alt="Genmab" width="128" height="40" />`;
      brandLink.className = "nav-logo";
    }
  }

  if (navSections) {
    setupDropdownEvents(navSections);
  }

  const hamburger = document.createElement("div");
  hamburger.classList.add("nav-hamburger");
  hamburger.innerHTML = `
    <button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>
  `;
  hamburger.addEventListener("click", () => toggleMenu(nav, navSections));
  nav.prepend(hamburger);

  nav.setAttribute("aria-expanded", "false");
  toggleMenu(nav, navSections, isDesktop.matches);

  isDesktop.addEventListener("change", () => {
    toggleMenu(nav, navSections, isDesktop.matches);
  });

  // Empty icon spans prior to running decorateIcons to avoid duplicate icons
  nav.querySelectorAll("span.icon").forEach((span) => {
    span.innerHTML = "";
  });

  await decorateIcons(nav);

  const navWrapper = document.createElement("div");
  navWrapper.className = "nav-wrapper";
  navWrapper.append(nav);
  block.append(navWrapper);
}