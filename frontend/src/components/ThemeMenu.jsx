import { useEffect, useState } from "react";
import { ToolOutlined } from "@ant-design/icons";

const STORAGE_KEY = "organote_theme";

export default function ThemeMenu() {
  const [open, setOpen] = useState(false);
  const [bgColor, setBgColor] = useState("");
  const [btnColor, setBtnColor] = useState("");
  const [textColor, setTextColor] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.background) {
          setBgColor(saved.background);
          document.documentElement.style.setProperty("--bg-color", saved.background);
        }
        if (saved.button) {
          setBtnColor(saved.button);
          document.documentElement.style.setProperty("--btn-color", saved.button);
          document.documentElement.style.setProperty("--scroll-thumb", saved.button);
        }
        if (saved.text) {
          setTextColor(saved.text);
          document.documentElement.style.setProperty("--text-color", saved.text);
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  function saveTheme(background, button) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const current = raw ? JSON.parse(raw) : {};
      // only overwrite keys that are explicitly provided (not undefined)
      if (background !== undefined && background !== null) current.background = background;
      if (button !== undefined && button !== null) current.button = button;
      const text = document.documentElement.style.getPropertyValue('--text-color') || textColor || '';
      if (text !== undefined && text !== null) current.text = text;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch (e) {
      // ignore storage errors
    }
  }

  function onBgChange(e) {
    const color = e.target.value;
    setBgColor(color);
    document.documentElement.style.setProperty("--bg-color", color);
    saveTheme(color, btnColor);
  }

  function onBtnChange(e) {
    const color = e.target.value;
    setBtnColor(color);
    document.documentElement.style.setProperty("--btn-color", color);
    document.documentElement.style.setProperty("--scroll-thumb", color);
    saveTheme(bgColor, color);
  }

  return (
    <>
      <div id="settingsIcon" onClick={() => setOpen(!open)}>
        <ToolOutlined />
      </div>

      <div className={`color-menu ${open ? "show" : ""}`}>
        <h3>Customize Theme</h3>

        <label>Background Color:</label>
        <input type="color" value={bgColor} onChange={onBgChange} />

        <label>Button Color:</label>
        <input type="color" value={btnColor} onChange={onBtnChange} />
        
        <label style={{ marginTop: '10px' }}>Text Color:</label>
        <input
          type="color"
          value={textColor || document.documentElement.style.getPropertyValue('--text-color') || '#000000'}
          onChange={(e) => {
            const c = e.target.value;
            setTextColor(c);
            document.documentElement.style.setProperty('--text-color', c);
            saveTheme(bgColor, btnColor);
          }}
        />
      </div>
    </>
  );
}
