import {
  state,
  toggleOil,
  toggleFavorite,
  isRecipeSaved,
  setPage,
} from "./state.js";

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
  modal: document.getElementById("recipe-modal"),
  modalImg: document.getElementById("modal-img"),
  modalTitle: document.getElementById("modal-title"),
  modalFavBtn: document.getElementById("modal-fav-btn"),
  closeModal: document.getElementById("close-modal"),
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

let activeModalRecipe = null;

function applyFavoriteVisuals(btnEl, isSaved) {
  if (!btnEl) return;
  btnEl.classList.toggle("is-saved", isSaved);
  btnEl.innerHTML = isSaved ? TRASH_ICON_SVG : HEART_ICON_SVG;
  btnEl.title = isSaved ? "Remove" : "Save";
  btnEl.setAttribute("aria-label", isSaved ? "Remove" : "Save");
}

export function updateModalFavButton(recipeId) {
  applyFavoriteVisuals(elements.modalFavBtn, isRecipeSaved(recipeId));
}

export function handleFavoriteToggle(recipeId, triggeredButton = null) {
  const isNowSaved = toggleFavorite(recipeId);
  renderSavedCounter();

  // If in "saved" view, re-render to reflect removal
  if (state.viewMode === "saved") {
    renderGrid();
    renderPagination();
    return;
  }

  // Otherwise, surgically update matching DOM buttons with NO layout redraw
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

export function openModal(recipe) {
  activeModalRecipe = recipe;

  if (elements.modalImg) {
    elements.modalImg.src = `assets/images/${recipe.id}.webp`;
    elements.modalImg.alt = recipe.name;
  }
  if (elements.modalTitle) {
    elements.modalTitle.textContent = recipe.name;
  }

  updateModalFavButton(recipe.id);
  elements.modal?.showModal();
}

export function closeModal() {
  elements.modal?.close();
}

export function getActiveModalRecipe() {
  return activeModalRecipe;
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

  // Oil filter chips only apply in the "All Blends" view
  if (state.viewMode === "saved") {
    if (elements.clearFiltersBtn) {
      elements.clearFiltersBtn.hidden = !state.searchQuery;
    }
    return;
  }

  const hasFilters = state.selectedOils.length > 0 || Boolean(state.searchQuery);
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
  const start = (state.currentPage - 1) * state.itemsPerPage;
  const end = start + state.itemsPerPage;
  const itemsToShow = state.filteredRecipes.slice(start, end);

  if (elements.resultCount) {
    if (state.viewMode === "saved") {
      elements.resultCount.textContent = `${total} saved blend${total === 1 ? "" : "s"}`;
    } else {
      elements.resultCount.textContent = `${total.toLocaleString()} blend${total === 1 ? "" : "s"} found`;
    }
  }

  if (itemsToShow.length === 0) {
    const isSavedTab = state.viewMode === "saved";
    elements.grid.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">${isSavedTab ? "🤍" : "🌿"}</span>
        <h3 class="empty-title">${isSavedTab ? "No saved blends yet" : "No blends found"}</h3>
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
        src="assets/images/${recipe.id}.webp" 
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

export function renderAll() {
  renderActiveFilters();
  renderSavedCounter();
  renderGrid();
  renderPagination();
}
