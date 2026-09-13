import { initTheme } from "./theme.js";
import {
  setData,
  toggleOil,
  setSearchQuery,
  setViewMode,
  clearAllFilters,
} from "./state.js";
import {
  elements,
  renderOilOptions,
  renderAll,
  closeModal,
  getActiveModalRecipe,
  handleFavoriteToggle,
} from "./ui.js";

function setupEventListeners() {
  elements.searchInput?.addEventListener("input", (e) => {
    const query = e.target.value;
    if (elements.clearSearchBtn) elements.clearSearchBtn.hidden = !query;
    setSearchQuery(query);
    renderAll();
  });

  elements.clearSearchBtn?.addEventListener("click", () => {
    if (elements.searchInput) {
      elements.searchInput.value = "";
      elements.searchInput.focus();
    }
    elements.clearSearchBtn.hidden = true;
    setSearchQuery("");
    renderAll();
  });

  elements.oilSelect?.addEventListener("change", (e) => {
    if (e.target.value) {
      toggleOil(e.target.value);
      renderAll();
      e.target.value = "";
    }
  });

  elements.clearFiltersBtn?.addEventListener("click", () => {
    if (elements.searchInput) elements.searchInput.value = "";
    if (elements.clearSearchBtn) elements.clearSearchBtn.hidden = true;
    clearAllFilters();
    renderAll();
  });

  elements.tabAll?.addEventListener("click", () => {
    elements.tabAll.classList.add("active");
    elements.tabSaved?.classList.remove("active");
    setViewMode("all");
    renderAll();
  });

  elements.tabSaved?.addEventListener("click", () => {
    elements.tabSaved.classList.add("active");
    elements.tabAll?.classList.remove("active");
    setViewMode("saved");
    renderAll();
  });

  elements.closeModal?.addEventListener("click", closeModal);

  elements.modal?.addEventListener("click", (e) => {
    if (
      e.target === elements.modal ||
      e.target.classList.contains("modal-wrapper")
    ) {
      closeModal();
    }
  });

  elements.modalFavBtn?.addEventListener("click", () => {
    const recipe = getActiveModalRecipe();
    if (!recipe) return;
    handleFavoriteToggle(recipe.id);
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && elements.modal?.open) {
      closeModal();
    }
  });
}

async function init() {
  try {
    initTheme(elements.themeToggle);
    setupEventListeners();

    if (elements.resultCount) {
      elements.resultCount.textContent = "Loading blend collection...";
    }

    const response = await fetch("./recipes.json");
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const recipes = await response.json();
    setData(recipes);

    renderOilOptions();
    renderAll();
  } catch (error) {
    console.error("Initialization error:", error);
    if (elements.resultCount) {
      elements.resultCount.textContent =
        "Could not load blends. Please verify recipes.json exists.";
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
