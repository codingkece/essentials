const THEME_KEY = "diffuser_theme";

export function initTheme(toggleButtonEl) {
  if (!toggleButtonEl) return;

  toggleButtonEl.onclick = () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem(THEME_KEY, nextTheme);
  };
}
