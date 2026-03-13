import { setData, toggleOil } from "./modules/state.js";
import { renderOilOptions, renderAll } from "./modules/ui.js";

const countEl = document.getElementById("result-count");

document.getElementById("oil-select").addEventListener("change", (e) => {
  if (e.target.value) {
    toggleOil(e.target.value);
    renderAll();
    e.target.value = "";
  }
});

async function init() {
  try {
    countEl.textContent = "Loading...";

    const response = await fetch("./recipes.min.json");

    const data = await response.json();

    setData(data);

    renderOilOptions();
    renderAll();
  } catch (error) {
    console.error(error);
    countEl.textContent = "Error loading recipes";
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
