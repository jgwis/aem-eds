import { getMetadata } from "../../scripts/aem.js";
import { loadFragment } from "../fragment/fragment.js";

const isDesktop = window.matchMedia("(min-width: 900px)");

function closeOnEscape(e) {
  if (e.code !== "Escape") return;

  const nav = document.getElementById("nav");
  if (!nav) return;

  const navSections = nav.querySelector(".nav-sections");
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

  if (isDesktop.matches) {
    toggleAllNavSections(navSections, false);
  } else {
    toggleMenu(nav, navSections, false);
  }
}

function openOnKeydown(e) {
  const item = e.currentTarget;

  if (e.code !== "Enter" && e.code !== "Space") return;

  e.preventDefault();

  const navSections = item.closest(".nav-sections");
  if (!navSections) return;

  const expanded = item.getAttribute("aria-expanded") === "true";

  toggleAllNavSections(navSections, false);

  item.setAttribute("aria-expanded", expanded ? "false" : "true");
}

function focusNavSection(e) {
  e.currentTarget.addEventListener("keydown", openOnKeydown);
}

/**
 * Toggle all dropdowns.
 *
 * @param {Element} sections nav sections
 * @param {boolean} expanded expanded state
 */
function toggleAllNavSections(sections, expanded = false) {
  if (!sections) return;

  sections.querySelectorAll(".nav-item.has-dropdown").forEach((section) => {
    section.setAttribute("aria-expanded", expanded ? "true" : "false");
  });
}

/**
 * Toggle mobile menu.
 *
 * @param {Element} nav nav element
 * @param {Element} navSections nav sections
 * @param {boolean|null} forceExpanded force expanded state
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  if (!nav || !navSections) return;

  const expanded =
    forceExpanded !== null
      ? !forceExpanded
      : nav.getAttribute("aria-expanded") === "true";

  const button = nav.querySelector(".nav-hamburger button");

  document.body.style.overflowY = expanded || isDesktop.matches ? "" : "hidden";

  nav.setAttribute("aria-expanded", expanded ? "false" : "true");

  // On mobile, open the menu.
  // On desktop, all dropdowns start closed.
  toggleAllNavSections(
    navSections,
    expanded || isDesktop.matches ? false : true,
  );

  if (button) {
    button.setAttribute(
      "aria-label",
      expanded ? "Open navigation" : "Close navigation",
    );
  }

  const navDrops = navSections.querySelectorAll(".nav-item.has-dropdown");

  if (isDesktop.matches) {
    navDrops.forEach((drop) => {
      if (!drop.hasAttribute("tabindex")) {
        drop.setAttribute("tabindex", "0");
        drop.addEventListener("focus", focusNavSection);
      }
    });
  } else {
    navDrops.forEach((drop) => {
      drop.removeAttribute("tabindex");
      drop.removeEventListener("focus", focusNavSection);
    });
  }

  // Escape + focus-out handling
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

/**
 * Get dropdown blocks from the nav fragment.
 
 * @param {Element} nav nav element
 * @returns {Map}
 */
function getDropdowns(nav) {
  const dropdowns = new Map();

  nav.querySelectorAll(".dropdowns.block").forEach((block) => {
    const rows = [...block.children];

    if (rows.length < 2) return;

    const label = rows[0]?.textContent.trim().toLowerCase();

    if (!label) return;

    const content = rows[1];

    dropdowns.set(label, content);
  });

  return dropdowns;
}

/**
 * Create a dropdown for a nav item.
 *
 * @param {HTMLElement} li nav item
 * @param {HTMLElement} content dropdown content
 */
async function createDropdown(li, content) {
  li.classList.add("has-dropdown");
  li.setAttribute("aria-expanded", "false");

  const link = li.querySelector(":scope > a");

  if (!link) return;

  link.setAttribute("aria-haspopup", "true");
  link.setAttribute("aria-expanded", "false");


  try {
    const response = await fetch("/icons/down-arrow.svg");
    if (response.ok) {
      const arrowIcon = await response.text();

      const arrow = document.createElement("span");
      arrow.className = "dropdown-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.innerHTML = arrowIcon;

      link.append(arrow);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Unable to load dropdown arrow:", error);
  }


  const mega = document.createElement("div");
  mega.className = "mega-menu";

  const megaInner = document.createElement("div");
  megaInner.className = "mega-menu-inner";


  const leftSection = document.createElement("div");
  leftSection.className = "mega-menu-left";

  const rightSection = document.createElement("div");
  rightSection.className = "mega-menu-right";

  const columns = [...content.children];

  if (columns[0]) {
    const leftContent = columns[0].cloneNode(true);

    leftSection.append(leftContent);
  }

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

        if (label.toLowerCase() === "text" && href.toLowerCase() === "link") {
          return;
        }

        const anchor = document.createElement("a");
        anchor.href = href;
        anchor.textContent = label;
        links.append(anchor);
      });

      if (links.children.length) {
        section.append(links);
      }

      table.replaceWith(section);
      mainSection.append(section);
    });
    rightSection.append(rightContent);
    rightContent.append(mainSection);
  }

  megaInner.append(leftSection, rightSection);
  mega.append(megaInner);
  li.append(mega);

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
 * Set up hover behavior.
 *
 * @param {Element} navSections nav sections
 */
function setupDropdownEvents(navSections) {
  const dropdownItems = navSections.querySelectorAll(".nav-item.has-dropdown");

  dropdownItems.forEach((item) => {
    const link = item.querySelector(":scope > a");

    if (!link) return;

    // Desktop hover
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

    // Keyboard
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
 * Loads and decorates the header.
 *
 * @param {Element} block header block
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

  // Standard EDS nav sections
  const classes = ["brand", "sections", "tools"];

  classes.forEach((className, index) => {
    const section = nav.children[index];

    if (section) {
      section.classList.add(`nav-${className}`);
    }
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

      // Find matching dropdown
      const dropdownContent = dropdowns.get(label.toLowerCase());

      if (dropdownContent) {
        createDropdown(li, dropdownContent);
      }

      navList.append(li);
    });

    menuBlock.replaceWith(navList);
  }


  nav.querySelectorAll(".dropdowns.block").forEach((block) => {
    block.closest(".dropdowns-container")?.remove();
  });


  const navBrand = nav.querySelector(".nav-brand");

  if (navBrand) {
    const brandLink = navBrand.querySelector("a");
    if (brandLink) {
      brandLink.innerHTML = '';

      const logo = document.createElement('img');
      logo.src = '/icons/Genmab_Logo.svg';
      logo.alt = 'Genmab';
      logo.width = 128;
      logo.height = 40;
      brandLink.append(logo);
      brandLink.className = 'nav-logo';
    }
  }

  const sections = nav.querySelector(".nav-sections");

  if (sections) {
    setupDropdownEvents(sections);
  }


  const hamburger = document.createElement("div");
  hamburger.classList.add("nav-hamburger");
  hamburger.innerHTML = `
    <button
      type="button"
      aria-controls="nav"
      aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>
  `;

  hamburger.addEventListener("click", () => {
    toggleMenu(nav, sections);
  });

  nav.prepend(hamburger);

  nav.setAttribute("aria-expanded", "false");

  // Initial state
  toggleMenu(nav, sections, isDesktop.matches);

  // Handle responsive changes
  isDesktop.addEventListener("change", () => {
    toggleMenu(nav, sections, isDesktop.matches);
  });


  const navWrapper = document.createElement("div");
  navWrapper.className = "nav-wrapper";
  navWrapper.append(nav);
  block.append(navWrapper);
}
