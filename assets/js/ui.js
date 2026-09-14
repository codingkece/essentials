import {
  state,
  toggleOil,
  toggleFavorite,
  isRecipeSaved,
  setPage,
  getCurrentPageRecipes,
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
  exportBtn: document.getElementById("export-btn"),
  modal: document.getElementById("recipe-modal"),
  modalImg: document.getElementById("modal-img"),
  modalTitle: document.getElementById("modal-title"),
  modalFavBtn: document.getElementById("modal-fav-btn"),
  modalShareBtn: document.getElementById("modal-share-btn"),
  modalPrevBtn: document.getElementById("modal-prev-btn"),
  modalNextBtn: document.getElementById("modal-next-btn"),
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
  btnEl.title = isSaved ? "Remove" : "Save";
  btnEl.setAttribute("aria-label", isSaved ? "Remove" : "Save");
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
          collection.length - 1
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
      `.card-action-btn[data-id="${recipeId}"]`
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
  index = -1
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

/**
 * Closes modal and navigates to the page where the recipe belongs,
 * scrolling directly to the item so the user doesn't have to scroll again.
 */
export function closeModal() {
  const lastRecipe = activeModalRecipe;

  elements.modal?.close();
  activeModalRecipe = null;
  currentModalIndex = -1;

  if (!lastRecipe) return;

  const itemIndex = state.filteredRecipes.findIndex((r) => r.id === lastRecipe.id);
  if (itemIndex === -1) return;

  const targetPage = Math.floor(itemIndex / state.itemsPerPage) + 1;

  if (targetPage !== state.currentPage) {
    setPage(targetPage);
    renderAll();
  }

  // Smoothly center the card in viewport
  requestAnimationFrame(() => {
    const cardEl = elements.grid?.querySelector(`.card[data-id="${lastRecipe.id}"]`);
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

/**
 * Navigates across the ENTIRE collection of search/filter results
 */
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
    await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
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

/**
 * Exports favorites with images linked via absolute URLs & clickable anchors
 */
export function exportFavoritesAsHtml() {
  const savedRecipes = state.recipes.filter((r) => state.savedIds.has(r.id));

  if (savedRecipes.length === 0) {
    alert("You haven't saved any favorites yet. Save some blends first to export them!");
    return;
  }

  const recipeCardsHtml = savedRecipes
    .map((r) => {
      // Resolve absolute URL so images load regardless of where the HTML file is saved
      const absoluteImgUrl = new URL(`images/${r.id}.webp`, window.location.href).href;

      const ingredientList = (r.value || r.ingredients.join(", "))
        .split(",")
        .map((item) => `<li>${item.trim()}</li>`)
        .join("");

      return `
      <article class="card">
        <div class="card-img-wrap">
          <a href="${absoluteImgUrl}" target="_blank" rel="noopener noreferrer" title="View full image">
            <img src="${absoluteImgUrl}" alt="${r.name}" loading="lazy" onerror="this.parentElement.style.display='none'">
          </a>
        </div>
        <div class="card-body">
          <h2>${r.name}</h2>
          <ul class="ingredients">
            ${ingredientList}
          </ul>
        </div>
      </article>
      `;
    })
    .join("\n");

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Favorite Diffuser Blends</title>
  <style>
    :root {
      --primary: #235c43;
      --bg: #f8faf9;
      --card-bg: #ffffff;
      --text: #111815;
      --text-muted: #566760;
      --border: rgba(0,0,0,0.1);
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0b0f0d;
        --card-bg: #121815;
        --text: #f2f5f3;
        --text-muted: #90a198;
        --border: rgba(255,255,255,0.1);
      }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 2rem 1.5rem;
    }
    .header {
      max-width: 960px;
      margin: 0 auto 2rem;
      border-bottom: 2px solid var(--border);
      padding-bottom: 1rem;
    }
    h1 { margin: 0 0 0.25rem; color: var(--primary); }
    .subtitle { color: var(--text-muted); font-size: 0.9rem; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.5rem;
      max-width: 960px;
      margin: 0 auto;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      break-inside: avoid;
    }
    .card-img-wrap {
      width: 100%;
      aspect-ratio: 1/1;
      background: rgba(0,0,0,0.05);
    }
    .card-img-wrap a {
      display: block;
      width: 100%;
      height: 100%;
    }
    .card-img-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.2s ease;
    }
    .card-img-wrap a:hover img {
      transform: scale(1.02);
    }
    .card-body { padding: 1.2rem; }
    .card-body h2 { font-size: 1.15rem; margin: 0 0 0.75rem; }
    .ingredients { margin: 0; padding-left: 1.25rem; color: var(--text-muted); line-height: 1.5; }
    @media print {
      body { background: #ffffff; color: #000000; padding: 0; }
      .grid { grid-template-columns: repeat(2, 1fr); gap: 1rem; }
      .card { box-shadow: none; border: 1px solid #ccc; }
    }
  </style>
</head>
<body>
  <header class="header">
    <h1>My Favorite Diffuser Blends</h1>
    <p class="subtitle">Exported on ${new Date().toLocaleDateString()} &bull; ${savedRecipes.length} Blend${savedRecipes.length === 1 ? "" : "s"}</p>
  </header>
  <main class="grid">
    ${recipeCardsHtml}
  </main>
</body>
</html>`;

  const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `diffuser-favorites-${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
  const itemsToShow = getCurrentPageRecipes();

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
    card.setAttribute("data-id", recipe.id); // Used for smooth-scroll on modal close
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
    state.filteredRecipes.length / state.itemsPerPage
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
    `Current page ${state.currentPage} of ${totalPages}`
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