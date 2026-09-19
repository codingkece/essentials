import { loadSavedIdsFromLocal, persistFavoriteLocal } from "./sync.js";

const SAVED_OILS_KEY = "diffuser_selected_oils";
const SAVED_RECIPES_KEY = "diffuser_saved_ids";
const VIEW_MODE_KEY = "diffuser_view_mode";

function getInitialViewMode() {
  const savedMode = localStorage.getItem(VIEW_MODE_KEY);
  if (savedMode === "saved" || savedMode === "all") {
    return savedMode;
  }
  if (
    window.location.hash === "#favorites" ||
    window.location.hash === "#saved"
  ) {
    return "saved";
  }
  return "all";
}

export const state = {
  recipes: [],
  oils: [],
  oilCounts: {},
  selectedOils: JSON.parse(localStorage.getItem(SAVED_OILS_KEY) || "[]"),
  savedIds: new Set(
    JSON.parse(localStorage.getItem(SAVED_RECIPES_KEY) || "[]"),
  ),
  viewMode: getInitialViewMode(),
  currentPage: 1,
  itemsPerPage: 10,
  filteredRecipes: [],
};

export async function initSavedFavorites() {
  try {
    const ids = await loadSavedIdsFromLocal();
    state.savedIds = ids;
    if (state.viewMode === "saved") {
      filterRecipes();
    }
  } catch (e) {
    console.warn("Failed to initialize favorites from Dexie:", e);
  }
}

export function updateSavedIdsFromSync(newIdSet) {
  state.savedIds = newIdSet;
  persistSavedRecipes();
  if (state.viewMode === "saved") {
    filterRecipes();
  }
}

function persistSelectedOils() {
  localStorage.setItem(SAVED_OILS_KEY, JSON.stringify(state.selectedOils));
}

function persistSavedRecipes() {
  localStorage.setItem(
    SAVED_RECIPES_KEY,
    JSON.stringify(Array.from(state.savedIds)),
  );
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
  const counts = {};

  state.recipes = rawRecipes.map((r) => {
    const ingredients = extractIngredients(r.value || "");
    ingredients.forEach((oil) => {
      oilSet.add(oil);
      counts[oil] = (counts[oil] || 0) + 1;
    });

    return {
      id: String(r.id),
      name: r.name || r.title || "Unnamed Blend",
      ingredients,
      value: r.value || "",
    };
  });

  state.oils = Array.from(oilSet).sort((a, b) => a.localeCompare(b));
  state.oilCounts = counts;
  filterRecipes();
}

export function setViewMode(mode) {
  if (mode === state.viewMode) return;
  state.viewMode = mode;
  localStorage.setItem(VIEW_MODE_KEY, mode);
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
  persistFavoriteLocal(idStr, !isSaved);

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
    // Favorites screen shows all saved recipes without oil filtering
    pool = state.recipes.filter((recipe) => state.savedIds.has(recipe.id));
  } else {
    pool = state.recipes;
    if (state.selectedOils.length > 0) {
      pool = pool.filter((recipe) =>
        state.selectedOils.every((oil) => recipe.ingredients.includes(oil)),
      );
    }
  }

  state.filteredRecipes = pool;

  const totalPages = Math.max(
    1,
    Math.ceil(state.filteredRecipes.length / state.itemsPerPage),
  );
  if (state.currentPage > totalPages) {
    state.currentPage = 1;
  }
}

export function getCurrentPageRecipes() {
  const start = (state.currentPage - 1) * state.itemsPerPage;
  return state.filteredRecipes.slice(start, start + state.itemsPerPage);
}
