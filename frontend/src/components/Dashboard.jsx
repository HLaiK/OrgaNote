import React, { useState, useEffect } from "react";
import { PlusOutlined, ToolOutlined, DeleteOutlined, CloseOutlined } from "@ant-design/icons";
import CalendarPanel from "./CalendarPanel";
import ProgressPanel from "./ProgressPanel";
import TasksPanel from "./TasksPanel";
import UnstructuredInput from "./UnstructuredInputPanel";
import { theme } from "../theme";
import { apiFetch } from "../api";

const styles = {
  container: {
    display: "grid",
    gridTemplateColumns: "250px 1fr",
    gridTemplateRows: "1fr",
    gap: "20px",
    padding: "20px",
    height: "100vh",
    background: `var(--bg-color, ${theme.colors.background})`,
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
    color: "var(--text-color, white)",
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
    color: "var(--text-color, rgba(255,255,255,0.7))",
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
    color: "var(--text-color, rgba(255,255,255,0.7))",
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
    color: "var(--text-color, white)",
    marginBottom: "20px",
    fontStyle: "italic",
    textAlign: "center"
  },

  settingItem: {
    marginBottom: "20px"
  },

  settingLabel: {
    color: "var(--text-color, rgba(255,255,255,0.9))",
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
    color: "var(--text-color, rgba(255,255,255,0.7))",
    position: "absolute",
    top: "15px",
    right: "15px",
    padding: "0",
    width: "30px",
    height: "30px"
  }
};

export default function Dashboard({themeColor}) {
  const [showSettings, setShowSettings] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  // Initialize bgColor from localStorage first; if not present, use theme default
  const [bgColor, setBgColor] = useState(() => {
    try {
      const raw = localStorage.getItem("organote_theme");
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.background) {
          if (!saved.background.includes("linear-gradient")) {
            return saved.background;
          } else {
            // Extract first color from gradient
            const m = saved.background.match(/linear-gradient\([^,]+,\s*([^,]+),/);
            if (m) {
              return m[1].trim().replace(/\s+0%$/, '').replace(/,$/, '');
            }
          }
        }
      }
    } catch (e) {}
    return themeColor || theme.colors.background;
  });
  // Initialize useGradient from localStorage if background is a gradient
  const [useGradient, setUseGradient] = useState(() => {
    try {
      const raw = localStorage.getItem("organote_theme");
      if (raw) {
        const saved = JSON.parse(raw);
        return !!saved.background && saved.background.includes("linear-gradient");
      }
    } catch (e) {}
    return false;
  });
  // Initialize gradientColor from localStorage if exists
  const [gradientColor, setGradientColor] = useState(() => {
    try {
      const raw = localStorage.getItem("organote_theme");
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.background && saved.background.includes("linear-gradient")) {
          const m = saved.background.match(/linear-gradient\([^,]+,\s*([^,]+),\s*([^\)]+)\)/);
          if (m) {
            return m[2].trim().replace(/\s+100%$/, '').replace(/,$/, '');
          }
        }
      }
    } catch (e) {}
    return "#ffffff";
  });
  const [fontColor, setFontColor] = useState(() => {
    try {
      const raw = localStorage.getItem("organote_theme");
      if (!raw) return "#ffffff";
      const saved = JSON.parse(raw);
      return saved.text || "#ffffff";
    } catch (e) {
      return "#ffffff";
    }
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  // Flag to prevent persist effects from running during initialization
  const isInitialMount = React.useRef(true);
  // Load notification settings from localStorage on initial render
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    try {
      const nRaw = localStorage.getItem("organote_notifications");
      if (nRaw) {
        const n = JSON.parse(nRaw);
        return !!n.enabled;
      }
    } catch (e) {}
    return false;
  });
  const [notificationLead, setNotificationLead] = useState(() => {
    try {
      const nRaw = localStorage.getItem("organote_notifications");
      if (nRaw) {
        const n = JSON.parse(nRaw);
        return n.leadMinutes || 60;
      }
    } catch (e) {}
    return 60;
  });
  const notifiedRef = React.useRef(new Set());

  useEffect(() => {
    // load modern theme (organote_theme) if present and apply CSS variables
    try {
      const raw = localStorage.getItem("organote_theme");
      console.log('[Dashboard] Mount effect: found organote_theme:', !!raw);
      if (!raw) return;
      const saved = JSON.parse(raw);
      console.log('[Dashboard] Mount effect: parsed saved theme:', saved);
      if (saved.background) {
        console.log('[Dashboard] Mount effect: applying saved background:', saved.background);
        document.documentElement.style.setProperty("--bg-color", saved.background);
        // Also apply directly to body
        document.body.style.background = saved.background;
        // try to use saved background as initial bgColor; if gradient, extract colors
        if (saved.background.includes("linear-gradient")) {
          setUseGradient(true);
          // try to parse two colors from the gradient string
          const m = saved.background.match(/linear-gradient\([^,]+,\s*([^,]+),\s*([^\)]+)\)/);
          if (m) {
            const c1 = m[1].trim().replace(/\s+100%$/, '').replace(/,$/, '');
            const c2 = m[2].trim().replace(/\s+100%$/, '').replace(/,$/, '');
            setBgColor(c1);
            setGradientColor(c2);
          } else {
            setBgColor(saved.background);
          }
        } else {
          setBgColor(saved.background);
        }
      }
      if (saved.button) {
        document.documentElement.style.setProperty("--btn-color", saved.button);
        document.documentElement.style.setProperty("--scroll-thumb", saved.button);
      }
      if (saved.text) {
        document.documentElement.style.setProperty("--text-color", saved.text);
        setFontColor(saved.text);
      }
    } catch (e) {
      console.error('[Dashboard] Mount effect error:', e);
    } finally {
      // Mark initialization as complete; now persist effects can save changes
      isInitialMount.current = false;
    }
  }, []);
  // Apply color changes to the document (keeps backward compatibility)
  // Skip during initialization since applySavedTheme() already set these
  React.useEffect(() => {
    if (isInitialMount.current) return;
    const bgStr = useGradient ? `linear-gradient(135deg, ${bgColor} 0%, ${gradientColor} 100%)` : bgColor;
    document.documentElement.style.setProperty("--bg-color", bgStr);
    // Also apply directly to body
    document.body.style.background = bgStr;
  }, [bgColor, gradientColor, useGradient]);

  // persist background/button/text into organote_theme when bg/gradient changes
  // BUT skip during initial mount (isInitialMount.current is true)
  useEffect(() => {
    if (isInitialMount.current) {
      console.log('[Dashboard] Skipping persist during initialization');
      return;
    }
    try {
      const raw = localStorage.getItem("organote_theme");
      const current = raw ? JSON.parse(raw) : {};
      current.background = useGradient ? `linear-gradient(135deg, ${bgColor} 0%, ${gradientColor} 100%)` : bgColor;
      // preserve existing button and text values if present
      localStorage.setItem("organote_theme", JSON.stringify(current));
    } catch (e) {}
    // also persist legacy gradient key for older code
    try {
      localStorage.setItem("organote_use_gradient", useGradient ? "true" : "false");
      localStorage.setItem("organote_gradient_color", gradientColor);
    } catch (e) {}
  }, [bgColor, useGradient, gradientColor]);

  // persist notification settings when changed
  useEffect(() => {
    try {
      const n = { enabled: notificationsEnabled, leadMinutes: notificationLead };
      localStorage.setItem("organote_notifications", JSON.stringify(n));
    } catch (e) {}
  }, [notificationsEnabled, notificationLead]);

  // Periodic checker for upcoming due tasks; shows browser notifications
  useEffect(() => {
    let intervalId;
    async function checkTasks() {
      try {
        if (!notificationsEnabled) return;
        // request permission if needed
        if (typeof Notification !== 'undefined' && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
          await Notification.requestPermission();
        }
        const tasks = await apiFetch('/tasks');
        const now = new Date();
        const leadMs = Math.max(0, notificationLead) * 60 * 1000;
        
        tasks.forEach((t) => {
          if (!t.due_date) return;
          if (t.status === 'completed') return;
          
          const due = new Date(t.due_date);
          const diff = due.getTime() - now.getTime(); // milliseconds until due
          
          // notify if: task is within the lead window AND hasn't been notified yet AND is not too far in the past
          const shouldNotify = diff <= leadMs && diff >= -60000 && !notifiedRef.current.has(t.id); // allow 1 min grace for tasks just passed
          
          if (shouldNotify) {
            const title = `Task due: ${t.title}`;
            const timeStr = due.toLocaleString();
            const body = diff <= 0 ? `Was due at ${timeStr}` : `Due at ${timeStr}`;
            
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              try {
                new Notification(title, { body, tag: `task-${t.id}` });
              } catch (err) {
                console.error('Notification error:', err);
              }
            }
            notifiedRef.current.add(t.id);
            console.log(`[Notification] ${title} - ${body} (diff: ${diff}ms, lead: ${leadMs}ms)`);
          }
        });
      } catch (e) {
        console.error('Notification check failed', e);
      }
    }

    if (notificationsEnabled) {
      // initial check, then every minute
      checkTasks();
      intervalId = setInterval(checkTasks, 60 * 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [notificationsEnabled, notificationLead]);

  // helper function to normalize color values to valid hex for color inputs
  const normalizeColor = (colorStr) => {
    if (!colorStr) return '#ffffff';
    // Remove spaces and extract just the hex
    const match = colorStr.match(/#[0-9a-fA-F]{6}/);
    return match ? match[0] : ('#ffffff');
  };

  // helper to merge and save a background into organote_theme immediately
  const saveBackgroundToTheme = (backgroundValue, gradientFlag, gradientVal) => {
    try {
      const raw = localStorage.getItem("organote_theme");
      const current = raw ? JSON.parse(raw) : {};
      const bgStr = gradientFlag ? `linear-gradient(135deg, ${backgroundValue} 0%, ${gradientVal} 100%)` : backgroundValue;
      current.background = bgStr;
      console.log('[Theme] Saving background to organote_theme:', bgStr);
      localStorage.setItem("organote_theme", JSON.stringify(current));
      console.log('[Theme] Verified in localStorage:', localStorage.getItem("organote_theme"));
      // immediately apply the CSS variable
      document.documentElement.style.setProperty("--bg-color", bgStr);
      // Also apply directly to body
      document.body.style.background = bgStr;
      console.log('[Theme] Applied to both documentElement CSS var and body.style.background');
    } catch (e) {
      console.error('[Theme] Error saving background:', e);
    }
  };

  // persist fontColor changes into organote_theme so other parts pick it up
  useEffect(() => {
    if (isInitialMount.current) return;
    try {
      const raw = localStorage.getItem("organote_theme");
      const current = raw ? JSON.parse(raw) : {};
      current.text = fontColor;
      localStorage.setItem("organote_theme", JSON.stringify(current));
      document.documentElement.style.setProperty("--text-color", fontColor);
    } catch (e) {}
  }, [fontColor]);

  const handleTasksCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div style={styles.container} data-dashboard-container>
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
              <PlusOutlined />
            </button>
            <button
              style={styles.headerButton}
              onClick={() => setShowSettings(true)}
              title="Settings"
            >
              <ToolOutlined />
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
              <CloseOutlined />
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
          <div style={{ ...styles.modal, background: useGradient ? `linear-gradient(135deg, ${bgColor} 0%, ${gradientColor} 100%)` : bgColor }} onClick={(e) => e.stopPropagation()}>
            <button
              style={styles.closeButton}
              onClick={() => setShowSettings(false)}
            >
              <CloseOutlined />
            </button>

            <h3 style={styles.modalTitle}>Settings</h3>

            <div style={styles.settingItem}>
              <label style={styles.settingLabel}>Customize Theme</label>
            </div>

            <div style={styles.settingItem}>
              <label style={styles.settingLabel}>Background color</label>
              <input
                type="color"
                value={normalizeColor(bgColor)}
                onChange={(e) => {
                  const v = e.target.value;
                  setBgColor(v);
                  saveBackgroundToTheme(v, useGradient, gradientColor);
                }}
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
                    onChange={(e) => {
                      const flag = e.target.checked;
                      setUseGradient(flag);
                      saveBackgroundToTheme(bgColor, flag, gradientColor);
                    }}
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
                  value={normalizeColor(gradientColor)}
                  onChange={(e) => {
                    setGradientColor(e.target.value);
                      saveBackgroundToTheme(bgColor, true, e.target.value);
                  }}
                  style={styles.colorInput}
                />
              </div>
            )}

            <div style={styles.settingItem}>
              <label style={styles.settingLabel}>Progress Plant</label>
            </div>

            <div style={styles.settingItem}>
              <label style={styles.settingLabel}>Notifications</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                <label style={styles.settingLabel}>
                  <input
                    type="checkbox"
                    checked={notificationsEnabled}
                    onChange={(e) => setNotificationsEnabled(e.target.checked)}
                    style={{ marginRight: "8px", cursor: "pointer" }}
                  />
                  Enable Notifications
                </label>

                <label style={styles.settingLabel}>Notify me before due:</label>
                <select
                  value={notificationLead}
                  onChange={(e) => setNotificationLead(Number(e.target.value))}
                  style={{ padding: 8, borderRadius: 6 }}
                >
                  <option value={0}>At due time</option>
                  <option value={5}>5 minutes before</option>
                  <option value={15}>15 minutes before</option>
                  <option value={60}>1 hour before</option>
                  <option value={1440}>1 day before</option>
                </select>
              </div>
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
