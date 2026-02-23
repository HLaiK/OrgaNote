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

function sanitizeGradient(gradientStr) {
  if (!gradientStr || !gradientStr.includes("linear-gradient")) {
    return null;
  }
  try {
    // Extract colors using regex - be more flexible about the format
    const match = gradientStr.match(
      /linear-gradient\s*\([^,]+,\s*([#\w]+)[^,]*,\s*([#\w]+)[^)]*\)/,
    );
    if (match) {
      const color1 = match[1].trim();
      const color2 = match[2].trim();
      // Reconstruct a clean gradient
      return `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
    }
  } catch (e) {
    console.error("[theme.js] Error sanitizing gradient:", e);
  }
  return null;
}

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
    let saved = JSON.parse(raw);
    console.log("[applySavedTheme] Parsed theme:", saved);

    // Sanitize malformed gradients
    if (saved.background && saved.background.includes("linear-gradient")) {
      const sanitized = sanitizeGradient(saved.background);
      if (sanitized) {
        console.log("[applySavedTheme] Fixed malformed gradient");
        saved.background = sanitized;
        // Update the saved theme with the fixed version
        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(saved));
      }
    }

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
    } else {
      // Default to a neutral color that works on most backgrounds
      document.documentElement.style.setProperty("--btn-color", "#4A90E2");
      document.documentElement.style.setProperty("--scroll-thumb", "#4A90E2");
    }
    if (saved.text) {
      document.documentElement.style.setProperty("--text-color", saved.text);
    } else {
      // If no text color saved, use dark text which works on most backgrounds
      document.documentElement.style.setProperty("--text-color", "#2A2A2A");
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
