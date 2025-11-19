import { useState } from "react";

export default function ThemeMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div id="settingsIcon" onClick={() => setOpen(!open)}>
        ⚙️
      </div>

      <div className={`color-menu ${open ? "show" : ""}`}>
        <h3>Customize Theme</h3>

        <label>Background Color:</label>
        <input
          type="color"
          onChange={(e) => {
            document.body.style.background = e.target.value;
          }}
        />

        <label>Button Color:</label>
        <input
          type="color"
          onChange={(e) => {
            const color = e.target.value;
            document
              .querySelectorAll(".btn-primary, .btn-add-task")
              .forEach((btn) => (btn.style.background = color));
          }}
        />
      </div>
    </>
  );
}
