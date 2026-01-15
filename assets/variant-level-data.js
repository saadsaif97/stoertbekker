document.addEventListener("DOMContentLoaded", async () => {
  const variant = getVariantFromUrl();
  await updateSectionData(variant);
});

async function updateSectionData(variant) {
  try {
    const response = await fetch(`${window.location.pathname}?section_id=variant-level-data&variant=${variant}`);
    if (response.ok) {
      const data = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(data, 'text/html');

      updateElementContent("[data-metafiled='my_fields.subheadlines']", doc);
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

function getVariantFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('variant');
}
