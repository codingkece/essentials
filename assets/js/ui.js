import {
  state,
  toggleOil,
  toggleFavorite,
  isRecipeSaved,
  setPage,
  getCurrentPageRecipes,
  updateSavedIdsFromSync,
} from "./state.js";
import {
  signInWithEmail,
  signOutUser,
  getCurrentUser,
  syncFavorites,
} from "./sync.js";

export const elements = {
  grid: document.getElementById("recipe-grid"),
  searchInput: document.getElementById("search-input"),
  clearSearchBtn: document.getElementById("clear-search-btn"),
  oilSelect: document.getElementById("oil-select"),
  filterContainer: document.getElementById("active-filters"),
  pagination: document.getElementById("pagination"),
  resultCount: document.getElementById("result-count"),
  clearFiltersBtn: document.getElementById("clear-filters-btn"),
  savedCounter: document.getElementById("saved-counter"),
  tabAll: document.getElementById("tab-all"),
  tabSaved: document.getElementById("tab-saved"),
  themeToggle: document.getElementById("theme-toggle"),
  authBtn: document.getElementById("auth-btn"),
  modal: document.getElementById("recipe-modal"),
  modalImg: document.getElementById("modal-img"),
  modalTitle: document.getElementById("modal-title"),
  modalFavBtn: document.getElementById("modal-fav-btn"),
  modalShareBtn: document.getElementById("modal-share-btn"),
  modalPrevBtn: document.getElementById("modal-prev-btn"),
  modalNextBtn: document.getElementById("modal-next-btn"),
  closeModal: document.getElementById("close-modal"),
  // Auth dialog elements
  authModal: document.getElementById("auth-modal"),
  closeAuthModal: document.getElementById("close-auth-modal"),
  authForm: document.getElementById("auth-form"),
  authEmail: document.getElementById("auth-email"),
  authPassword: document.getElementById("auth-password"),
  authError: document.getElementById("auth-error"),
  authSuccess: document.getElementById("auth-success"),
  authSubmitBtn: document.getElementById("auth-submit-btn"),
  authUserPanel: document.getElementById("auth-user-panel"),
  authUserEmail: document.getElementById("auth-user-email"),
  authSyncStatus: document.getElementById("auth-sync-status"),
  authSyncNowBtn: document.getElementById("auth-sync-now-btn"),
  authSignoutBtn: document.getElementById("auth-signout-btn"),
};

const HEART_ICON_SVG = `
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
  </svg>
`;

const TRASH_ICON_SVG = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
`;

const SHARE_ICON_SVG = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="18" cy="5" r="3"></circle>
    <circle cx="6" cy="12" r="3"></circle>
    <circle cx="18" cy="19" r="3"></circle>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
  </svg>
`;

const CHECK_ICON_SVG = `
  <svg viewBox="0 0 24 24" fill="none" stroke="#235c43" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
`;

let activeModalRecipe = null;
let currentModalIndex = -1;

function applyFavoriteVisuals(btnEl, isSaved) {
  if (!btnEl) return;
  btnEl.classList.toggle("is-saved", isSaved);
  btnEl.innerHTML = isSaved ? TRASH_ICON_SVG : HEART_ICON_SVG;
  btnEl.title = isSaved ? "Remove from favorites" : "Add to favorites";
  btnEl.setAttribute("aria-label", isSaved ? "Remove from favorites" : "Add to favorites");
}

export function updateModalFavButton(recipeId) {
  applyFavoriteVisuals(elements.modalFavBtn, isRecipeSaved(recipeId));
}

export function handleFavoriteToggle(recipeId, triggeredButton = null) {
  const isNowSaved = toggleFavorite(recipeId);
  renderSavedCounter();

  if (state.viewMode === "saved") {
    renderGrid();
    renderPagination();
    if (elements.modal?.open) {
      const collection = state.filteredRecipes;
      if (collection.length === 0) {
        closeModal();
      } else {
        const nextIndex = Math.min(
          Math.max(0, currentModalIndex),
          collection.length - 1,
        );
        updateModalContent(collection[nextIndex], collection, nextIndex);
      }
    }
    return;
  }

  if (triggeredButton) {
    applyFavoriteVisuals(triggeredButton, isNowSaved);
  } else {
    const cardBtn = elements.grid?.querySelector(
      `.card-action-btn[data-id="${recipeId}"]`,
    );
    if (cardBtn) applyFavoriteVisuals(cardBtn, isNowSaved);
  }

  if (activeModalRecipe && activeModalRecipe.id === String(recipeId)) {
    applyFavoriteVisuals(elements.modalFavBtn, isNowSaved);
  }
}

function updateModalContent(
  recipe,
  collection = state.filteredRecipes,
  index = -1,
) {
  activeModalRecipe = recipe;
  currentModalIndex =
    index >= 0 ? index : collection.findIndex((r) => r.id === recipe?.id);

  if (elements.modalImg) {
    elements.modalImg.src = `images/${recipe.id}.webp`;
    elements.modalImg.alt = recipe.name;
  }
  if (elements.modalTitle) {
    elements.modalTitle.textContent = recipe.name;
  }

  updateModalFavButton(recipe.id);

  const hasMultiple = collection.length > 1;
  if (elements.modalPrevBtn) {
    elements.modalPrevBtn.disabled = !hasMultiple || currentModalIndex <= 0;
  }
  if (elements.modalNextBtn) {
    elements.modalNextBtn.disabled =
      !hasMultiple || currentModalIndex >= collection.length - 1;
  }
}

export function openModal(recipe) {
  if (!recipe) return;
  const collection = state.filteredRecipes;
  const index = collection.findIndex((r) => r.id === recipe.id);
  updateModalContent(recipe, collection, index);
  elements.modal?.showModal();
}

export function closeModal() {
  const lastRecipe = activeModalRecipe;
  elements.modal?.close();
  activeModalRecipe = null;
  currentModalIndex = -1;

  if (!lastRecipe) return;

  const itemIndex = state.filteredRecipes.findIndex(
    (r) => r.id === lastRecipe.id,
  );
  if (itemIndex === -1) return;

  const targetPage = Math.floor(itemIndex / state.itemsPerPage) + 1;
  if (targetPage !== state.currentPage) {
    setPage(targetPage);
    renderAll();
  }

  requestAnimationFrame(() => {
    const cardEl = elements.grid?.querySelector(
      `.card[data-id="${lastRecipe.id}"]`,
    );
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
      cardEl.classList.add("card-highlight");
      setTimeout(() => cardEl.classList.remove("card-highlight"), 1400);
    }
  });
}

export function getActiveModalRecipe() {
  return activeModalRecipe;
}

export function navigateModal(direction) {
  const collection = state.filteredRecipes;
  if (collection.length === 0) return;

  let index = currentModalIndex;
  if (index === -1) {
    index = collection.findIndex((r) => r.id === activeModalRecipe?.id);
  }

  const targetIndex = index + direction;
  if (targetIndex >= 0 && targetIndex < collection.length) {
    updateModalContent(collection[targetIndex], collection, targetIndex);
  }
}

export async function shareCurrentRecipe() {
  const recipe = activeModalRecipe;
  if (!recipe) return;

  const shareText = recipe.value
    ? `${recipe.name} Recipe:\n${recipe.value}`
    : `${recipe.name}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: recipe.name,
        text: shareText,
        url: window.location.href,
      });
      return;
    } catch (err) {
      if (err.name === "AbortError") return;
    }
  }

  try {
    await navigator.clipboard.writeText(
      `${shareText}\n${window.location.href}`,
    );
    if (elements.modalShareBtn) {
      elements.modalShareBtn.innerHTML = CHECK_ICON_SVG;
      elements.modalShareBtn.title = "Copied to clipboard!";
      setTimeout(() => {
        elements.modalShareBtn.innerHTML = SHARE_ICON_SVG;
        elements.modalShareBtn.title = "Share blend";
      }, 2000);
    }
  } catch (error) {
    console.error("Clipboard copy failed:", error);
  }
}

// ============================================================
// AUTH & SYNC UI MODAL
// ============================================================
export function openAuthModal() {
  updateAuthModalView();
  elements.authModal?.showModal();
}

export function closeAuthModal() {
  elements.authModal?.close();
}

export function updateAuthModalView() {
  const user = getCurrentUser();
  if (elements.authBtn) {
    elements.authBtn.classList.toggle("is-authenticated", Boolean(user));
  }

  if (user) {
    if (elements.authForm) elements.authForm.hidden = true;
    if (elements.authUserPanel) elements.authUserPanel.hidden = false;
    if (elements.authUserEmail) elements.authUserEmail.textContent = user.email;
    if (elements.authSyncStatus) {
      elements.authSyncStatus.textContent = "Favorites are synced with cloud.";
    }
  } else {
    if (elements.authForm) elements.authForm.hidden = false;
    if (elements.authUserPanel) elements.authUserPanel.hidden = true;
    if (elements.authError) elements.authError.hidden = true;
    if (elements.authSuccess) elements.authSuccess.hidden = true;
  }
}

export function setupAuthEvents() {
  elements.authBtn?.addEventListener("click", openAuthModal);
  elements.closeAuthModal?.addEventListener("click", closeAuthModal);

  elements.authModal?.addEventListener("click", (e) => {
    if (
      e.target === elements.authModal ||
      e.target.classList.contains("modal-wrapper")
    ) {
      closeAuthModal();
    }
  });

  elements.authForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = elements.authEmail?.value.trim();
    const password = elements.authPassword?.value;

    if (!email || !password) return;

    if (elements.authError) elements.authError.hidden = true;
    if (elements.authSubmitBtn) {
      elements.authSubmitBtn.disabled = true;
      elements.authSubmitBtn.textContent = "Signing In...";
    }

    try {
      await signInWithEmail(email, password);
      if (elements.authPassword) elements.authPassword.value = "";
      updateAuthModalView();
      // Synchronize immediately on login
      await syncFavorites(state.savedIds, (reconciled) => {
        updateSavedIdsFromSync(reconciled);
        renderAll();
      });
      closeAuthModal();
    } catch (err) {
      if (elements.authError) {
        elements.authError.textContent =
          err.message || "Failed to sign in. Please verify your credentials.";
        elements.authError.hidden = false;
      }
    } finally {
      if (elements.authSubmitBtn) {
        elements.authSubmitBtn.disabled = false;
        elements.authSubmitBtn.textContent = "Sign In";
      }
    }
  });

  elements.authSignoutBtn?.addEventListener("click", async () => {
    await signOutUser();
    updateAuthModalView();
  });

  elements.authSyncNowBtn?.addEventListener("click", async () => {
    if (elements.authSyncNowBtn) {
      elements.authSyncNowBtn.disabled = true;
      elements.authSyncNowBtn.textContent = "Syncing...";
    }
    await syncFavorites(state.savedIds, (reconciled) => {
      updateSavedIdsFromSync(reconciled);
      renderAll();
    });
    if (elements.authSyncNowBtn) {
      elements.authSyncNowBtn.disabled = false;
      elements.authSyncNowBtn.textContent = "Synced!";
      setTimeout(() => {
        if (elements.authSyncNowBtn)
          elements.authSyncNowBtn.textContent = "Sync Now";
      }, 1500);
    }
  });
}

export function renderOilOptions() {
  if (!elements.oilSelect) return;
  const fragment = document.createDocumentFragment();

  state.oils.forEach((oil) => {
    const option = document.createElement("option");
    option.value = oil;
    option.textContent = oil;
    fragment.appendChild(option);
  });

  elements.oilSelect.innerHTML =
    '<option value="" disabled selected>Filter by essential oil...</option>';
  elements.oilSelect.appendChild(fragment);
}

export function renderActiveFilters() {
  if (!elements.filterContainer) return;
  elements.filterContainer.innerHTML = "";

  if (state.viewMode === "saved") {
    if (elements.clearFiltersBtn) {
      elements.clearFiltersBtn.hidden = !state.searchQuery;
    }
    return;
  }

  const hasFilters =
    state.selectedOils.length > 0 || Boolean(state.searchQuery);
  if (elements.clearFiltersBtn) elements.clearFiltersBtn.hidden = !hasFilters;

  state.selectedOils.forEach((name) => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.setAttribute("type", "button");
    chip.setAttribute("aria-label", `Remove ${name} filter`);
    chip.innerHTML = `${name} <span aria-hidden="true">&times;</span>`;
    chip.onclick = () => {
      toggleOil(name);
      renderAll();
    };
    elements.filterContainer.appendChild(chip);
  });
}

export function renderSavedCounter() {
  if (elements.savedCounter) {
    elements.savedCounter.textContent = state.savedIds.size;
  }
}

export function renderGrid() {
  if (!elements.grid) return;
  elements.grid.innerHTML = "";

  const total = state.filteredRecipes.length;
  const itemsToShow = getCurrentPageRecipes();

  if (elements.resultCount) {
    if (state.viewMode === "saved") {
      elements.resultCount.textContent = `${total} favorite blend${
        total === 1 ? "" : "s"
      }`;
    } else {
      elements.resultCount.textContent = `${total.toLocaleString()} blend${
        total === 1 ? "" : "s"
      } found`;
    }
  }

  if (itemsToShow.length === 0) {
    const isSavedTab = state.viewMode === "saved";
    elements.grid.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">${isSavedTab ? "🤍" : "🌿"}</span>
        <h3 class="empty-title">${isSavedTab ? "No favorite blends yet" : "No blends found"}</h3>
        <p class="empty-desc">
          ${
            isSavedTab
              ? "Tap the heart icon on any recipe to save it to your library."
              : "Try checking your spelling or clearing filters."
          }
        </p>
      </div>
    `;
    return;
  }

  const fragment = document.createDocumentFragment();

  itemsToShow.forEach((recipe, index) => {
    const isSaved = isRecipeSaved(recipe.id);

    const card = document.createElement("article");
    card.className = "card";
    card.setAttribute("data-id", recipe.id);
    card.style.animationDelay = `${index * 25}ms`;
    card.title = recipe.name;

    const actionBtn = document.createElement("button");
    actionBtn.className = `card-action-btn ${isSaved ? "is-saved" : ""}`;
    actionBtn.setAttribute("type", "button");
    actionBtn.setAttribute("data-id", recipe.id);
    applyFavoriteVisuals(actionBtn, isSaved);

    actionBtn.onclick = (e) => {
      e.stopPropagation();
      handleFavoriteToggle(recipe.id, actionBtn);
    };

    const cardWrapper = document.createElement("div");
    cardWrapper.className = "card-img-wrapper";
    cardWrapper.innerHTML = `
      <img 
        src="images/${recipe.id}.webp" 
        alt="${recipe.name}" 
        class="card-img" 
        loading="lazy" 
        decoding="async">
    `;

    card.appendChild(actionBtn);
    card.appendChild(cardWrapper);
    card.onclick = () => openModal(recipe);
    fragment.appendChild(card);
  });

  elements.grid.appendChild(fragment);
}

export function renderPagination() {
  if (!elements.pagination) return;
  elements.pagination.innerHTML = "";
  const totalPages = Math.ceil(
    state.filteredRecipes.length / state.itemsPerPage,
  );

  if (totalPages <= 1) {
    elements.pagination.style.display = "none";
    return;
  }
  elements.pagination.style.display = "flex";

  const changePage = (newPage) => {
    const target = Math.max(1, Math.min(totalPages, newPage));
    if (target !== state.currentPage) {
      setPage(target);
      renderAll();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const firstBtn = document.createElement("button");
  firstBtn.className = "page-btn page-icon-btn";
  firstBtn.innerHTML = "&laquo;";
  firstBtn.title = "First page";
  firstBtn.setAttribute("aria-label", "First page");
  firstBtn.disabled = state.currentPage === 1;
  firstBtn.onclick = () => changePage(1);

  const prevBtn = document.createElement("button");
  prevBtn.className = "page-btn";
  prevBtn.innerHTML = "<span>&larr;</span> Prev";
  prevBtn.setAttribute("aria-label", "Previous page");
  prevBtn.disabled = state.currentPage === 1;
  prevBtn.onclick = () => changePage(state.currentPage - 1);

  const indicator = document.createElement("div");
  indicator.className = "page-indicator";

  const pageInput = document.createElement("input");
  pageInput.type = "number";
  pageInput.min = "1";
  pageInput.max = String(totalPages);
  pageInput.value = String(state.currentPage);
  pageInput.className = "page-jump-input";
  pageInput.title = "Jump to page";
  pageInput.setAttribute(
    "aria-label",
    `Current page ${state.currentPage} of ${totalPages}`,
  );

  pageInput.onchange = () => {
    const val = parseInt(pageInput.value, 10);
    if (!isNaN(val)) changePage(val);
  };
  pageInput.onkeydown = (e) => {
    if (e.key === "Enter") pageInput.blur();
  };

  const totalText = document.createElement("span");
  totalText.textContent = ` of ${totalPages.toLocaleString()}`;

  indicator.append(pageInput, totalText);

  const nextBtn = document.createElement("button");
  nextBtn.className = "page-btn";
  nextBtn.innerHTML = "Next <span>&rarr;</span>";
  nextBtn.setAttribute("aria-label", "Next page");
  nextBtn.disabled = state.currentPage === totalPages;
  nextBtn.onclick = () => changePage(state.currentPage + 1);

  const lastBtn = document.createElement("button");
  lastBtn.className = "page-btn page-icon-btn";
  lastBtn.innerHTML = "&raquo;";
  lastBtn.title = "Last page";
  lastBtn.setAttribute("aria-label", "Last page");
  lastBtn.disabled = state.currentPage === totalPages;
  lastBtn.onclick = () => changePage(totalPages);

  elements.pagination.append(firstBtn, prevBtn, indicator, nextBtn, lastBtn);
}

export function renderTabs() {
  const isSaved = state.viewMode === "saved";
  if (elements.tabSaved) elements.tabSaved.classList.toggle("active", isSaved);
  if (elements.tabAll) elements.tabAll.classList.toggle("active", !isSaved);
}

export function renderAll() {
  renderTabs();
  renderActiveFilters();
  renderSavedCounter();
  renderGrid();
  renderPagination();
}
