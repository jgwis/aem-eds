
/**
 * Decorates the hero1 block
 * @param {Element} block The hero1 block element
 */
export default function decorate(block) {
    // 1. Locate the primary container wrapper
    const container = block.querySelector(':scope > div');
    if (!container) return;

    const contentCol = container.children[0];
    const mediaCol = container.children[1];

    // Variables to hold extracted elements
    let heroHeaderContent = document.createElement('div');
    const cardElements = [];

    // 2. Extract elements from the authoring table if present
    const table = contentCol?.querySelector('table');
    if (table) {
        const rows = [...table.querySelectorAll('tbody > tr')];

        rows.forEach((row, index) => {
            const cellContent = row.querySelector('td');
            if (!cellContent) return;

            const cellText = cellContent.textContent.trim().toLowerCase();

            // Skip table header indicator row (e.g., "cards")
            if (index === 0 && cellText === 'cards') return;

            // Create a column wrapper for each card item
            const cardCol = document.createElement('div');
            cardCol.className = 'col';

            while (cellContent.firstChild) {
                cardCol.append(cellContent.firstChild);
            }
            cardElements.push(cardCol);
        });

        table.remove();
    }

    // Preserve any remaining non-table hero text/content
    if (contentCol) {
        heroHeaderContent = contentCol;
    }

    // 3. Construct Row 1 (Header Content & Media Image)
    const row1 = document.createElement('div');
    row1.className = 'row';

    const row1Col1 = document.createElement('div');
    row1Col1.className = 'col';
    while (heroHeaderContent.firstChild) {
        row1Col1.append(heroHeaderContent.firstChild);
    }

    const row1Col2 = document.createElement('div');
    row1Col2.className = 'col';
    if (mediaCol) {
        while (mediaCol.firstChild) {
            row1Col2.append(mediaCol.firstChild);
        }
    }

    row1.append(row1Col1, row1Col2);

    // 4. Construct Row 2 (Cards Grid Layout)
    const row2 = document.createElement('div');
    row2.className = 'row cards';

    cardElements.forEach((cardCol) => {
        row2.append(cardCol);
    });

    // 5. Replace block contents with the new structured rows
    block.textContent = '';
    block.append(row1, row2);
}