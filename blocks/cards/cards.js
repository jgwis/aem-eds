import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {

  const isFeaturedGrid = block.closest('.featured-grid');
  const cardsSection = block.closest('.cards-container');
  if (isFeaturedGrid) {
    cardsSection.classList.add('featured-section');
  }

  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-card-image';
      else div.className = 'cards-card-body';
      if (div.querySelector('a')) {
        div.querySelector('a').classList.add('link');
      }
    });
    ul.append(li);

  });
  ul.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }])));
  block.textContent = '';
  block.append(ul);

  const paragraphs = block.querySelectorAll('p');

  paragraphs.forEach((p) => {
    // Find the paragraph containing "Select Input"
    if (p.textContent.trim().toLowerCase() === 'select input') {
      const labelP = p.previousElementSibling;

      // 1. Create the <select> element
      const select = document.createElement('select');
      select.classList.add('location-select');
      select.setAttribute('name', 'office-location');

      const locations = [
        { value: '', text: 'Select a location...' },
        { value: 'China', text: 'China' },
        { value: 'Denmark', text: 'Denmark' },
        { value: 'Germany', text: 'Germany' },
        { value: 'Japan', text: 'Japan' },
        { value: 'Netherlands', text: 'Netherlands' },
        { value: 'United Kingdom', text: 'United Kingdom' },


      ];

      locations.forEach((loc) => {
        const option = document.createElement('option');
        option.value = loc.value;
        option.textContent = loc.text;
        if (!loc.value) {
          option.disabled = true;
          option.selected = true;
        }
        select.appendChild(option);
      });

      // 2. Create the outer .select-wrapper
      const selectWrapper = document.createElement('div');
      selectWrapper.classList.add('select-wrapper');

      // 3. Move the label into the wrapper (if it exists)
      if (labelP && labelP.textContent.toLowerCase().includes('select genmab office location')) {
        const label = document.createElement('label');
        label.classList.add('select-label');
        label.textContent = labelP.textContent.trim();
        selectWrapper.appendChild(label);
        labelP.remove();
      }

      // 4. Create an inner container for custom chevron styling & append select
      const fieldContainer = document.createElement('div');
      fieldContainer.classList.add('select-field-container');
      fieldContainer.appendChild(select);

      selectWrapper.appendChild(fieldContainer);

      // Replace the placeholder <p> with our wrapper
      p.replaceWith(selectWrapper);
    }
  });


}
