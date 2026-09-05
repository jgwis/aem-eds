/**
 * Decorates the hero block
 * @param {Element} block The hero block element
 */
export default function decorate(block) {
    // Target the inner container wrapper
    const container = block.firstElementChild;
    if (!container) return;

    const [textCol, imageCol] = container.children;

    if (textCol) {
        textCol.classList.add('hero-content');
    }

    if (imageCol) {
        imageCol.classList.add('hero-image');
    }
}

