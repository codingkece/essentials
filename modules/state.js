const savedOils = localStorage.getItem("diffuser_selected_indices");

export const state = {
  // Store the raw array data [[id, [1,2]], ...]
  recipes: [], 
  // Store the "Legend" ["Lavender", "Lemon", ...]
  oilLegend: [], 
  // Store selected INDICES (e.g. [5, 20]) instead of names
  selectedIndices: savedOils ? JSON.parse(savedOils) : [],
  currentPage: 1,
  itemsPerPage: 12,
  filteredRecipes: [],
};

function saveState() {
  localStorage.setItem(
    "diffuser_selected_indices",
    JSON.stringify(state.selectedIndices),
  );
}

export function setData(data) {
  state.recipes = data.data;
  state.oilLegend = data.oils;
  filterRecipes();
}

export function toggleOil(oilName) {
  // Find the index of the oil name
  const index = state.oilLegend.indexOf(oilName);
  if (index === -1) return;

  if (state.selectedIndices.includes(index)) {
    state.selectedIndices = state.selectedIndices.filter((i) => i !== index);
  } else {
    state.selectedIndices.push(index);
  }
  
  saveState();
  state.currentPage = 1;
  filterRecipes();
}

export function setPage(page) {
  state.currentPage = page;
}

function filterRecipes() {
  if (state.selectedIndices.length === 0) {
    state.filteredRecipes = state.recipes;
  } else {
    state.filteredRecipes = state.recipes.filter((recipe) => {
      // recipe[1] is the array of ingredient indices
      return state.selectedIndices.every((selectedIndex) =>
        recipe[1].includes(selectedIndex),
      );
    });
  }
}