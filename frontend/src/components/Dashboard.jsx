import React, { useState } from "react";
import CalendarPanel from "./CalendarPanel";
import ProgressPanel from "./ProgressPanel";
import TasksPanel from "./TasksPanel";
import UnstructuredInput from "./UnstructuredInputPanel";
import { theme } from "../theme";

const styles = {
  container: {
    display: "grid",
    gridTemplateColumns: "250px 1fr",
    gridTemplateRows: "1fr",
    gap: "20px",
    padding: "20px",
    height: "100vh",
    background: theme.colors.background,
    overflowY: "auto",
    overflowX: "hidden"
  },

  sidebar: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    gridRow: "1",
    gridColumn: "1",
  },

  panel: {
    background: "rgba(255,255,255,.4)",
    borderRadius: "12px",
    padding: "20px",
    border: `2px solid rgba(255,255,255,0.3)`,
    overflow: "hidden",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)",
    backdropFilter: "blur(5px)"
  },

  mainContent: {
    gridRow: "1",
    gridColumn: "2",
  },

  tasksHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "15px",
    paddingBottom: "15px",
    borderBottom: "2px solid rgba(255,255,255,0.2)"
  },

  title: {
    fontSize: "1.5rem",
    fontWeight: "bold",
    color: "white",
    fontStyle: "italic",
    margin: 0,
    fontFamily: "'Brush Script MT', cursive",
    letterSpacing: "1px"
  },

  settingsIcon: {
    background: "none",
    border: "none",
    fontSize: "1.5rem",
    cursor: "pointer",
    color: "rgba(255,255,255,0.7)",
    padding: "5px",
    transition: "color 0.2s"
  },

  headerIcons: {
    display: "flex",
    gap: "10px"
  },

  headerButton: {
    background: "none",
    border: "none",
    fontSize: "1.5rem",
    cursor: "pointer",
    color: "rgba(255,255,255,0.7)",
    padding: "5px",
    transition: "color 0.2s"
  },

  bottomInput: {
    gridColumn: "1 / span 2",
    background: "rgba(255,255,255,0.1)",
    borderRadius: "12px",
    padding: "20px",
    border: `2px solid rgba(255,255,255,0.3)`,
    backdropFilter: "blur(5px)"
  },

  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.27)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000
  },

  modal: {
    border: "2px solid rgba(255,255,255,0.4)",
    borderRadius: "12px",
    padding: "30px",
    maxWidth: "400px",
    width: "90%",
    backdropFilter: "blur(10px)",
  },

  modalTitle: {
    fontSize: "1.8rem",
    fontWeight: "bold",
    color: "white",
    marginBottom: "20px",
    fontStyle: "italic",
    textAlign: "center"
  },

  settingItem: {
    marginBottom: "20px"
  },

  settingLabel: {
    color: "rgba(255,255,255,0.9)",
    fontSize: "0.95rem",
    marginBottom: "8px",
    display: "block",
    fontWeight: "500"
  },

  colorInput: {
    width: "100%",
    height: "40px",
    border: "2px solid rgba(255,255,255,0.3)",
    borderRadius: "6px",
    cursor: "pointer"
  },

  closeButton: {
    background: "none",
    border: "none",
    fontSize: "2rem",
    cursor: "pointer",
    color: "rgba(255,255,255,0.7)",
    position: "absolute",
    top: "15px",
    right: "15px",
    padding: "0",
    width: "30px",
    height: "30px"
  }
};

export default function Dashboard() {
  const [showSettings, setShowSettings] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [bgColor, setBgColor] = useState(theme.colors.background);
  const [gradientColor, setGradientColor] = useState("#ffffff");
  const [useGradient, setUseGradient] = useState(false);
  const [fontColor, setFontColor] = useState("white");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Apply color changes to the document
  React.useEffect(() => {
    const container = document.querySelector('[data-dashboard-container]');
    if (container) {
      if (useGradient) {
        container.style.background = `linear-gradient(135deg, ${bgColor} 0%, ${gradientColor} 100%)`;
      } else {
        container.style.background = bgColor;
      }
    }
  }, [bgColor, gradientColor, useGradient]);

  const handleTasksCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div style={{ ...styles.container, background: bgColor }} data-dashboard-container>
      {/* LEFT SIDEBAR */}
      <div style={styles.sidebar}>
        {/* Calendar */}
        <div style={styles.panel}>
          <CalendarPanel />
        </div>

        {/* Progress */}
        <div style={styles.panel}>
          <ProgressPanel />
        </div>
      </div>

      {/* RIGHT: Tasks */}
      <div style={{ ...styles.panel, ...styles.mainContent }}>
        <div style={styles.tasksHeader}>
          <h2 style={{ ...styles.title, color: fontColor }}>Tasks Organized</h2>
          <div style={styles.headerIcons}>
            <button
              style={styles.headerButton}
              onClick={() => setShowAddTask(true)}
              title="Add task"
            >
              ➕
            </button>
            <button
              style={styles.headerButton}
              onClick={() => setShowSettings(true)}
              title="Settings"
            >
              ⚙️
            </button>
          </div>
        </div>
        <TasksPanel refreshTrigger={refreshTrigger} />
      </div>

      {/* Add Task Modal */}
      {showAddTask && (
        <div style={styles.modalOverlay} onClick={() => setShowAddTask(false)}>
          <div style={{ ...styles.modal, maxWidth: "500px" }} onClick={(e) => e.stopPropagation()}>
            <button
              style={styles.closeButton}
              onClick={() => setShowAddTask(false)}
            >
              ✕
            </button>

            <h3 style={styles.modalTitle}>Add Tasks</h3>

            <UnstructuredInput onTasksCreated={() => {
              handleTasksCreated();
              setShowAddTask(false);
            }} />
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div style={styles.modalOverlay} onClick={() => setShowSettings(false)}>
          <div style={{ ...styles.modal, background: useGradient ? `linear-gradient(135deg, ${bgColor}dd 0%, ${gradientColor}dd 100%)` : `rgba(167, 196, 160, 0.95)` }} onClick={(e) => e.stopPropagation()}>
            <button
              style={styles.closeButton}
              onClick={() => setShowSettings(false)}
            >
              ✕
            </button>

            <h3 style={styles.modalTitle}>Settings</h3>

            <div style={styles.settingItem}>
              <label style={styles.settingLabel}>Customize Theme</label>
            </div>

            <div style={styles.settingItem}>
              <label style={styles.settingLabel}>Background color</label>
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                style={styles.colorInput}
              />
            </div>

            <div style={styles.settingItem}>
              <label style={styles.settingLabel}>Font color</label>
              <input
                type="color"
                value={fontColor}
                onChange={(e) => setFontColor(e.target.value)}
                style={styles.colorInput}
              />
            </div>

            <div style={styles.settingItem}>
              <label style={styles.settingLabel}>
                <input
                  type="checkbox"
                  checked={useGradient}
                  onChange={(e) => setUseGradient(e.target.checked)}
                  style={{ marginRight: "8px", cursor: "pointer" }}
                />
                Use Gradient
              </label>
            </div>

            {useGradient && (
              <div style={styles.settingItem}>
                <label style={styles.settingLabel}>Gradient color</label>
                <input
                  type="color"
                  value={gradientColor}
                  onChange={(e) => setGradientColor(e.target.value)}
                  style={styles.colorInput}
                />
              </div>
            )}

            <div style={styles.settingItem}>
              <label style={styles.settingLabel}>Progress Plant</label>
            </div>

            <div style={styles.settingItem}>
              <label style={styles.settingLabel}>Calendar</label>
            </div>

            <div style={styles.settingItem}>
              <label style={styles.settingLabel}>Changing Plant</label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
