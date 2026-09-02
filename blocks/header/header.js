import { getMetadata, decorateIcons } from "../../scripts/aem.js";
import { loadFragment } from "../fragment/fragment.js";

const isDesktop = window.matchMedia("(min-width: 900px)");

// Helper to normalize string matching
const cleanText = (str) => str?.trim().toLowerCase() || "";

/**
 * Handles Escape key press to close active navigation dropdowns or mobile menu.
 */
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

/**
 * Handles focus-out event to close menu when user tabs away.
 */
function closeOnFocusLost(e) {
  const nav = e.currentTarget;
  if (nav.contains(e.relatedTarget)) return;

  const navSections = nav.querySelector(".nav-sections");
  if (!navSections) return;

  toggleMenu(nav, navSections, false);
}

/**
 * Handles keyboard interaction for toggling dropdown sections via Enter/Space.
 */
function openOnKeydown(e) {
  if (e.code !== "Enter" && e.code !== "Space") return;
  e.preventDefault();

  const item = e.currentTarget;
  const navSections = item.closest(".nav-sections");
  if (!navSections) return;

  const expanded = item.getAttribute("aria-expanded") === "true";
  toggleAllNavSections(navSections, false);
  item.setAttribute("aria-expanded", expanded ? "false" : "true");
}

/**
 * Toggle all dropdown states.
 */
function toggleAllNavSections(sections, expanded = false) {
  if (!sections) return;
  sections.querySelectorAll(".nav-item.has-dropdown").forEach((section) => {
    section.setAttribute("aria-expanded", expanded ? "true" : "false");
  });
}

/**
 * Toggle mobile or desktop menu overlay state.
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  if (!nav || !navSections) return;

  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute("aria-expanded") === "true";
  const button = nav.querySelector(".nav-hamburger button");

  document.body.style.overflowY = expanded || isDesktop.matches ? "" : "hidden";
  nav.setAttribute("aria-expanded", expanded ? "false" : "true");

  toggleAllNavSections(navSections, !expanded && !isDesktop.matches);

  if (button) {
    button.setAttribute("aria-label", expanded ? "Open navigation" : "Close navigation");
  }

  const navDrops = navSections.querySelectorAll(".nav-item.has-dropdown");
  navDrops.forEach((drop) => {
    if (isDesktop.matches) {
      if (!drop.hasAttribute("tabindex")) {
        drop.setAttribute("tabindex", "0");
        drop.addEventListener("focus", openOnKeydown);
      }
    } else {
      drop.removeAttribute("tabindex");
      drop.removeEventListener("focus", openOnKeydown);
    }
  });

  if (!expanded || isDesktop.matches) {
    window.addEventListener("keydown", closeOnEscape);
    nav.addEventListener("focusout", closeOnFocusLost);
  } else {
    window.removeEventListener("keydown", closeOnEscape);
    nav.removeEventListener("focusout", closeOnFocusLost);
  }
}

/**
 * Cleans preview/authoring URLs for internal environment navigation.
 */
function normalizeNavLinks(fragment) {
  fragment.querySelectorAll("a[href]").forEach((link) => {
    const url = new URL(link.href, window.location.href);
    if (url.hostname.endsWith(".aem.page")) {
      link.href = `${url.pathname}${url.search}${url.hash}`;
    }
  });
}

/**
 * Map out dropdown content blocks from fragment DOM.
 */
function getDropdowns(nav) {
  const dropdowns = new Map();
  nav.querySelectorAll(".dropdowns.block").forEach((block) => {
    const rows = [...block.children];
    if (rows.length < 2) return;
    const label = cleanText(rows[0]?.textContent);
    if (label) dropdowns.set(label, rows[1]);
  });
  return dropdowns;
}

/**
 * Builds the mega-menu container and structures layout sections.
 */
async function createDropdown(li, content) {
  li.classList.add("has-dropdown");
  li.setAttribute("aria-expanded", "false");

  const link = li.querySelector(":scope > a");
  if (!link) return;

  link.setAttribute("aria-haspopup", "true");
  link.setAttribute("aria-expanded", "false");

  // Chevron Icon Placeholder
  const arrow = document.createElement("span");
  arrow.className = "icon icon-down-arrow dropdown-arrow";
  link.append(arrow);

  const mega = document.createElement("div");
  mega.className = "mega-menu";

  const megaInner = document.createElement("div");
  megaInner.className = "mega-menu-inner";

  const leftSection = document.createElement("div");
  leftSection.className = "mega-menu-left";

  const rightSection = document.createElement("div");
  rightSection.className = "mega-menu-right";

  const columns = [...content.children];

  // 1. Process Left Column
  if (columns[0]) {
    leftSection.append(columns[0].cloneNode(true));
  }

  // 2. Process Right Column & Table Mapping
  if (columns[1]) {
    const rightContent = columns[1].cloneNode(true);
    const mainSection = document.createElement("div");
    mainSection.className = "mega-menu-main-section";

    rightContent.querySelectorAll("table").forEach((table) => {
      const section = document.createElement("div");
      section.className = "mega-menu-links-section";

      const titleElement = table.previousElementSibling;
      if (titleElement?.tagName === "P") {
        const strong = titleElement.querySelector("strong");
        if (strong) {
          const title = document.createElement("p");
          title.className = "mega-menu-title";
          title.textContent = strong.textContent.trim();
          section.append(title);
          titleElement.remove();
        }
      }

      const links = document.createElement("div");
      links.className = "mega-menu-links";
      table.querySelectorAll("tbody > tr").forEach((row) => {
        const cells = row.querySelectorAll("td");
        if (cells.length < 2) return;

        const label = cells[0].textContent.trim();
        const href = cells[1].textContent.trim();
        if (!label || !href) return;

        if (cleanText(label) === "text" && cleanText(href) === "link") return;

        const anchor = document.createElement("a");
        anchor.href = href;
        anchor.textContent = label;
        links.append(anchor);
      });

      if (links.children.length) section.append(links);
      table.replaceWith(section);
      mainSection.append(section);
    });

    rightSection.append(rightContent);
    rightContent.append(mainSection);
  }

  // 3. Layout Order & Marker Detection
  const marker = columns[0]?.lastElementChild;
  const isImageOnRight = cleanText(marker?.textContent) === "imageright";

  if (isImageOnRight) {
    const leftMarker = leftSection.querySelector(":scope > div > p:last-child");
    if (leftMarker && cleanText(leftMarker.textContent) === "imageright") {
      leftMarker.remove();
    }
    megaInner.classList.add("reverse-layout");
    megaInner.append(rightSection, leftSection);
  } else {
    megaInner.append(leftSection, rightSection);
  }

  mega.append(megaInner);
  li.append(mega);

  // Desktop Hover Handlers
  li.addEventListener("mouseenter", () => {
    if (!isDesktop.matches) return;
    li.setAttribute("aria-expanded", "true");
    link.setAttribute("aria-expanded", "true");
  });

  li.addEventListener("mouseleave", () => {
    if (!isDesktop.matches) return;
    li.setAttribute("aria-expanded", "false");
    link.setAttribute("aria-expanded", "false");
  });
}

/**
 * Binds mouse and keyboard navigation events to header navigation items.
 */
function setupDropdownEvents(navSections) {
  const dropdownItems = navSections.querySelectorAll(".nav-item.has-dropdown");

  dropdownItems.forEach((item) => {
    const link = item.querySelector(":scope > a");
    if (!link) return;

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

    link.addEventListener("keydown", (e) => {
      if (e.code === "Enter" || e.code === "Space") {
        e.preventDefault();
        const expanded = item.getAttribute("aria-expanded") === "true";
        toggleAllNavSections(navSections, false);
        item.setAttribute("aria-expanded", expanded ? "false" : "true");
        link.setAttribute("aria-expanded", expanded ? "false" : "true");
      }

      if (e.code === "Escape") {
        item.setAttribute("aria-expanded", "false");
        link.setAttribute("aria-expanded", "false");
        link.focus();
      }
    });
  });
}

/**
 * Main decorator function called by EDS framework for Header block initialization.
 */
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

      const dropdownContent = dropdowns.get(cleanText(label));
      if (dropdownContent) {
        createDropdown(li, dropdownContent);
      }

      navList.append(li);
    });

    menuBlock.replaceWith(navList);
  }

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

  // PREVENT DUPLICATE ICONS: Empty icon spans prior to running decorateIcons
  nav.querySelectorAll("span.icon").forEach((span) => {
    span.innerHTML = "";
  });

  await decorateIcons(nav);

  const navWrapper = document.createElement("div");
  navWrapper.className = "nav-wrapper";
  navWrapper.append(nav);
  block.append(navWrapper);
}