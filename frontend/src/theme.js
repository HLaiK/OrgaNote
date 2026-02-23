export const theme = {
  colors: {
    // Main background
    background: "#A7C4A0",

    // White panels with hand‑drawn vibe
    panel: "#FFFFFF",
    outline: "#FFFFFF",

    // Text colors
    textDark: "#2A2A2A",
    textLight: "#FFFFFF",

    // Accent colors
    accent: "#4A90E2",

    // Task priority colors
    high: "#E57373",
    medium: "#FFB74D",
    low: "#81C784",

    // Misc UI colors
    delete: "#E57373",
    checkbox: "#81C784",
    border: "#E0DED9",
  },

  // Rounded corners
  radius: "18px",

  // White outline glow around panels
  shadow: "0 0 0 3px rgba(255,255,255,0.4)",

  // Panel border thickness
  outlineWidth: "3px",
};

export const THEME_STORAGE_KEY = "organote_theme";

export function applySavedTheme() {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    console.log(
      "[applySavedTheme] Found organote_theme in localStorage:",
      !!raw,
    );
    if (!raw) {
      console.log("[applySavedTheme] No saved theme found");
      return;
    }
    const saved = JSON.parse(raw);
    console.log("[applySavedTheme] Parsed theme:", saved);
    if (saved.background) {
      console.log("[applySavedTheme] Applying background:", saved.background);
      document.documentElement.style.setProperty(
        "--bg-color",
        saved.background,
      );
      // Also apply directly to body as backup
      document.body.style.background = saved.background;
      console.log(
        "[applySavedTheme] Also applied directly to body.style.background",
      );
    }
    if (saved.button) {
      document.documentElement.style.setProperty("--btn-color", saved.button);
      document.documentElement.style.setProperty(
        "--scroll-thumb",
        saved.button,
      );
    }
    if (saved.text) {
      document.documentElement.style.setProperty("--text-color", saved.text);
    }
  } catch (e) {
    // ignore
  }
}

export function saveTheme(themeObj) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(themeObj));
  } catch (e) {
    // ignore
  }
}
