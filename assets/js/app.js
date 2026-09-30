import {
  setData,
  setViewMode,
  clearAllFilters,
  setSortMode,
  initSavedFavorites,
  updateSavedIdsFromSync,
  filterRecipes,
  state,
} from "./state.js";
import {
  elements,
  renderOilOptions,
  renderAll,
  closeModal,
  getActiveModalRecipe,
  handleFavoriteToggle,
  navigateModal,
  shareCurrentRecipe,
  setupAuthEvents,
  setupOilComboboxEvents,
  setupSortEvents,
  updateAuthModalView,
} from "./ui.js";
import {
  getSupabase,
  onAuthChange,
  syncFavorites,
  flushQueue,
  onCrossTabFavoriteUpdate,
} from "./sync.js";

function setupEventListeners() {
  setupOilComboboxEvents();
  setupSortEvents();

  elements.clearFiltersBtn?.addEventListener("click", () => {
    if (elements.oilSearchInput) elements.oilSearchInput.value = "";
    if (elements.clearOilInputBtn) elements.clearOilInputBtn.hidden = true;
    clearAllFilters();
    setSortMode("default");
    renderAll();
  });

  elements.clearFiltersBtn?.addEventListener("click", () => {
    if (elements.oilSearchInput) elements.oilSearchInput.value = "";
    if (elements.clearOilInputBtn) elements.clearOilInputBtn.hidden = true;
    clearAllFilters();
    renderAll();
  });

  elements.tabAll?.addEventListener("click", () => {
    setViewMode("all");
    renderAll();
  });

  elements.tabSaved?.addEventListener("click", () => {
    setViewMode("saved");
    renderAll();
  });

  // Modal navigation
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

  elements.modalPrevBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    navigateModal(-1);
  });

  elements.modalNextBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    navigateModal(1);
  });

  elements.modalShareBtn?.addEventListener("click", shareCurrentRecipe);

  window.addEventListener("keydown", (e) => {
    if (!elements.modal?.open) return;

    if (e.key === "Escape") {
      closeModal();
    } else if (e.key === "ArrowLeft") {
      navigateModal(-1);
    } else if (e.key === "ArrowRight") {
      navigateModal(1);
    }
  });

  // Re-sync when network returns
  window.addEventListener("online", async () => {
    await flushQueue();
    await syncFavorites(state.savedIds, (reconciled) => {
      updateSavedIdsFromSync(reconciled);
      renderAll();
    });
  });

  // Real-time synchronization across browser tabs
  onCrossTabFavoriteUpdate(({ recipeId, isSaved }) => {
    if (isSaved) {
      state.savedIds.add(String(recipeId));
    } else {
      state.savedIds.delete(String(recipeId));
    }
    if (state.viewMode === "saved") {
      filterRecipes();
    }
    renderAll();
  });

  window.addEventListener("storage", (e) => {
    if (e.key === "diffuser_saved_ids" && e.newValue) {
      try {
        const ids = new Set(JSON.parse(e.newValue));
        updateSavedIdsFromSync(ids);
        renderAll();
      } catch (err) {
        console.warn("Storage sync parse error:", err);
      }
    }
  });

  setupAuthEvents();
}

async function init() {
  try {
    setupEventListeners();

    if (elements.resultCount) {
      elements.resultCount.textContent = "Loading blend collection...";
    }

    // 1. Load favorites from Dexie
    await initSavedFavorites();

    // 2. Fetch recipes collection
    const response = await fetch("./recipes.json");
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const recipes = await response.json();
    setData(recipes);

    renderOilOptions();
    renderAll();

    // 3. Connect Supabase & reconcile cloud state
    await getSupabase();
    updateAuthModalView();

    onAuthChange(async (user) => {
      updateAuthModalView();
      if (user) {
        await syncFavorites(state.savedIds, (reconciled) => {
          updateSavedIdsFromSync(reconciled);
          renderAll();
        });
      }
    });

    await syncFavorites(state.savedIds, (reconciled) => {
      updateSavedIdsFromSync(reconciled);
      renderAll();
    });
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
