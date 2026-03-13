import { state, toggleOil, setPage } from "./state.js";

const grid = document.getElementById("recipe-grid");
const oilSelect = document.getElementById("oil-select");
const filterContainer = document.getElementById("active-filters");
const pagination = document.getElementById("pagination");
const resultCount = document.getElementById("result-count");
const modal = document.getElementById("recipe-modal");
const modalImg = document.getElementById("modal-img");
const closeModal = document.getElementById("close-modal");

closeModal.onclick = () => modal.close();
modal.onclick = (e) => {
  if (e.target === document.querySelector(".modal-wrapper")) modal.close();
};

function openModal(recipe) {
  const id = recipe[0];
  modalImg.src = `images/${id}.webp`;
  modalImg.alt = id;
  modal.showModal();
}

export function renderOilOptions() {
  const fragment = document.createDocumentFragment();
  state.oilLegend.forEach((oil) => {
    const option = document.createElement("option");
    option.value = oil;
    option.textContent = oil;
    fragment.appendChild(option);
  });
  oilSelect.innerHTML =
    '<option value="" disabled selected>Add an oil to filter...</option>';
  oilSelect.appendChild(fragment);
}

export function renderActiveFilters() {
  filterContainer.innerHTML = "";
  state.selectedIndices.forEach((index) => {
    // Convert index back to name for display
    const name = state.oilLegend[index];
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.innerHTML = `${name} <span>&times;</span>`;
    chip.onclick = () => {
      toggleOil(name);
      renderAll();
    };
    filterContainer.appendChild(chip);
  });
}

export function renderGrid() {
  grid.innerHTML = "";
  const start = (state.currentPage - 1) * state.itemsPerPage;
  const end = start + state.itemsPerPage;
  const itemsToShow = state.filteredRecipes.slice(start, end);

  resultCount.textContent = `${state.filteredRecipes.length.toLocaleString()} recipes found`;

  if (itemsToShow.length === 0) {
    grid.innerHTML =
      '<p style="grid-column:1/-1; text-align:center; padding:2rem; color:var(--text-secondary)">No recipes found.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();

  itemsToShow.forEach((recipe, index) => {
    const card = document.createElement("div");
    card.className = "card";
    // recipe is ["id", [ingredients]]
    card.onclick = () => openModal(recipe);

    const isLCP = index < 2;
    const loading = isLCP ? "eager" : "lazy";
    const priority = isLCP ? 'fetchpriority="high"' : "";

    card.innerHTML = `
      <div class="card-img-wrapper">
        <img 
          src="images/${recipe[0]}.webp" 
          alt="${recipe[0]}" 
          class="card-img" 
          loading="${loading}" 
          ${priority}
          width="200" height="200"
          decoding="async">
      </div>`;
    fragment.appendChild(card);
  });
  grid.appendChild(fragment);
}

export function renderPagination() {
  pagination.innerHTML = "";
  const totalPages = Math.ceil(
    state.filteredRecipes.length / state.itemsPerPage,
  );
  if (totalPages <= 1) return;

  const prevBtn = document.createElement("button");
  prevBtn.className = "page-btn";
  prevBtn.textContent = "← Prev";
  prevBtn.disabled = state.currentPage === 1;
  prevBtn.onclick = () => {
    setPage(state.currentPage - 1);
    renderAll();
    window.scrollTo(0, 0);
  };

  const nextBtn = document.createElement("button");
  nextBtn.className = "page-btn";
  nextBtn.textContent = "Next →";
  nextBtn.disabled = state.currentPage === totalPages;
  nextBtn.onclick = () => {
    setPage(state.currentPage + 1);
    renderAll();
    window.scrollTo(0, 0);
  };

  pagination.append(prevBtn, nextBtn);
}

export function renderAll() {
  renderActiveFilters();
  renderGrid();
  renderPagination();
}
