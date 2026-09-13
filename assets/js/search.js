import FuseModule from "./fuse.js";

const Fuse = FuseModule.default || FuseModule;

let fuseInstance = null;

export function initSearchIndex(recipes) {
  fuseInstance = new Fuse(recipes, {
    keys: ["name"],
    threshold: 0.4,
    ignoreLocation: true,
    minMatchCharLength: 1,
  });
}

export function searchByName(query) {
  const trimmed = query?.trim();
  if (!fuseInstance || !trimmed) return null;

  return fuseInstance.search(trimmed).map((result) => result.item);
}
