import { readBlockConfig, decorateIcons } from '../../scripts/aem.js';

/**
 * Normalizes content and renders custom footer grid
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const cfg = readBlockConfig(block);
  block.textContent = '';

  const footerPath = cfg.footer || '/footer';
  const resp = await fetch(`${footerPath}.plain.html`, window.location.pathname.endsWith('/') ? {} : { cache: 'reload' });

  if (!resp.ok) return;

  const html = await resp.text();
  const rawContainer = document.createElement('div');
  rawContainer.innerHTML = html;

  // Root container for upper footer content
  const footerContainer = document.createElement('div');
  footerContainer.classList.add('footer-inner');

  // 1. Build Grid Columns
  const gridWrapper = document.createElement('div');
  gridWrapper.classList.add('footer-grid');

  // Find all section title elements (strong/headings)
  const headings = rawContainer.querySelectorAll('p strong, h3, h4');

  headings.forEach((heading) => {
    const titleText = heading.textContent.trim();
    const parentP = heading.closest('p, h3, h4');
    const col = document.createElement('div');
    col.classList.add('footer-column');

    // Case A: Footer Logo Column
    if (titleText.toLowerCase().includes('logo')) {
      col.classList.add('footer-brand');
      col.innerHTML = `
        <a href="https://main--genmab--jgwis.aem.page/" aria-label="Home">
          <img src="/icons/Genmab_Logo.svg" alt="Logo" class="footer-logo-img" />
        </a>
      `;
    }
    // Case B: Social Follow Column
    else if (titleText.toLowerCase().includes('follow')) {
      col.classList.add('footer-social');
      col.innerHTML = `
        <p><strong>${titleText}</strong></p>
        <div class="social-icons">
          <a href="#" target="_blank" rel="noopener" aria-label="LinkedIn">
                <img src="/icons/linkedin_white.svg" alt="LinkedIn" />
          </a>
          <a href="https://x.com" target="_blank" rel="noopener" aria-label="X">
          <img src="/icons/twitter.svg" alt="X" />
          </a>
        </div>
      `;
    }
    // Case C: Standard Nav Columns (Quick Links, Explore, Resources, etc.)
    else if (!titleText.toLowerCase().includes('bottom footer')) {
      col.appendChild(parentP.cloneNode(true));

      // Grab sibling UL list or next available UL
      let nextEl = parentP.nextElementSibling;
      while (nextEl && nextEl.tagName !== 'UL' && nextEl.tagName !== 'P') {
        nextEl = nextEl.nextElementSibling;
      }

      if (nextEl && nextEl.tagName === 'UL') {
        col.appendChild(nextEl.cloneNode(true));
      }
    }

    if (col.children.length > 0) {
      gridWrapper.appendChild(col);
    }
  });

  footerContainer.appendChild(gridWrapper);

  // 2. Build Tagline Banner
  const taglineHeader = Array.from(rawContainer.querySelectorAll('h1, code'))
    .find((el) => el.textContent.toLowerCase().includes('transforming lives'));

  if (taglineHeader) {
    const taglineDiv = document.createElement('div');
    taglineDiv.classList.add('footer-tagline');
    taglineDiv.innerHTML = `<h2>${taglineHeader.textContent.replace(/`/g, '').trim()}</h2>`;
    footerContainer.appendChild(taglineDiv);
  }

  // 3. Build Bottom Legal Bar (Sibling to .footer-inner)
  const bottomDiv = document.createElement('div');
  bottomDiv.classList.add('footer-bottom');

  // Extract legal links list
  const allLists = rawContainer.querySelectorAll('ul');
  const legalList = Array.from(allLists).find((ul) =>
    ul.textContent.includes('Policy') || ul.textContent.includes('Terms')
  );

  if (legalList) {
    const cleanedUl = document.createElement('ul');
    cleanedUl.classList.add('footer-legal-links');

    legalList.querySelectorAll('li').forEach((li) => {
      const cleanText = li.textContent.trim();
      if (cleanText) {
        const newLi = document.createElement('li');
        const link = li.querySelector('a');
        const href = link ? link.getAttribute('href') : '#';
        newLi.innerHTML = `<a href="${href}">${cleanText}</a>`;
        cleanedUl.appendChild(newLi);
      }
    });
    bottomDiv.appendChild(cleanedUl);
  }

  // Extract Copyright notice
  const copyrightMatch = rawContainer.textContent.match(/©\s*\d{4}[^<\n]*/);
  const copyrightText = copyrightMatch ? copyrightMatch[0].replace(/`/g, '') : '©2026 Genmab A/S';

  const copyP = document.createElement('p');
  copyP.classList.add('footer-copyright');
  copyP.textContent = copyrightText;
  bottomDiv.appendChild(copyP);

  // Decorate icons for both containers
  await decorateIcons(footerContainer);
  await decorateIcons(bottomDiv);

  // Append both sibling containers directly into the block
  block.append(footerContainer);
  block.append(bottomDiv);
}