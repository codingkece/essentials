import { initSearchIndex, searchByName } from "./search.js";

const SAVED_OILS_KEY = "diffuser_selected_oils";
const SAVED_RECIPES_KEY = "diffuser_saved_ids";

export const state = {
  recipes: [],
  oils: [],
  selectedOils: JSON.parse(localStorage.getItem(SAVED_OILS_KEY) || "[]"),
  savedIds: new Set(JSON.parse(localStorage.getItem(SAVED_RECIPES_KEY) || "[]")),
  viewMode: "all",
  searchQuery: "",
  currentPage: 1,
  itemsPerPage: 10,
  filteredRecipes: [],
};

function persistSelectedOils() {
  localStorage.setItem(SAVED_OILS_KEY, JSON.stringify(state.selectedOils));
}

function persistSavedRecipes() {
  localStorage.setItem(SAVED_RECIPES_KEY, JSON.stringify(Array.from(state.savedIds)));
}

export function extractIngredients(valueString) {
  if (!valueString) return [];
  return valueString
    .split(",")
    .map((part) => part.replace(/[0-9]+\s+drops?\s+of\s+/gi, "").trim())
    .filter(Boolean);
}

export function setData(rawRecipes) {
  if (!Array.isArray(rawRecipes)) return;

  const oilSet = new Set();

  state.recipes = rawRecipes.map((r) => {
    const ingredients = extractIngredients(r.value || "");
    ingredients.forEach((oil) => oilSet.add(oil));

    return {
      id: String(r.id),
      name: r.name || r.title || "Unnamed Blend",
      ingredients,
    };
  });

  state.oils = Array.from(oilSet).sort();
  initSearchIndex(state.recipes);
  filterRecipes();
}

export function setSearchQuery(query) {
  state.searchQuery = query;
  state.currentPage = 1;
  filterRecipes();
}

export function setViewMode(mode) {
  if (mode === state.viewMode) return;
  state.viewMode = mode;
  state.currentPage = 1;
  filterRecipes();
}

export function toggleFavorite(recipeId) {
  const idStr = String(recipeId);
  const isSaved = state.savedIds.has(idStr);

  if (isSaved) {
    state.savedIds.delete(idStr);
  } else {
    state.savedIds.add(idStr);
  }

  persistSavedRecipes();

  if (state.viewMode === "saved") {
    filterRecipes();
  }

  return !isSaved;
}

export function isRecipeSaved(recipeId) {
  return state.savedIds.has(String(recipeId));
}

export function toggleOil(oilName) {
  if (state.selectedOils.includes(oilName)) {
    state.selectedOils = state.selectedOils.filter((name) => name !== oilName);
  } else {
    state.selectedOils.push(oilName);
  }

  persistSelectedOils();
  state.currentPage = 1;
  filterRecipes();
}

export function clearAllFilters() {
  state.selectedOils = [];
  state.searchQuery = "";
  persistSelectedOils();
  state.currentPage = 1;
  filterRecipes();
}

export function setPage(page) {
  state.currentPage = page;
}

export function filterRecipes() {
  let pool;

  if (state.viewMode === "saved") {
    // 1. In Saved/Favorites view, show ALL saved blends regardless of oil filters
    pool = state.recipes.filter((recipe) => state.savedIds.has(recipe.id));

    // Allow searching by blend name within favorites if typed
    if (state.searchQuery && state.searchQuery.trim()) {
      const nameSearchResults = searchByName(state.searchQuery);
      if (nameSearchResults !== null) {
        const searchIds = new Set(nameSearchResults.map((r) => r.id));
        pool = pool.filter((recipe) => searchIds.has(recipe.id));
      }
    }
  } else {
    // 2. In "All Blends" view, apply both name search and oil filters
    const nameSearchResults = searchByName(state.searchQuery);
    pool = nameSearchResults !== null ? nameSearchResults : state.recipes;

    if (state.selectedOils.length > 0) {
      pool = pool.filter((recipe) =>
        state.selectedOils.every((oil) => recipe.ingredients.includes(oil))
      );
    }
  }

  state.filteredRecipes = pool;

  const totalPages = Math.max(1, Math.ceil(state.filteredRecipes.length / state.itemsPerPage));
  if (state.currentPage > totalPages) {
    state.currentPage = 1;
  }
}

export function getCurrentPageRecipes() {
  const start = (state.currentPage - 1) * state.itemsPerPage;
  return state.filteredRecipes.slice(start, start + state.itemsPerPage);
}
