const fs = require('fs');

// 1. Load data
const rawData = require('./recipes.json');
console.log(`Processing ${rawData.length} recipes...`);

// 2. Create the "Dictionary" (Unique list of oils)
const allIngredients = new Set();

// Reuse your extraction logic
function extractIngredients(valueString) {
  if (!valueString) return [];
  return valueString.split(",")
    .map((part) => part.replace(/[0-9]+\s+drops?\s+of\s+/gi, "").trim())
    .filter(Boolean);
}

rawData.forEach(r => {
  const ingredients = extractIngredients(r.value);
  ingredients.forEach(i => allIngredients.add(i));
});

// Sort oils alphabetically so index 0 is always the same
const oilsList = Array.from(allIngredients).sort();

// Create a map for fast lookups: "Lavender" -> 5
const oilMap = new Map(oilsList.map((oil, index) => [oil, index]));

// 3. Compress Recipes
// Format: [ "id_string", [oil_index_1, oil_index_2] ]
const compressedRecipes = rawData.map(r => {
  const ingredients = extractIngredients(r.value);
  // Convert strings to numbers
  const indices = ingredients.map(name => oilMap.get(name));
  return [r.id, indices]; 
});

// 4. Output the new structure
const output = {
  oils: oilsList,     // The Legend
  data: compressedRecipes // The Compressed Data
};

fs.writeFileSync('./recipes.min.json', JSON.stringify(output));

console.log(`Compressed! Dictionary size: ${oilsList.length} oils.`);
console.log(`Recipe count: ${compressedRecipes.length}`);