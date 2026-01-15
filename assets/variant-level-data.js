document.addEventListener("DOMContentLoaded", async () => {
  const variant = getVariantFromUrl();
  await updateSectionData(variant);
  
  document.querySelectorAll("[name='id']").forEach(id => {
    id.addEventListener("change", async (event) => {
      const variantId = event.target.value;
      await updateSectionData(variantId)
    });
  })
});

async function updateSectionData(variant) {
  try {
    const response = await fetch(`${window.location.pathname}?section_id=variant-level-data&variant=${variant}`);
    if (response.ok) {
      const data = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(data, 'text/html');

      updateElementContent("[data-metafield='my_fields.subheadlines']", doc);
      updateElementContent("[data-metafield='custom.pdp_benefits']", doc);
      updateImageSrc("[data-metafield='custom.lb_pdp_compare_desktop']", doc);
      updateImageSrc("[data-metafield='custom.lb_pdp_compare_mobile']", doc);
    } else {
      console.error('Failed to fetch section data:', response.status);
    }
  } catch (error) {
    console.error('Error fetching section data:', error);
  }
}

function updateElementContent(selector, doc) {
  const element = document.querySelector(selector);
  const newContent = doc.querySelector(selector);
  if (element && newContent) {
    element.innerHTML = newContent.innerHTML;
  }
}

function updateImageSrc(selector, doc) {
  const imageElement = document.querySelector(selector);
  const newImageSrc = doc.querySelector(selector);
  console.log({imageElement, newImageSrc})
  if (imageElement && newImageSrc) {
    imageElement.src = newImageSrc.textContent.trim();
  }
}

function getVariantFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('variant');
}
