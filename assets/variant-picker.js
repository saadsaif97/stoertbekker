Stoertebekker.formatMoney = function(cents, format) {
  if (typeof cents == 'string') {
    cents = cents.replace('.', '');
  }
  
  const placeholderRegex = /{{\s*(\w+)\s*}}/;
  const formatString = (format || this.money_format);
  let value = '';
  
  function defaultOption(opt, def) {
    return (typeof opt == 'undefined' ? def : opt);
  }
  
  function formatWithDelimiters(number, precision, thousands, decimal) {
    precision = defaultOption(precision, 2);
    thousands = defaultOption(thousands, ',');
    decimal = defaultOption(decimal, '.');
    
    if (isNaN(number) || number == null) {
        return 0;
    }
    
    number = (number / 100.0).toFixed(precision);
    
    const parts = number.split('.'),
          dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands),
          cents = parts[1] ? (decimal + parts[1]) : '';
    
    return dollars + cents;
  }

  switch (formatString.match(placeholderRegex)[1]) {
    case "amount":
      // Ex. 1,134.65
      value = formatWithDelimiters(cents, 2);
      break;
    case "amount_no_decimals":
      // Ex. 1,135
      value = formatWithDelimiters(cents, 0);
      break;
    case "amount_with_comma_separator":
      // Ex. 1.134,65
      value = formatWithDelimiters(cents, 2, ".", ",");
      break;
    case "amount_no_decimals_with_comma_separator":
      // Ex. 1.135
      value = formatWithDelimiters(cents, 0, ".", ",");
      break;
    case "amount_with_apostrophe_separator":
      // Ex. 1'134.65
      value = formatWithDelimiters(cents, 2, "'", ".");
      break;
    case "amount_no_decimals_with_space_separator":
      // Ex. 1 135
      value = formatWithDelimiters(cents, 0, " ");
      break;
    case "amount_with_space_separator":
      // 1 134,65
      value = formatWithDelimiters(cents, 2, " ", ",");
      break;
    case "amount_with_period_and_space_separator":
      // 1 134.65
      value = formatWithDelimiters(cents, 2, " ", ".");
      break;
  }
  
  return formatString.replace(placeholderRegex, value);
};

// Variant picker
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

var ProductLoader = class {
  static load(productHandle) {
    if (!productHandle) {
      return;
    }
    if (this.loadedProducts[productHandle]) {
      return this.loadedProducts[productHandle];
    }
    this.loadedProducts[productHandle] = new Promise(async (resolve, reject) => {
      const response = await fetch(`${Shopify.routes.root}products/${productHandle}.js`);
      if (response.ok) {
        const responseAsJson = await response.json();
        resolve(responseAsJson);
      } else {
        reject(`
          Attempted to load information for product with handle ${productHandle}, but this product is in "draft" mode. You won't be able to
          switch between variants or access to per-variant information. To fully preview this product, change temporarily its status
          to "active".
        `);
      }
    });
    return this.loadedProducts[productHandle];
  }
};
__publicField(ProductLoader, "loadedProducts", {});

var VariantPicker = class extends HTMLElement {
  async connectedCallback() {
    this._abortController = new AbortController();
    this.masterSelector = document.forms[this.getAttribute("form")].id;
    this.optionSelectors = Array.from(this.querySelectorAll("[data-option-selector]"));
    if (!this.masterSelector) {
      console.warn(`The variant selector for product with handle ${this.productHandle} is not linked to any product form.`);
      return;
    }
    this.product = await ProductLoader.load(this.productHandle);
    this.optionSelectors.forEach((optionSelector) => {
      optionSelector.addEventListener("change", this._onOptionChanged.bind(this), { signal: this._abortController.signal });
    });
    this.masterSelector.addEventListener("change", this._onMasterSelectorChanged.bind(this), { signal: this._abortController.signal });
    this._updateDisableSelectors();
    this.selectVariant(this.selectedVariant["id"]);
  }
  disconnectedCallback() {
    this._abortController.abort();
  }
  get selectedVariant() {
    return this._getVariantById(parseInt(this.masterSelector.value));
  }
  get productHandle() {
    return this.getAttribute("handle");
  }
  get hideSoldOutVariants() {
    return this.hasAttribute("hide-sold-out-variants");
  }
  get updateUrl() {
    return this.hasAttribute("update-url");
  }
  /**
   * Select a new variant by its ID
   */
  async selectVariant(id) {
    if (!this._isVariantSelectable(this._getVariantById(id))) {
      id = this._getFirstMatchingAvailableOrSelectableVariant()["id"];
    }
    const previousVariant = this.selectedVariant;
    if (previousVariant && previousVariant.id === id) {
      return;
    }
    this.masterSelector.value = id;
    this.masterSelector.dispatchEvent(new Event("change", { bubbles: true }));
    if (this.updateUrl && history.replaceState) {
      const newUrl = new URL(window.location.href);
      if (id) {
        newUrl.searchParams.set("variant", id);
      } else {
        newUrl.searchParams.delete("variant");
      }
      window.history.replaceState({ path: newUrl.toString() }, "", newUrl.toString());
    }
    this._updateDisableSelectors();
    
    this.masterSelector.form.dispatchEvent(new CustomEvent("variant:change", {
      bubbles: true,
      detail: {
        product: this.product,
        variant: this.selectedVariant,
        previousVariant
      }
    }));
    
    this._checkPreorder(this.selectedVariant.id)
  }
  async _checkPreorder(id) {
    try {
      const sectionUrl = `/products/${this.product.handle}?variant=${id}&section_id=add-to-cart-text`;

      const response = await fetch(sectionUrl);
      const html = await response.text();

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const updatedSection = doc.getElementById('shopify-section-add-to-cart-text');

      let text = updatedSection.textContent;
      
      this.masterSelector.form.dispatchEvent(new CustomEvent("preorder:check", {
        bubbles: true,
        detail: {
          text
        }
      }));
    } catch (error) {
      console.error("Error loading preorder section:", error);
    }
  }
  _onOptionChanged(event) {
    if (!event.target.name.startsWith("option")) {
      return;
    }
    this.selectVariant(this._getVariantFromOptions()?.id);
  }
  _onMasterSelectorChanged() {
    const options = this.selectedVariant?.options || [];
    options.forEach((value, index) => {
      let input = this.optionSelectors[index].querySelector(`input[type="radio"][name="option${index + 1}"][value="${CSS.escape(value)}"], input[type="hidden"][name="option${index + 1}"], select[name="option${index + 1}"]`), triggerChangeEvent = false;
      if (input.tagName === "SELECT" || input.tagName === "INPUT" && input.type === "hidden") {
        triggerChangeEvent = input.value !== value;
        input.value = value;
      } else if (input.tagName === "INPUT" && input.type === "radio") {
        triggerChangeEvent = !input.checked && input.value === value;
        input.checked = input.value === value;
      }
      if (triggerChangeEvent) {
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  }
  /**
   * Get the product variant by its ID
   */
  _getVariantById(id) {
    return this.product["variants"].find((variant) => variant["id"] === id);
  }
  /**
   * Get the variant based on the options
   */
  _getVariantFromOptions() {
    const options = this._getSelectedOptionValues();
    return this.product["variants"].find((variant) => {
      return variant["options"].every((value, index) => value === options[index]);
    });
  }
  /**
   * Detect if a specific variant is selectable. This is used when the "hide sold out variant" option is enabled, to allow
   * returning true only if the variant is actually available
   */
  _isVariantSelectable(variant) {
    if (!variant) {
      return false;
    } else {
      return variant["available"] || !this.hideSoldOutVariants && !variant["available"];
    }
  }
  /**
   * This method is used internally to select an available or selectable variant, when the current choice does not
   * match the requirements. For instance, if sold out variants are configured to be hidden, but that the choices end
   * up being a non-valid variant, the theme automatically changes the variant to match the requirements. In the case
   * the customer end up on variant combinations that do not exist, it also switches to a valid combination.
   *
   * The algorithm is as follows: if we have for instance three options "Color", "Size" and "Material", we pop the last
   * option (Material) and try to find the first available variant for the given Color and Size. If none is found we
   * remove the second option (Size) and try to find the first available variant for the selected color. Finally, if none
   * is found we return the first available variant independently of any choice.
   */
  _getFirstMatchingAvailableOrSelectableVariant() {
    let options = this._getSelectedOptionValues(), matchedVariant = null, slicedCount = 0;
    do {
      options.pop();
      slicedCount += 1;
      matchedVariant = this.product["variants"].find((variant) => {
        if (this.hideSoldOutVariants) {
          return variant["available"] && variant["options"].slice(0, variant["options"].length - slicedCount).every((value, index) => value === options[index]);
        } else {
          return variant["options"].slice(0, variant["options"].length - slicedCount).every((value, index) => value === options[index]);
        }
      });
    } while (!matchedVariant && options.length > 0);
    return matchedVariant;
  }
  _getSelectedOptionValues() {
    return this.optionSelectors.map((optionSelector) => {
      return optionSelector.querySelector('input[name^="option"][type="hidden"], input[name^="option"]:checked, select[name^="option"]').value;
    });
  }
  /**
   * We add specific class to sold out variants based on the selectors
   */
  _updateDisableSelectors() {
    const selectedVariant = this.selectedVariant;
    if (!selectedVariant) {
      return;
    }
    const applyClassToSelector = (selector, valueIndex, available, hasAtLeastOneCombination) => {
      const optionValue = Array.from(selector.querySelectorAll("[data-option-value]"))[valueIndex];
      optionValue.toggleAttribute("hidden", !hasAtLeastOneCombination);
      if (this.hideSoldOutVariants) {
        optionValue.toggleAttribute("hidden", !available);
      } else {
        optionValue.classList.toggle("is-disabled", !available);
      }
    };
    if (this.optionSelectors && this.optionSelectors[0]) {
      this.product["options"][0]["values"].forEach((value, valueIndex) => {
        const hasAtLeastOneCombination = this.product["variants"].some((variant) => variant["option1"] === value && variant), hasAvailableVariant = this.product["variants"].some((variant) => variant["option1"] === value && variant["available"]);
        applyClassToSelector(this.optionSelectors[0], valueIndex, hasAvailableVariant, hasAtLeastOneCombination);
        if (this.optionSelectors[1]) {
          this.product["options"][1]["values"].forEach((value2, valueIndex2) => {
            const hasAtLeastOneCombination2 = this.product["variants"].some((variant) => variant["option2"] === value2 && variant["option1"] === selectedVariant["option1"] && variant), hasAvailableVariant2 = this.product["variants"].some((variant) => variant["option2"] === value2 && variant["option1"] === selectedVariant["option1"] && variant["available"]);
            applyClassToSelector(this.optionSelectors[1], valueIndex2, hasAvailableVariant2, hasAtLeastOneCombination2);
            if (this.optionSelectors[2]) {
              this.product["options"][2]["values"].forEach((value3, valueIndex3) => {
                const hasAtLeastOneCombination3 = this.product["variants"].some((variant) => variant["option3"] === value3 && variant["option1"] === selectedVariant["option1"] && variant["option2"] === selectedVariant["option2"] && variant), hasAvailableVariant3 = this.product["variants"].some((variant) => variant["option3"] === value3 && variant["option1"] === selectedVariant["option1"] && variant["option2"] === selectedVariant["option2"] && variant["available"]);
                applyClassToSelector(this.optionSelectors[2], valueIndex3, hasAvailableVariant3, hasAtLeastOneCombination3);
              });
            }
          });
        }
      });
    }
  }
};
var VariantOptionValue = class extends HTMLElement {
  constructor() {
    super();
    this._onVariantChangedListener = this._onVariantChanged.bind(this);
  }
  connectedCallback() {
    document.forms[this.getAttribute("form")]?.addEventListener("variant:change", this._onVariantChangedListener);
  }
  disconnectedCallback() {
    document.forms[this.getAttribute("form")]?.removeEventListener("variant:change", this._onVariantChangedListener);
  }
  _onVariantChanged(event) {
    this.innerHTML = event.detail.variant[this.getAttribute("for")];
  }
};
if (!window.customElements.get("variant-picker")) {
  window.customElements.define("variant-picker", VariantPicker);
}
if (!window.customElements.get("variant-option-value")) {
  window.customElements.define("variant-option-value", VariantOptionValue);
}

const pdpAtcBtn = document.querySelectorAll('.pdpAtcBtn');
const pdpBisBtn = document.querySelectorAll('.pdpBisBtn');
const variantRelated = document.querySelectorAll('.variantRelated');

function handleProductMedia(variantID) {
  let dynamicProdMedia = document.querySelectorAll('[related-variant]');
  let dynamicProdSlidesImgs = document.querySelectorAll('[related-variant-id]');
  let matchingMedia = document.querySelectorAll('[related-variant="' + variantID + '"]');
  let matchingSlides = document.querySelectorAll('[related-variant-id="' + variantID + '"]');

  // Hide all media
  dynamicProdMedia.forEach(media => {
    media.classList.add('mediaishidden');
  });

  // Show and trigger matching media
  matchingMedia.forEach(media => {
    media.click();
    media.classList.remove('mediaishidden');
  });

  if (matchingSlides.length > 0) {
    let targetSwiper = document.querySelector('.mySwiper');

    // Example: go to first matching slide
    let firstIndex = matchingSlides[0].getAttribute('slide-index');
    targetSwiper.swiper.slideTo(firstIndex || 0);

    // Hide all slides except the matching ones
    dynamicProdSlidesImgs.forEach(img => {
      let relatedSlide = img.closest('swiper-slide');
      if (![...matchingSlides].includes(img)) {
        relatedSlide.style.display = 'none';
      } else {
        relatedSlide.style.removeProperty('display');
      }
    });

    // Refresh Swiper
    targetSwiper.swiper.update();
  }
}

function handleOptionGroups(name) {
  let groupItems = document.querySelectorAll('[switchgroup]');
  let groupItemCurrent = document.querySelectorAll('[switchgroup="' + name + '"]');
  groupItems && groupItems.forEach(item => {
    item.classList.add('display-none');
    item.classList.remove('is-visible');
  });
  groupItemCurrent && groupItemCurrent.forEach((item, index) => {
    item.classList.remove('display-none');
    item.classList.add('is-visible');
    if (index === 0) {
      item.click();
    }
  });
}

document.addEventListener('preorder:check', e => {
  const text = e.detail.text
  if (document.querySelector(".pdpAtcBtn")) {
    document.querySelector(".pdpAtcBtn").textContent = text
  }
})

document.addEventListener('variant:change', e => {
  let variant = e.detail.variant;
  if (variant) {
    handleProductMedia(variant.id);
    if (variant.available) {
      pdpAtcBtn && pdpAtcBtn.forEach(btn => {
        btn.classList.remove('d-none');
      });
      pdpBisBtn && pdpBisBtn.forEach(btn => {
        btn.classList.add('d-none');
      });
    } else {
      pdpAtcBtn && pdpAtcBtn.forEach(btn => {
        btn.classList.add('d-none');
      });
      pdpBisBtn && pdpBisBtn.forEach(btn => {
        btn.classList.remove('d-none');
      });
    }
    variantRelated && variantRelated.forEach(variantEl => {
      let variantElId = Number(variantEl.getAttribute('variant-id'));
      if (variant.id === variantElId) {
        variantEl.classList.remove('d-none');
      } else {
        variantEl.classList.add('d-none');
      }
    });

    const lbSparbadgeOrange = document.querySelector('.lb-sparbadge-orange');
    const lbSparbadgeYellow = document.querySelector('.lb-sparbadge-yellow');
    if (lbSparbadgeOrange != null) {
      const orangeMoney = lbSparbadgeOrange.querySelector('.money');
      
      let priceSaving = 0;
      if (variant.compare_at_price > variant.price) {
        priceSaving = (variant.compare_at_price - variant.price);

        orangeMoney.innerText = Stoertebekker.formatMoney(priceSaving);
        lbSparbadgeOrange.style.display = 'inline-block';
      } else {
        lbSparbadgeOrange.style.display = 'none';
      }
    }
    if (lbSparbadgeYellow != null) {
      const yellowMoney = lbSparbadgeYellow.querySelector('.money') || lbSparbadgeYellow;
      
      let priceSaving = 0;
      if (variant.compare_at_price > variant.price) {
        priceSaving = (variant.compare_at_price - variant.price);

        console.log(priceSaving);

        if (Shopify.locale == 'de') {
          yellowMoney.innerText = `Du sparst ${Stoertebekker.formatMoney(priceSaving)}`;
        } else {
          yellowMoney.innerText = `You save ${Stoertebekker.formatMoney(priceSaving)}`;
        }
        lbSparbadgeYellow.style.display = 'inline-block';
      } else {
        lbSparbadgeYellow.style.display = 'none';
      }
    }
  }
});

document.addEventListener('DOMContentLoaded', (e) => {
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const variantID = urlParams.get('variant') || window.currentVariantId;

  if (variantID) {
    handleProductMedia(variantID);
  }

  const caseColorSwitcher = document.querySelectorAll('.caseColorSwitcher');
  caseColorSwitcher && caseColorSwitcher.forEach(switcher => {
    switcher.addEventListener('click', () => {
      let group = switcher.getAttribute('group');
      caseColorSwitcher.forEach(el => {
        el.classList.remove('is-selected');
      });
      switcher.classList.add('is-selected');
      handleOptionGroups(group);
    });
  });

  const caseColorSwitcherSelected = document.querySelector('.caseColorSwitcher.is-selected');
  const groupItemsParent = document.querySelector('.variantPickerMainValues');
  const handleVariantPickerGroups = new Promise((resolve, reject) => {
    if (caseColorSwitcherSelected) {
      let targetgroup = caseColorSwitcherSelected.getAttribute('group');
      caseColorSwitcherSelected.click();
      handleOptionGroups(targetgroup);
      resolve();
    } else {
      resolve();
    }
  });
  handleVariantPickerGroups
    .finally(() => {
      groupItemsParent && groupItemsParent.classList.remove('is-loading');
      document.querySelectorAll('.variantPickerMainValues').forEach(group => {group.classList.remove('is-loading')})
    });
});