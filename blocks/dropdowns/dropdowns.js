/**
 * Processes dynamic dropdown content from document HTML.
 * Handles 1-4+ dynamic columns, images, tables, titles, and link mapping.
 */
/**
 * Dynamic Mega Menu Dropdown Builder for AEM Edge Delivery Services (EDS)
 */
export async function createDropdown(li, content, isDesktop) {
    li.classList.add('has-dropdown');
    li.setAttribute('aria-expanded', 'false');

    const link = li.querySelector(':scope > a');
    if (!link) return;

    const arrow = document.createElement('span');
    arrow.className = 'icon icon-down-arrow dropdown-arrow';
    link.append(arrow);

    const mega = document.createElement('div');
    mega.className = 'mega-menu';

    const megaInner = document.createElement('div');
    megaInner.className = 'mega-menu-inner';

    const rows = [...content.children];
    if (rows.length < 2) return;

    // Determine total columns based on Row 1 (Header row)
    const headerRowCells = [...rows[1].children];
    const colCount = Math.max(headerRowCells.length, 1);

    megaInner.style.setProperty('--mega-col-count', colCount);
    mega.classList.add(colCount === 1 ? 'is-single-column' : 'is-full-width');

    const columns = Array.from({ length: colCount }, (_, index) => {
        const colWrapper = document.createElement('div');
        colWrapper.className = `mega-col mega-col-${index + 1}`;
        megaInner.append(colWrapper);
        return colWrapper;
    });

    // Track image-only columns
    const imageCols = new Set();

    // Phase 1: Extract Images and Titles
    for (let r = 1; r < rows.length; r++) {
        const cells = [...rows[r].children];
        cells.forEach((cell, colIdx) => {
            const picture = cell.querySelector('picture, img');
            if (picture && columns[colIdx]) {
                imageCols.add(colIdx);
                columns[colIdx].classList.add('has-image');
                columns[colIdx].append(picture.cloneNode(true));
            }

            const strongTag = cell.querySelector('strong');
            const text = cell.textContent.trim();

            if (strongTag && text && !text.startsWith('/') && !text.startsWith('http') && columns[colIdx]) {
                const titleEl = document.createElement('strong');
                titleEl.className = 'mega-col-title';
                titleEl.textContent = text;
                columns[colIdx].append(titleEl);
            }
        });
    }

    // Phase 2: Extract Links (Redirecting misplaced text away from Image Columns)
    columns.forEach((colWrapper, colIdx) => {
        // Skip link processing for image-only columns
        if (imageCols.has(colIdx)) return;

        let pendingLabel = null;

        for (let r = 1; r < rows.length; r++) {
            // Offset cell read if column 0 is an image column but row cells lack column 0
            const rowCells = [...rows[r].children];
            let cell = rowCells[colIdx];

            // Shift index right if row lacks leading empty cell for image column
            if (imageCols.has(0) && colIdx > 0 && rowCells.length < colCount) {
                cell = rowCells[colIdx - 1];
            }

            if (!cell || cell.querySelector('picture, img') || cell.querySelector('strong')) continue;

            const text = cell.textContent.trim();
            if (!text) continue;

            if (text.startsWith('/') || text.startsWith('http')) {
                if (pendingLabel) {
                    const a = document.createElement('a');
                    a.href = text;
                    a.textContent = pendingLabel;
                    colWrapper.append(a);
                    pendingLabel = null;
                }
            } else {
                if (pendingLabel) {
                    const span = document.createElement('span');
                    span.className = 'mega-text';
                    span.textContent = pendingLabel;
                    colWrapper.append(span);
                }
                pendingLabel = text;
            }
        }

        if (pendingLabel) {
            const span = document.createElement('span');
            span.className = 'mega-text';
            span.textContent = pendingLabel;
            colWrapper.append(span);
        }
    });

    mega.append(megaInner);
    li.append(mega);
}
/**
 * Maps dropdown blocks to their target navigation labels.
 * @param {Element} nav The container element of the loaded navigation document
 * @returns {Map<string, Element>} Map where key = target label (lowercase), value = content container row
 */
export function getDropdowns(nav) {
    const dropdownsMap = new Map();
    if (!nav) return dropdownsMap;

    // Locate all dropdown blocks loaded from the nav document
    const dropdownBlocks = nav.querySelectorAll('.dropdowns.block');

    dropdownBlocks.forEach((block) => {
        // Top-level block rows
        const rows = [...block.children];
        if (!rows.length) return;

        // Row 1 contains the target nav item label (e.g. "Products", "About")
        const labelRow = rows[0];
        const targetLabel = labelRow?.textContent?.trim().toLowerCase();

        if (targetLabel) {
            // Store the block container so createDropdown() can extract its columns/rows
            dropdownsMap.set(targetLabel, block);
        }
    });

    return dropdownsMap;
}