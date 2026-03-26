import React, { useState, useEffect } from "react";
import { ToolOutlined, CloseOutlined, PictureOutlined } from "@ant-design/icons";
import CalendarPanel from "./CalendarPanel";
import ProgressPanel from "./ProgressPanel";
import TasksPanel from "./TasksPanel";
import KanbanView from "./KanbanView";
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
    overflowX: "hidden",
    scrollbarWidth: "thin",
    scrollbarColor: "rgba(255,255,255,0.2) transparent"
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
      if (!raw) return "#2A2A2A";
      const saved = JSON.parse(raw);
      return saved.text || "#2A2A2A";
    } catch (e) {
      return "#2A2A2A";
    }
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [settingsTab, setSettingsTab] = useState('display');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('organote_viewMode') || 'list';
    } catch (e) {
      return 'list';
    }
  });
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
  const [reminders, setReminders] = useState(() => {
    try {
      const nRaw = localStorage.getItem("organote_notifications");
      if (nRaw) {
        const n = JSON.parse(nRaw);
        return Array.isArray(n.reminders) ? n.reminders : [];
      }
    } catch (e) {}
    return [];
  });
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [newRemType, setNewRemType] = useState('before');
  const [newRemAmount, setNewRemAmount] = useState(15);
  const [newRemUnit, setNewRemUnit] = useState('minutes');
  const [newRemTime, setNewRemTime] = useState('09:00');
  const notifiedRef = React.useRef(new Set());
  const [bgImage, setBgImage] = useState(() => {
    try { return localStorage.getItem('organote_bg_image') || ''; } catch (e) { return ''; }
  });
  const [bgImageName, setBgImageName] = useState(() => {
    try { return localStorage.getItem('organote_bg_image_name') || ''; } catch (e) { return ''; }
  });
  const hasTaskReminder = (task) =>
    task?.due_date && task?.reminder_offset_minutes !== null && task?.reminder_offset_minutes !== undefined;
  const pushReminder = (title, body, tag) => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(title, { body, tag });
        return;
      } catch (err) {
        console.error('Notification error:', err);
      }
    }
    // Fallback for browsers where Notification is blocked/unavailable.
    if (typeof window !== 'undefined') {
      window.alert(`${title}\n${body}`);
    }
  };

  useEffect(() => {
    // load modern theme (organote_theme) if present and apply CSS variables
    try {
      const raw = localStorage.getItem("organote_theme");
      console.log('[Dashboard] Mount effect: found organote_theme:', !!raw);
      if (!raw) return;
      const saved = JSON.parse(raw);
      console.log('[Dashboard] Mount effect: parsed saved theme:', saved);
      if (saved.background) {
        let bgToUse = saved.background;
        // Check if gradient is malformed and fix it
        if (saved.background.includes("linear-gradient")) {
          const sanitized = sanitizeGradient(saved.background);
          if (sanitized) {
            bgToUse = sanitized;
            console.log('[Dashboard] Mount effect: sanitized malformed gradient:', bgToUse);
            // Update saved theme with clean gradient
            saved.background = bgToUse;
            localStorage.setItem("organote_theme", JSON.stringify(saved));
          }
        }
        console.log('[Dashboard] Mount effect: applying saved background:', bgToUse);
        document.documentElement.style.setProperty("--bg-color", bgToUse);
        // Also apply directly to body
        document.body.style.background = bgToUse;
        // try to use saved background as initial bgColor; if gradient, extract colors
        if (bgToUse.includes("linear-gradient")) {
          setUseGradient(true);
          // try to parse two colors from the gradient string
          const m = bgToUse.match(/linear-gradient\([^,]+,\s*([^,]+),\s*([^\)]+)\)/);
          if (m) {
            const c1 = m[1].trim().replace(/\s+100%$/, '').replace(/,$/, '');
            const c2 = m[2].trim().replace(/\s+100%$/, '').replace(/,$/, '');
            setBgColor(c1);
            setGradientColor(c2);
          } else {
            setBgColor(bgToUse);
          }
        } else {
          setBgColor(bgToUse);
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
      // Restore background image if one was saved
      try {
        const savedImg = localStorage.getItem('organote_bg_image');
        if (savedImg) {
          document.body.style.backgroundImage = `url(${savedImg})`;
          document.body.style.backgroundSize = 'cover';
          document.body.style.backgroundPosition = 'center';
          document.body.style.backgroundRepeat = 'no-repeat';
        }
      } catch (imgErr) {}
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

  // Apply/remove background image on body whenever it changes
  useEffect(() => {
    if (bgImage) {
      document.body.style.backgroundImage = `url(${bgImage})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundRepeat = 'no-repeat';
    } else {
      document.body.style.backgroundImage = '';
      document.body.style.backgroundSize = '';
      document.body.style.backgroundPosition = '';
      document.body.style.backgroundRepeat = '';
    }
  }, [bgImage]);

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
      const n = { enabled: notificationsEnabled, reminders };
      localStorage.setItem("organote_notifications", JSON.stringify(n));
    } catch (e) {}
  }, [notificationsEnabled, reminders]);

  // Periodic checker: fires each reminder rule against each incomplete task
  useEffect(() => {
    let intervalId;
    async function checkTasks() {
      try {
        if (typeof Notification !== 'undefined' && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
          await Notification.requestPermission();
        }
        const tasks = await apiFetch('/tasks');
        const activeTasks = tasks.filter((task) => task.status !== 'completed');
        const hasTaskSpecificReminders = activeTasks.some((task) => hasTaskReminder(task));
        const globalRemindersEnabled = notificationsEnabled && reminders.length > 0;
        if (!globalRemindersEnabled && !hasTaskSpecificReminders) return;
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);
        const nowH = now.getHours();
        const nowM = now.getMinutes();
        const unitMs = { minutes: 60000, hours: 3600000, days: 86400000, weeks: 604800000 };

        activeTasks.forEach((t) => {
          if (hasTaskReminder(t)) {
            const due = new Date(t.due_date);
            if (Number.isNaN(due.getTime())) return;
            const dueKey = due.toISOString();
            const notifKey = `${t.id}-task-${t.reminder_offset_minutes}-${dueKey}`;
            if (!notifiedRef.current.has(notifKey)) {
              const leadMs = Number(t.reminder_offset_minutes || 0) * 60000;
              const triggerAt = due.getTime() - leadMs;
              const catchUpUntil = due.getTime() + (24 * 60 * 60 * 1000);
              const nowTs = now.getTime();
              const shouldNotify = nowTs >= triggerAt && nowTs <= catchUpUntil;
              if (shouldNotify) {
                const body = nowTs > due.getTime()
                  ? `was due ${due.toLocaleString()}`
                  : `due ${due.toLocaleString()}`;
                pushReminder(`Task: ${t.title}`, body, notifKey);
                notifiedRef.current.add(notifKey);
              }
            }
            return;
          }

          if (!globalRemindersEnabled) return;

          reminders.forEach((r) => {
            const notifKey = `${t.id}-${r.id}-${todayStr}`;
            if (notifiedRef.current.has(notifKey)) return;
            let shouldNotify = false;
            let body = '';
            if (r.type === 'before' && t.due_date) {
              const due = new Date(t.due_date);
              const diff = due.getTime() - now.getTime();
              const leadMs = (r.amount || 15) * (unitMs[r.unit] || 60000);
              shouldNotify = diff <= leadMs && diff >= -60000;
              if (shouldNotify) body = `due ${due.toLocaleString()}`;
            } else if (r.type === 'dayof' && t.due_date) {
              const due = new Date(t.due_date);
              const [remH, remM] = (r.time || '09:00').split(':').map(Number);
              shouldNotify = due.toISOString().slice(0, 10) === todayStr && nowH === remH && nowM === remM;
              if (shouldNotify) body = `due today at ${due.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            } else if (r.type === 'daily') {
              const [remH, remM] = (r.time || '09:00').split(':').map(Number);
              shouldNotify = nowH === remH && nowM === remM;
              if (shouldNotify) body = t.due_date ? `due ${new Date(t.due_date).toLocaleDateString()}` : 'incomplete task';
            }
            if (shouldNotify) {
              pushReminder(`Task: ${t.title}`, body, notifKey);
              notifiedRef.current.add(notifKey);
            }
          });
        });
      } catch (e) {
        console.error('Notification check failed', e);
      }
    }

    checkTasks();
    intervalId = setInterval(checkTasks, 60 * 1000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [notificationsEnabled, reminders]);

  // helper function to normalize color values to valid hex for color inputs
  const normalizeColor = (colorStr) => {
    if (!colorStr) return '#ffffff';
    // Remove spaces and extract just the hex
    const match = colorStr.match(/#[0-9a-fA-F]{6}/);
    return match ? match[0] : ('#ffffff');
  };

  // Validate and fix malformed gradient strings
  const sanitizeGradient = (gradientStr) => {
    if (!gradientStr || !gradientStr.includes("linear-gradient")) {
      return null;
    }
    try {
      // Extract colors using regex - be more flexible about the format
      const match = gradientStr.match(/linear-gradient\s*\([^,]+,\s*([#\w]+)[^,]*,\s*([#\w]+)[^)]*\)/);
      if (match) {
        const color1 = match[1].trim();
        const color2 = match[2].trim();
        // Reconstruct a clean gradient
        return `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
      }
    } catch (e) {
      console.error("Error sanitizing gradient:", e);
    }
    return null;
  };

  // helper to merge and save a background into organote_theme immediately
  const saveBackgroundToTheme = (backgroundValue, gradientFlag, gradientVal) => {
    try {
      const raw = localStorage.getItem("organote_theme");
      const current = raw ? JSON.parse(raw) : {};
      let bgStr = gradientFlag ? `linear-gradient(135deg, ${backgroundValue} 0%, ${gradientVal} 100%)` : backgroundValue;
      
      // Sanitize if it's a gradient
      if (bgStr.includes("linear-gradient")) {
        const sanitized = sanitizeGradient(bgStr);
        if (sanitized) {
          bgStr = sanitized;
        }
      }
      
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

  const handleBgImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/gif'].includes(file.type)) {
      alert('Only PNG and GIF files are supported.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      try {
        localStorage.setItem('organote_bg_image', dataUrl);
        localStorage.setItem('organote_bg_image_name', file.name);
        setBgImage(dataUrl);
        setBgImageName(file.name);
      } catch (err) {
        alert('Image is too large to save. Try a file smaller than 4 MB.');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const clearBgImage = () => {
    try {
      localStorage.removeItem('organote_bg_image');
      localStorage.removeItem('organote_bg_image_name');
    } catch (e) {}
    setBgImage('');
    setBgImageName('');
  };

  const formatRemTime = (raw) => {
    if (!raw) return '';
    const [hStr, mStr] = raw.split(':');
    const h = parseInt(hStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = (h % 12) || 12;
    return `${h12}:${mStr} ${ampm}`;
  };

  const addReminder = () => {
    let label, timeLabel;
    if (newRemType === 'before') {
      label = 'Before event';
      timeLabel = `${newRemAmount} ${newRemUnit}`;
    } else if (newRemType === 'dayof') {
      label = 'Day of — morning';
      timeLabel = formatRemTime(newRemTime);
    } else {
      label = 'Daily reminder';
      timeLabel = formatRemTime(newRemTime);
    }
    setReminders(prev => [...prev, { id: Date.now().toString(), type: newRemType, amount: newRemAmount, unit: newRemUnit, time: newRemTime, label, timeLabel }]);
    setShowAddReminder(false);
    setNewRemType('before');
    setNewRemAmount(15);
    setNewRemUnit('minutes');
    setNewRemTime('09:00');
  };

  const deleteReminder = (id) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  const handleTasksChanged = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Persist view mode to localStorage when it changes
  React.useEffect(() => {
    try {
      localStorage.setItem('organote_viewMode', viewMode);
    } catch (e) {
      console.error('Error saving view mode:', e);
    }
  }, [viewMode]);

  const containerStyle = bgImage
    ? {
        ...styles.container,
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }
    : styles.container;

  return (
    <div style={containerStyle} data-dashboard-container>
      {/* LEFT SIDEBAR */}
      <div style={styles.sidebar}>
        {/* Calendar */}
        <div style={styles.panel}>
          <CalendarPanel />
        </div>

        {/* Progress */}
        <div style={styles.panel}>
          <ProgressPanel refreshTrigger={refreshTrigger} />
        </div>
      </div>

      {/* RIGHT: Tasks */}
      <div style={{ 
        ...styles.panel, 
        ...styles.mainContent,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div style={styles.tasksHeader}>
          <h2 style={{ ...styles.title, color: fontColor }}>Tasks Organized</h2>
          <div style={styles.headerIcons}>
            <button
              style={styles.headerButton}
              onClick={() => setShowSettings(true)}
              title="Settings"
            >
              <ToolOutlined />
            </button>
          </div>
        </div>

        {/* View Mode Toggle Buttons and Search */}
        <div style={{ display: 'flex', gap: '16px', padding: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <button
              onClick={() => setViewMode('list')}
              style={{
                background: 'none',
                border: 'none',
                color: viewMode === 'list' ? 'var(--btn-color, #A7C4A0)' : 'var(--text-color, white)',
                fontSize: '1rem',
                cursor: 'pointer',
                fontWeight: viewMode === 'list' ? 'bold' : 'normal',
                textDecoration: viewMode === 'list' ? 'underline' : 'none',
                padding: '4px 8px',
                transition: 'all 0.2s'
              }}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              style={{
                background: 'none',
                border: 'none',
                color: viewMode === 'kanban' ? 'var(--btn-color, #A7C4A0)' : 'var(--text-color, white)',
                fontSize: '1rem',
                cursor: 'pointer',
                fontWeight: viewMode === 'kanban' ? 'bold' : 'normal',
                textDecoration: viewMode === 'kanban' ? 'underline' : 'none',
                padding: '4px 8px',
                transition: 'all 0.2s'
              }}
            >
              Kanban
            </button>
          </div>
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              padding: '6px 12px',
              color: 'var(--text-color, #2A2A2A)',
              fontSize: '0.9rem',
              outline: 'none',
              minWidth: '150px',
              transition: 'all 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
          />
        </div>

        {/* Conditional View Rendering */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {viewMode === 'list' ? (
            <TasksPanel
              refreshTrigger={refreshTrigger}
              searchQuery={searchQuery}
              onTasksChanged={handleTasksChanged}
              onAddTasks={() => setShowAddTask(true)}
            />
          ) : (
            <KanbanView
              refreshTrigger={refreshTrigger}
              searchQuery={searchQuery}
              onTasksChanged={handleTasksChanged}
              onAddTasks={() => setShowAddTask(true)}
            />
          )}
        </div>
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
              handleTasksChanged();
              setShowAddTask(false);
            }} />
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div style={styles.modalOverlay} onClick={() => setShowSettings(false)}>
          <div
            style={{
              borderRadius: '16px',
              maxWidth: '460px',
              width: '90%',
              overflow: 'hidden',
              backdropFilter: 'blur(20px)',
              background: 'rgba(255,255,255,0.12)',
              border: '2px solid rgba(255,255,255,0.25)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '9px', letterSpacing: '4px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', fontWeight: 400 }}>Preferences</div>
                <h3 style={{ margin: 0, fontSize: '1.5rem', fontStyle: 'italic', fontFamily: "'Brush Script MT', cursive", color: 'var(--text-color, white)', lineHeight: 1 }}>Settings</h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-color, rgba(255,255,255,0.7))', fontSize: '0.85rem', transition: 'all 0.2s', flexShrink: 0 }}
              >
                <CloseOutlined />
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              {['display', 'alerts'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setSettingsTab(tab)}
                  style={{
                    padding: '10px 16px 11px',
                    fontSize: '11px',
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    color: settingsTab === tab ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.4)',
                    cursor: 'pointer',
                    border: 'none',
                    borderBottom: settingsTab === tab ? '2px solid rgba(255,255,255,0.8)' : '2px solid transparent',
                    marginBottom: '-1px',
                    background: 'none',
                    transition: 'all 0.2s',
                    fontFamily: 'inherit',
                  }}
                >
                  {tab === 'display' ? 'Display' : 'Alerts'}
                </button>
              ))}
            </div>

            {/* Display tab*/}
            {settingsTab === 'display' && (
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '9px', letterSpacing: '4px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>Appearance</div>

                {/* Background Color */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '30px', height: '30px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.8)', flexShrink: 0 }}>◉</div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-color, white)' }}>Background Color</div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>Base theme color</div>
                    </div>
                  </div>
                  <input
                    type="color"
                    value={normalizeColor(bgColor)}
                    onChange={(e) => { const v = e.target.value; setBgColor(v); saveBackgroundToTheme(v, useGradient, gradientColor); }}
                    style={{ width: '36px', height: '36px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', cursor: 'pointer', padding: '2px', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }}
                  />
                </div>

                {/* Font Color */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '30px', height: '30px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'serif', fontSize: '15px', fontWeight: 'bold', color: 'rgba(255,255,255,0.8)', flexShrink: 0 }}>A</div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-color, white)' }}>Font Color</div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>Text appearance</div>
                    </div>
                  </div>
                  <input
                    type="color"
                    value={fontColor}
                    onChange={(e) => setFontColor(e.target.value)}
                    style={{ width: '36px', height: '36px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', cursor: 'pointer', padding: '2px', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }}
                  />
                </div>

                {/* Gradient Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '30px', height: '30px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', flexShrink: 0 }}>GR</div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-color, white)' }}>Gradient Background</div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>Blend two colors</div>
                    </div>
                  </div>
                  <div
                    onClick={() => { const f = !useGradient; setUseGradient(f); saveBackgroundToTheme(bgColor, f, gradientColor); }}
                    style={{ width: '44px', height: '24px', borderRadius: '12px', background: useGradient ? 'var(--btn-color, #A7C4A0)' : 'rgba(255,255,255,0.15)', border: `1px solid ${useGradient ? 'var(--btn-color, #A7C4A0)' : 'rgba(255,255,255,0.2)'}`, position: 'relative', cursor: 'pointer', transition: 'all 0.3s', flexShrink: 0 }}
                  >
                    <div style={{ position: 'absolute', top: '3px', left: useGradient ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: 'white', transition: 'left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
                  </div>
                </div>

                {/* Gradient End Color */}
                {useGradient && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '30px', height: '30px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: 'rgba(255,255,255,0.8)', flexShrink: 0 }}>→</div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-color, white)' }}>Gradient End Color</div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>Second blend color</div>
                      </div>
                    </div>
                    <input
                      type="color"
                      value={normalizeColor(gradientColor)}
                      onChange={(e) => { setGradientColor(e.target.value); saveBackgroundToTheme(bgColor, true, e.target.value); }}
                      style={{ width: '36px', height: '36px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', cursor: 'pointer', padding: '2px', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }}
                    />
                  </div>
                )}

                {/* Background Image Upload */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '30px', height: '30px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', color: 'rgba(255,255,255,0.8)', flexShrink: 0 }}><PictureOutlined /></div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-color, white)' }}>Background Image</div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>PNG or GIF only — max ~4 MB</div>
                    </div>
                  </div>

                  {bgImage ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '8px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <img src={bgImage} alt="preview" style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '5px', flexShrink: 0 }} />
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bgImageName}</span>
                      </div>
                      <button
                        onClick={clearBgImage}
                        title="Remove image"
                        style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '11px', padding: '4px 8px', flexShrink: 0, transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#e88080'; e.currentTarget.style.borderColor = '#e88080'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                      >Remove</button>
                    </div>
                  ) : (
                    <label
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '9px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                    >
                      <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '16px', lineHeight: 1 }}>↑</span>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Drop or click to browse…</span>
                      <input type="file" accept="image/png,image/gif" onChange={handleBgImageUpload} style={{ display: 'none' }} />
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* Alerts*/}
            {settingsTab === 'alerts' && (
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '480px', overflowY: 'auto' }}>
                <div style={{ fontSize: '9px', letterSpacing: '4px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>Notifications</div>

                {/* Enable Notifications toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '30px', height: '30px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>🔔</div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-color, white)' }}>Enable Notifications</div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>Push and in-app alerts</div>
                    </div>
                  </div>
                  <div
                    onClick={() => setNotificationsEnabled(prev => !prev)}
                    style={{ width: '44px', height: '24px', borderRadius: '12px', background: notificationsEnabled ? 'var(--btn-color, #A7C4A0)' : 'rgba(255,255,255,0.15)', border: `1px solid ${notificationsEnabled ? 'var(--btn-color, #A7C4A0)' : 'rgba(255,255,255,0.2)'}`, position: 'relative', cursor: 'pointer', transition: 'all 0.3s', flexShrink: 0 }}
                  >
                    <div style={{ position: 'absolute', top: '3px', left: notificationsEnabled ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: 'white', transition: 'left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
                  </div>
                </div>

                {/* Reminders panel */}
                {notificationsEnabled && (
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ fontSize: '9px', letterSpacing: '4px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: '10px' }}>Reminders</div>

                    {/* Existing reminders */}
                    {reminders.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                        {reminders.map(r => (
                          <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '9px', padding: '8px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
                              <span style={{ fontSize: '12px', color: 'var(--text-color, white)' }}>{r.label}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{r.timeLabel}</span>
                              <button
                                onClick={() => deleteReminder(r.id)}
                                title="Remove"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: '13px', padding: '0 2px', lineHeight: 1, transition: 'color 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.color = '#e88080'}
                                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                              >✕</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add reminder trigger */}
                    {!showAddReminder && (
                      <div
                        onClick={() => setShowAddReminder(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '9px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                      >
                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '18px', lineHeight: 1, fontWeight: 300 }}>+</span>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Add a reminder...</span>
                      </div>
                    )}

                    {/* Add reminder form */}
                    {showAddReminder && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '9px', padding: '12px' }}>
                        <select
                          value={newRemType}
                          onChange={e => setNewRemType(e.target.value)}
                          style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '7px', color: 'var(--text-color, white)', fontFamily: 'inherit', fontSize: '12px', padding: '7px 10px', cursor: 'pointer', outline: 'none', width: '100%' }}
                        >
                          <option value="before">Before event</option>
                          <option value="dayof">Day of — morning</option>
                          <option value="daily">Daily (all incomplete tasks)</option>
                        </select>

                        {newRemType === 'before' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <input
                              type="number"
                              min="1"
                              max="9999"
                              value={newRemAmount}
                              onChange={e => setNewRemAmount(Number(e.target.value) || 1)}
                              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '7px', color: 'var(--text-color, white)', fontSize: '14px', padding: '6px 10px', outline: 'none', width: '64px', textAlign: 'center' }}
                            />
                            <select
                              value={newRemUnit}
                              onChange={e => setNewRemUnit(e.target.value)}
                              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '7px', color: 'var(--text-color, white)', fontFamily: 'inherit', fontSize: '12px', padding: '7px 10px', cursor: 'pointer', outline: 'none' }}
                            >
                              <option value="minutes">minutes</option>
                              <option value="hours">hours</option>
                              <option value="days">days</option>
                              <option value="weeks">weeks</option>
                            </select>
                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>before</span>
                          </div>
                        )}

                        {(newRemType === 'dayof' || newRemType === 'daily') && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>At</span>
                            <input
                              type="time"
                              value={newRemTime}
                              onChange={e => setNewRemTime(e.target.value)}
                              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '7px', color: 'var(--text-color, white)', fontSize: '13px', padding: '6px 10px', outline: 'none' }}
                            />
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={addReminder}
                            style={{ padding: '7px 16px', borderRadius: '7px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.9)', fontFamily: 'inherit', fontSize: '11px', letterSpacing: '1px', cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                          >Add</button>
                          <button
                            onClick={() => { setShowAddReminder(false); setNewRemType('before'); setNewRemAmount(15); setNewRemUnit('minutes'); setNewRemTime('09:00'); }}
                            style={{ padding: '7px 14px', borderRadius: '7px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)', fontFamily: 'inherit', fontSize: '11px', cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-color, white)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                          >Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
