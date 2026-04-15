import React, { useState, useEffect } from "react";
import { ToolOutlined, CloseOutlined, PictureOutlined, CalendarOutlined } from "@ant-design/icons";
import CalendarPanel from "./CalendarPanel";
import ProgressPanel from "./ProgressPanel";
import TasksPanel from "./TasksPanel";
import KanbanView from "./KanbanView";
import CalendarView from "./CalendarView";
import UnstructuredInput from "./UnstructuredInputPanel";
import { theme } from "../theme";
import { apiFetch } from "../api";
import { getPlantById, getPlantStages, getPotById, REWARD_FLOW } from "../rewards/plantRewardCatalog";
import useViewport from "../hooks/useViewport";

const SURFACE_BG = "rgba(234, 232, 232, 0.53)";
const SURFACE_BG_HOVER = "rgba(194, 194, 194, 0.74)";
const SURFACE_BORDER = "rgba(51, 67, 57, 0.18)";
const SURFACE_TEXT = "#233127";
const SURFACE_MUTED = "#4a5c52";
const SETTINGS_TEXT = "rgba(255,255,255,0.96)";
const SETTINGS_MUTED = "rgba(255,255,255,0.84)";
const SETTINGS_SUBTLE = "rgba(255,255,255,0.74)";
const SETTINGS_PANEL = "rgba(255,255,255,0.08)";
const SETTINGS_PANEL_ALT = "rgba(255,255,255,0.12)";
const SETTINGS_PANEL_BORDER = "rgba(255,255,255,0.18)";

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
    background: SURFACE_BG,
    borderRadius: "12px",
    padding: "20px",
    border: `1px solid ${SURFACE_BORDER}`,
    overflow: "hidden",
    boxShadow: "0 10px 24px rgba(46, 62, 51, 0.12)",
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
    color: SURFACE_TEXT,
    fontStyle: "normal",
    margin: 0,
    fontFamily: "inherit",
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
    color: SURFACE_MUTED,
    padding: "5px",
    transition: "color 0.2s"
  },
  srOnly: {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: 0,
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap",
    border: 0,
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
  const { isPhone, isTablet, isCompact, isTabletLandscape, isLandscape } = useViewport();
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
  const [showFilters, setShowFilters] = useState(false);
  const [groupsForFilters, setGroupsForFilters] = useState([]);
  const [taskFilters, setTaskFilters] = useState({
    status: 'all',
    priority: 'all',
    category: 'all',
    dueDate: 'any',
  });
  const [taskSort, setTaskSort] = useState({
    sortBy: 'date-added',
    direction: 'last',
  });
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('organote_viewMode') || 'list';
    } catch (e) {
      return 'list';
    }
  });
  const [showMiniCalendar, setShowMiniCalendar] = useState(() => {
    try {
      const saved = localStorage.getItem('organote_show_mini_calendar');
      return saved === null ? true : saved === 'true';
    } catch (e) {
      return true;
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
  const [plantJournalEntries, setPlantJournalEntries] = useState([]);
  const [activeRewardSnapshot, setActiveRewardSnapshot] = useState(null);
  const settingsTitleId = "dashboard-settings-title";
  const addTasksTitleId = "dashboard-add-tasks-title";
  const filtersPanelId = "dashboard-filters-panel";
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

  const setBrowserChromeTint = React.useCallback((color) => {
    if (!color || typeof document === 'undefined') return;
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', color);
    }
  }, []);

  const pickTintColor = React.useCallback((backgroundValue) => {
    const normalized = normalizeColor(backgroundValue);
    return normalized || '#A7C4A0';
  }, []);

  const saveBrowserChromeTint = React.useCallback((color) => {
    const tint = color || '#A7C4A0';
    try {
      localStorage.setItem('organote_browser_tint', tint);
    } catch (e) {}
    setBrowserChromeTint(tint);
  }, [setBrowserChromeTint]);

  const extractThemeTintFromImage = React.useCallback((dataUrl) => new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { willReadFrequently: true });
        const sampleSize = 24;
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        context.drawImage(image, 0, 0, sampleSize, sampleSize);
        const { data } = context.getImageData(0, 0, sampleSize, sampleSize);
        let red = 0;
        let green = 0;
        let blue = 0;
        let count = 0;
        for (let index = 0; index < data.length; index += 4) {
          const alpha = data[index + 3];
          if (alpha < 32) continue;
          red += data[index];
          green += data[index + 1];
          blue += data[index + 2];
          count += 1;
        }
        if (!count) {
          resolve('#A7C4A0');
          return;
        }
        const toHex = (value) => Math.round(value / count).toString(16).padStart(2, '0');
        resolve(`#${toHex(red)}${toHex(green)}${toHex(blue)}`);
      } catch (error) {
        resolve('#A7C4A0');
      }
    };
    image.onerror = () => resolve('#A7C4A0');
    image.src = dataUrl;
  }), []);

  const applyPageBackground = React.useCallback((backgroundValue, imageValue = '') => {
    const pageRoots = [document.documentElement, document.body];
    pageRoots.forEach((node) => {
      node.style.background = backgroundValue || '';
      node.style.backgroundColor = backgroundValue || '';
      node.style.backgroundImage = imageValue ? `url(${imageValue})` : '';
      node.style.backgroundSize = imageValue ? 'cover' : '';
      node.style.backgroundPosition = imageValue ? 'center center' : '';
      node.style.backgroundRepeat = imageValue ? 'no-repeat' : '';
      node.style.backgroundAttachment = imageValue ? 'scroll' : '';
    });
  }, []);

  useEffect(() => {
    let active = true;
    async function loadFilterGroups() {
      try {
        const groups = await apiFetch('/task-groups');
        if (active) setGroupsForFilters(Array.isArray(groups) ? groups : []);
      } catch (e) {
        if (active) setGroupsForFilters([]);
      }
    }
    loadFilterGroups();
    return () => {
      active = false;
    };
  }, [refreshTrigger]);

  const filterCount = [
    taskFilters.status !== 'all',
    taskFilters.priority !== 'all',
    taskFilters.category !== 'all',
    taskFilters.dueDate !== 'any',
  ].filter(Boolean).length;

  const updateFilter = (key, value) => {
    setTaskFilters((prev) => ({ ...prev, [key]: value }));
  };

  const updateSort = (key, value) => {
    setTaskSort((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    const allowedBySort = {
      'due-date': ['asc', 'desc'],
      priority: ['high', 'low'],
      alpha: ['az', 'za'],
      'date-added': ['first', 'last'],
      modified: ['recent', 'not-recent'],
    };
    const allowed = allowedBySort[taskSort.sortBy] || ['first', 'last'];
    if (!allowed.includes(taskSort.direction)) {
      setTaskSort((prev) => ({ ...prev, direction: allowed[0] }));
    }
  }, [taskSort.sortBy, taskSort.direction]);

  const resetFiltersAndSort = () => {
    setTaskFilters({
      status: 'all',
      priority: 'all',
      category: 'all',
      dueDate: 'any',
    });
    setTaskSort({
      sortBy: 'date-added',
      direction: 'last',
    });
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
        applyPageBackground(bgToUse, '');
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
      try {
        const savedTint = localStorage.getItem('organote_browser_tint');
        if (savedTint) {
          setBrowserChromeTint(savedTint);
        } else if (saved.background) {
          setBrowserChromeTint(pickTintColor(saved.background));
        }
      } catch (themeErr) {}
      // Restore background image if one was saved
      try {
        const savedImg = localStorage.getItem('organote_bg_image');
        if (savedImg) {
          applyPageBackground(bgToUse || document.documentElement.style.getPropertyValue("--bg-color"), savedImg);
        }
      } catch (imgErr) {}
    } catch (e) {
      console.error('[Dashboard] Mount effect error:', e);
    } finally {
      // Mark initialization as complete; now persist effects can save changes
      isInitialMount.current = false;
    }
  }, [applyPageBackground, pickTintColor, setBrowserChromeTint]);
  // Apply color changes to the document (keeps backward compatibility)
  // Skip during initialization since applySavedTheme() already set these
  React.useEffect(() => {
    if (isInitialMount.current) return;
    const bgStr = useGradient ? `linear-gradient(135deg, ${bgColor} 0%, ${gradientColor} 100%)` : bgColor;
    document.documentElement.style.setProperty("--bg-color", bgStr);
    applyPageBackground(bgStr, bgImage);
    if (!bgImage) {
      saveBrowserChromeTint(pickTintColor(bgStr));
    }
  }, [applyPageBackground, bgColor, bgImage, gradientColor, pickTintColor, saveBrowserChromeTint, useGradient]);

  // Apply/remove background image on the full page whenever it changes
  useEffect(() => {
    if (bgImage) {
      applyPageBackground(document.documentElement.style.getPropertyValue("--bg-color"), bgImage);
    } else {
      applyPageBackground(document.documentElement.style.getPropertyValue("--bg-color"), '');
      saveBrowserChromeTint(
        pickTintColor(document.documentElement.style.getPropertyValue("--bg-color")),
      );
    }
  }, [applyPageBackground, bgImage, pickTintColor, saveBrowserChromeTint]);

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
      applyPageBackground(bgStr, bgImage);
      if (!bgImage) {
        saveBrowserChromeTint(pickTintColor(bgStr));
      }
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
    const mimeType = (file.type || '').toLowerCase();
    const fileName = (file.name || '').toLowerCase();
    const isSupportedImage =
      mimeType.startsWith('image/') || /\.(png|gif|jpe?g|webp)$/i.test(fileName);
    if (!isSupportedImage) {
      alert('Only image files are supported. Try PNG, GIF, JPG, or WEBP.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      try {
        localStorage.setItem('organote_bg_image', dataUrl);
        localStorage.setItem('organote_bg_image_name', file.name);
        setBgImage(dataUrl);
        setBgImageName(file.name);
        const tint = await extractThemeTintFromImage(dataUrl);
        saveBrowserChromeTint(tint);
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
    saveBrowserChromeTint(pickTintColor(document.documentElement.style.getPropertyValue("--bg-color")));
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

  const loadPlantJournalData = React.useCallback(() => {
    try {
      const userId = localStorage.getItem("organote_user_id") || "guest";
      const journalRaw = localStorage.getItem(`organote_plant_journal_v1_${userId}`);
      const rewardRaw = localStorage.getItem(`organote_reward_state_v1_${userId}`);
      const journal = journalRaw ? JSON.parse(journalRaw) : [];
      const rewardState = rewardRaw ? JSON.parse(rewardRaw) : null;
      setPlantJournalEntries(Array.isArray(journal) ? journal : []);
      setActiveRewardSnapshot(rewardState);
    } catch (e) {
      setPlantJournalEntries([]);
      setActiveRewardSnapshot(null);
    }
  }, []);

  const handleTasksChanged = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    loadPlantJournalData();
  }, [loadPlantJournalData, showSettings]);

  useEffect(() => {
    const handleJournalUpdate = () => loadPlantJournalData();
    window.addEventListener("organote-plant-journal-updated", handleJournalUpdate);
    return () => window.removeEventListener("organote-plant-journal-updated", handleJournalUpdate);
  }, [loadPlantJournalData]);

  const formatJournalDateTime = (iso) => {
    if (!iso) return "Not started";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "Not available";
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDuration = (durationMs) => {
    if (!durationMs && durationMs !== 0) return "In progress";
    const totalMinutes = Math.max(Math.round(durationMs / 60000), 0);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes || parts.length === 0) parts.push(`${minutes}m`);
    return parts.join(' ');
  };

  const activeJournalPlant = activeRewardSnapshot?.selectedPlantId ? getPlantById(activeRewardSnapshot.selectedPlantId) : null;
  const activeJournalPot = activeRewardSnapshot?.selectedPotId ? getPotById(activeRewardSnapshot.selectedPotId) : null;
  const getJournalEntryImage = (entry) => {
    const stages = getPlantStages(entry.plantId, entry.potId);
    return stages.length > 0 ? stages[stages.length - 1] : null;
  };

  // Persist view mode to localStorage when it changes
  React.useEffect(() => {
    try {
      localStorage.setItem('organote_viewMode', viewMode);
    } catch (e) {
      console.error('Error saving view mode:', e);
    }
  }, [viewMode]);

  useEffect(() => {
    try {
      localStorage.setItem('organote_show_mini_calendar', showMiniCalendar ? 'true' : 'false');
    } catch (e) {
      console.error('Error saving mini calendar visibility:', e);
    }
  }, [showMiniCalendar]);

  useEffect(() => {
    if (!showSettings && !showAddTask) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (showAddTask) {
        setShowAddTask(false);
      }

      if (showSettings) {
        setShowSettings(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showAddTask, showSettings]);

  const useFullWidthCalendarLayout = isTablet && isTabletLandscape && viewMode === 'calendar';
  const useFullWidthKanbanLayout = isLandscape && isCompact && viewMode === 'kanban';
  const useStackedCompactLayout = (isCompact && !isTabletLandscape) || useFullWidthCalendarLayout || useFullWidthKanbanLayout;
  const compactGap = isPhone ? "12px" : isTablet ? "16px" : styles.container.gap;
  const compactPadding = isPhone ? "12px" : isTablet ? "16px" : styles.container.padding;
  const landscapeTabletColumns = "minmax(260px, 300px) minmax(0, 1fr)";

  const containerStyle = bgImage
    ? {
        ...styles.container,
        gridTemplateColumns: useStackedCompactLayout ? "1fr" : isTabletLandscape ? landscapeTabletColumns : "250px minmax(0, 1fr)",
        gap: compactGap,
        padding: compactPadding,
        minHeight: "100vh",
        height: "auto",
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }
    : {
        ...styles.container,
        gridTemplateColumns: useStackedCompactLayout ? "1fr" : isTabletLandscape ? landscapeTabletColumns : "250px minmax(0, 1fr)",
        gap: compactGap,
        padding: compactPadding,
        minHeight: "100vh",
        height: "auto",
      };

  const sidebarStyle = {
    ...styles.sidebar,
    gap: isPhone ? "12px" : styles.sidebar.gap,
    gridRow: useStackedCompactLayout ? "2" : styles.sidebar.gridRow,
    gridColumn: useStackedCompactLayout ? "1" : styles.sidebar.gridColumn,
    alignSelf: useStackedCompactLayout ? "start" : "stretch",
  };

  const mainContentStyle = {
    ...styles.panel,
    ...styles.mainContent,
    gridRow: useStackedCompactLayout ? "1" : styles.mainContent.gridRow,
    gridColumn: useStackedCompactLayout ? "1" : styles.mainContent.gridColumn,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: 0,
    minHeight: useStackedCompactLayout
      ? useFullWidthCalendarLayout || useFullWidthKanbanLayout
        ? '74vh'
        : isPhone
          ? '72vh'
          : isTablet
            ? '68vh'
            : 0
      : 0,
  };

  const sidebarPanelGridStyle = useStackedCompactLayout
    ? {
        display: 'grid',
        gridTemplateColumns: isPhone ? '1fr' : showMiniCalendar ? 'minmax(0, 0.9fr) minmax(0, 1.1fr)' : '1fr',
        gap: isPhone ? '12px' : '16px',
        alignItems: 'start',
      }
    : null;

  const tasksHeaderStyle = {
    ...styles.tasksHeader,
    flexWrap: 'wrap',
    gap: isPhone ? '10px' : '12px',
    alignItems: isPhone ? 'flex-start' : 'center',
  };

  const controlsBarStyle = {
    display: 'flex',
    gap: isPhone ? '12px' : '16px',
    padding: isPhone ? '12px 0' : '12px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    alignItems: isPhone ? 'stretch' : 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    flexDirection: isPhone ? 'column' : 'row',
  };

  const viewToggleGroupStyle = {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap',
  };

  const searchControlsStyle = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: isPhone ? '100%' : 'auto',
    flexWrap: 'wrap',
    justifyContent: isPhone ? 'flex-start' : 'flex-end',
  };

  const searchInputStyle = {
    background: SURFACE_BG,
    border: `1px solid ${SURFACE_BORDER}`,
    borderRadius: '6px',
    padding: '6px 12px',
    color: SURFACE_TEXT,
    fontSize: '0.9rem',
    outline: 'none',
    minWidth: isPhone ? 0 : '150px',
    width: isPhone ? '100%' : 'clamp(150px, 24vw, 240px)',
    transition: 'all 0.2s',
  };

  const settingsDialogStyle = {
    borderRadius: '16px',
    maxWidth: isPhone ? 'none' : '460px',
    width: isPhone ? 'calc(100% - 24px)' : '90%',
    maxHeight: '92vh',
    overflow: 'hidden',
    backdropFilter: 'blur(20px)',
    background: 'rgba(255,255,255,0.12)',
    border: '2px solid rgba(255,255,255,0.25)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  };

  const settingsHeaderStyle = {
    padding: isPhone ? '16px 16px 14px' : '20px 24px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.12)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
  };

  const settingsTabsStyle = {
    display: 'flex',
    padding: isPhone ? '0 10px' : '0 16px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    flexWrap: 'wrap',
  };

  const settingsPanelPadding = isPhone ? '16px' : '20px 24px';
  const settingsScrollableHeight = isPhone ? '60vh' : '480px';
  const filterPanelStyle = isPhone
    ? {
        position: 'fixed',
        left: '12px',
        right: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        width: 'auto',
        maxWidth: 'none',
        maxHeight: '70vh',
        overflowY: 'auto',
        background: 'rgba(178, 186, 181, 0.95)',
        border: '1px solid rgba(236,243,232,0.3)',
        borderRadius: '14px',
        padding: '14px',
        backdropFilter: 'blur(18px)',
        boxShadow: '0 14px 36px rgba(0, 0, 0, 0.28)',
        zIndex: 80,
      }
    : {
        position: 'absolute',
        top: '40px',
        right: 0,
        width: '320px',
        maxWidth: '90vw',
        background: 'rgba(178, 186, 181, 0.92)',
        border: '1px solid rgba(236,243,232,0.3)',
        borderRadius: '10px',
        padding: '12px',
        backdropFilter: 'blur(18px)',
        boxShadow: '0 10px 24px rgba(0, 0, 0, 0.28)',
        zIndex: 40,
      };
  const filterGridStyle = {
    display: 'grid',
    gridTemplateColumns: isPhone ? '1fr' : '1fr 1fr',
    gap: isPhone ? '10px' : '8px',
  };
  const addTasksDialogStyle = {
    ...styles.modal,
    maxWidth: isPhone ? 'none' : '500px',
    width: isPhone ? 'calc(100% - 24px)' : styles.modal.width,
    padding: isPhone ? '18px 16px' : styles.modal.padding,
    maxHeight: isPhone ? '78vh' : 'none',
    overflowY: isPhone ? 'auto' : 'visible',
  };

  return (
    <div style={containerStyle} data-dashboard-container>
      {/* LEFT SIDEBAR */}
      <aside style={sidebarStyle} aria-label="Sidebar panels">
        <div style={sidebarPanelGridStyle || undefined}>
          {/* Calendar */}
          {showMiniCalendar && (
            <div style={styles.panel}>
              <CalendarPanel />
            </div>
          )}

          {/* Progress */}
          <div style={styles.panel}>
            <ProgressPanel refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </aside>

      {/* RIGHT: Tasks */}
      <main style={mainContentStyle} aria-label="Task management workspace">
        <header style={tasksHeaderStyle}>
          <h2 style={{ ...styles.title, color: fontColor }}>Tasks Organized</h2>
          <div style={styles.headerIcons}>
            <button
              style={styles.headerButton}
              onClick={() => setShowSettings(true)}
              title="Settings"
              type="button"
              aria-label="Open settings"
            >
              <ToolOutlined />
            </button>
          </div>
        </header>

        {/* View Mode Toggle Buttons and Search */}
        <div style={controlsBarStyle}>
          <div style={viewToggleGroupStyle}>
            <button
              onClick={() => setViewMode('list')}
              type="button"
              aria-pressed={viewMode === 'list'}
              style={{
                background: 'none',
                border: 'none',
                color: viewMode === 'list' ? '#355c31' : SURFACE_MUTED,
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
              type="button"
              aria-pressed={viewMode === 'kanban'}
              style={{
                background: 'none',
                border: 'none',
                color: viewMode === 'kanban' ? '#355c31' : SURFACE_MUTED,
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
            <button
              onClick={() => setViewMode('calendar')}
              type="button"
              aria-pressed={viewMode === 'calendar'}
              style={{
                background: 'none',
                border: 'none',
                color: viewMode === 'calendar' ? '#355c31' : SURFACE_MUTED,
                fontSize: '1rem',
                cursor: 'pointer',
                fontWeight: viewMode === 'calendar' ? 'bold' : 'normal',
                textDecoration: viewMode === 'calendar' ? 'underline' : 'none',
                padding: '4px 8px',
                transition: 'all 0.2s'
              }}
            >
              Calendar
            </button>
          </div>
          <div style={searchControlsStyle}>
            <label htmlFor="dashboard-task-search" style={styles.srOnly}>Search tasks</label>
            <input
              id="dashboard-task-search"
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={searchInputStyle}
              onFocus={(e) => {
                e.currentTarget.style.background = SURFACE_BG_HOVER;
                e.currentTarget.style.borderColor = 'rgba(35, 49, 39, 0.32)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.background = SURFACE_BG;
                e.currentTarget.style.borderColor = SURFACE_BORDER;
              }}
            />
            <button
              onClick={() => setShowFilters((prev) => !prev)}
              type="button"
              aria-expanded={showFilters}
              aria-controls={filtersPanelId}
              style={{
                border: `1px solid ${SURFACE_BORDER}`,
                background: filterCount > 0 ? 'rgba(232, 239, 227, 0.98)' : SURFACE_BG,
                color: SURFACE_TEXT,
                borderRadius: '6px',
                fontSize: '0.85rem',
                padding: '6px 10px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              title="Open filters and sorting"
            >
              Filters{filterCount > 0 ? ` (${filterCount})` : ''}
            </button>

            {showFilters && (
              <div
                id={filtersPanelId}
                role="group"
                aria-label="Task filters and sorting"
                style={filterPanelStyle}
              >
                <div style={filterGridStyle}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-color, white)', display: 'block', marginBottom: '4px' }}>Status</label>
                    <select aria-label="Filter tasks by status" value={taskFilters.status} onChange={(e) => updateFilter('status', e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '6px', background: 'rgba(236, 242, 233, 0.22)', border: '1px solid rgba(255,255,255,0.28)', color: 'var(--text-color, white)' }}>
                      <option value="all">All</option>
                      <option value="to-do">To Do</option>
                      <option value="in-progress">In Progress</option>
                      <option value="done">Done</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-color, white)', display: 'block', marginBottom: '4px' }}>Priority</label>
                    <select aria-label="Filter tasks by priority" value={taskFilters.priority} onChange={(e) => updateFilter('priority', e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '6px', background: 'rgba(236, 242, 233, 0.22)', border: '1px solid rgba(255,255,255,0.28)', color: 'var(--text-color, white)' }}>
                      <option value="all">All</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-color, white)', display: 'block', marginBottom: '4px' }}>Category</label>
                    <select aria-label="Filter tasks by category" value={taskFilters.category} onChange={(e) => updateFilter('category', e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '6px', background: 'rgba(236, 242, 233, 0.22)', border: '1px solid rgba(255,255,255,0.28)', color: 'var(--text-color, white)' }}>
                      <option value="all">All</option>
                      <option value="ungrouped">Ungrouped</option>
                      {groupsForFilters.map((group) => (
                        <option key={group.id} value={String(group.id)}>{group.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-color, white)', display: 'block', marginBottom: '4px' }}>Due Date</label>
                    <select aria-label="Filter tasks by due date" value={taskFilters.dueDate} onChange={(e) => updateFilter('dueDate', e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '6px', background: 'rgba(236, 242, 233, 0.22)', border: '1px solid rgba(255,255,255,0.28)', color: 'var(--text-color, white)' }}>
                      <option value="any">Anytime</option>
                      <option value="today">Today</option>
                      <option value="this-week">This Week</option>
                      <option value="this-month">This Month</option>
                      <option value="past-due">Past Due</option>
                      <option value="no-date">No Date</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-color, white)', display: 'block', marginBottom: '4px' }}>Sort By</label>
                    <select aria-label="Sort tasks by field" value={taskSort.sortBy} onChange={(e) => updateSort('sortBy', e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '6px', background: 'rgba(236, 242, 233, 0.22)', border: '1px solid rgba(255,255,255,0.28)', color: 'var(--text-color, white)' }}>
                      <option value="due-date">Due Date</option>
                      <option value="priority">Priority</option>
                      <option value="alpha">Alphabetical</option>
                      <option value="date-added">Date Added</option>
                      <option value="modified">Modification</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-color, white)', display: 'block', marginBottom: '4px' }}>Order</label>
                    <select aria-label="Sort tasks direction" value={taskSort.direction} onChange={(e) => updateSort('direction', e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '6px', background: 'rgba(236, 242, 233, 0.22)', border: '1px solid rgba(255,255,255,0.28)', color: 'var(--text-color, white)' }}>
                      {taskSort.sortBy === 'due-date' && (
                        <>
                          <option value="asc">Ascending</option>
                          <option value="desc">Descending</option>
                        </>
                      )}
                      {taskSort.sortBy === 'priority' && (
                        <>
                          <option value="high">High to Low</option>
                          <option value="low">Low to High</option>
                        </>
                      )}
                      {taskSort.sortBy === 'alpha' && (
                        <>
                          <option value="az">A-Z</option>
                          <option value="za">Z-A</option>
                        </>
                      )}
                      {taskSort.sortBy === 'date-added' && (
                        <>
                          <option value="first">First</option>
                          <option value="last">Last</option>
                        </>
                      )}
                      {taskSort.sortBy === 'modified' && (
                        <>
                          <option value="recent">Recent</option>
                          <option value="not-recent">Not Recent</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', gap: '8px', flexDirection: isPhone ? 'column' : 'row' }}>
                  <button type="button" onClick={resetFiltersAndSort} style={{ flex: 1, padding: '7px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.12)', color: 'var(--text-color, white)', cursor: 'pointer' }}>
                    Reset
                  </button>
                  <button type="button" onClick={() => setShowFilters(false)} style={{ flex: 1, padding: '7px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.24)', background: 'rgba(255,255,255,0.2)', color: 'var(--text-color, white)', cursor: 'pointer' }}>
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Conditional View Rendering */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {viewMode === 'list' ? (
            <TasksPanel
              refreshTrigger={refreshTrigger}
              searchQuery={searchQuery}
              taskFilters={taskFilters}
              taskSort={taskSort}
              onTasksChanged={handleTasksChanged}
              onAddTasks={() => setShowAddTask(true)}
            />
          ) : viewMode === 'kanban' ? (
            <KanbanView
              refreshTrigger={refreshTrigger}
              searchQuery={searchQuery}
              taskFilters={taskFilters}
              taskSort={taskSort}
              onTasksChanged={handleTasksChanged}
              onAddTasks={() => setShowAddTask(true)}
            />
          ) : (
            <CalendarView
              refreshTrigger={refreshTrigger}
              searchQuery={searchQuery}
              taskFilters={taskFilters}
              onTasksChanged={handleTasksChanged}
            />
          )}
        </div>
      </main>

      {/* Add Task Modal */}
      {showAddTask && (
        <div style={styles.modalOverlay} onClick={() => setShowAddTask(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby={addTasksTitleId} style={addTasksDialogStyle} onClick={(e) => e.stopPropagation()}>
            <button
              style={styles.closeButton}
              onClick={() => setShowAddTask(false)}
              type="button"
              aria-label="Close add tasks dialog"
            >
              <CloseOutlined />
            </button>

            <h3 id={addTasksTitleId} style={styles.modalTitle}>Add Tasks</h3>

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
          <div role="dialog" aria-modal="true" aria-labelledby={settingsTitleId} style={settingsDialogStyle} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={settingsHeaderStyle}>
              <div>
                <div style={{ fontSize: '9px', letterSpacing: '4px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', fontWeight: 400 }}>Preferences</div>
                <h3 id={settingsTitleId} style={{ margin: 0, fontSize: '1.5rem', fontStyle: 'normal', fontFamily: 'inherit', color: 'var(--text-color, white)', lineHeight: 1 }}>Settings</h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                type="button"
                aria-label="Close settings dialog"
                style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-color, rgba(255,255,255,0.7))', fontSize: '0.85rem', transition: 'all 0.2s', flexShrink: 0 }}
              >
                <CloseOutlined />
              </button>
            </div>

            {/* Tabs */}
            <div style={settingsTabsStyle} role="tablist" aria-label="Settings tabs">
              {['display', 'alerts', 'plant-journal'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setSettingsTab(tab)}
                  type="button"
                  role="tab"
                  aria-selected={settingsTab === tab}
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
                  {tab === 'display' ? 'Display' : tab === 'alerts' ? 'Alerts' : 'Plant Journal'}
                </button>
              ))}
            </div>

            {/* Display tab*/}
            {settingsTab === 'display' && (
              <div style={{ padding: settingsPanelPadding, display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
                <div style={{ fontSize: '9px', letterSpacing: '4px', textTransform: 'uppercase', color: SETTINGS_SUBTLE, marginBottom: '2px' }}>Appearance</div>

                {/* Mini Calendar Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 14px', background: SETTINGS_PANEL, border: `1px solid ${SETTINGS_PANEL_BORDER}`, borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '30px', height: '30px', background: SETTINGS_PANEL_ALT, border: `1px solid ${SETTINGS_PANEL_BORDER}`, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: SETTINGS_TEXT, flexShrink: 0 }}><CalendarOutlined /></div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: SETTINGS_TEXT }}>Show Mini Calendar</div>
                      <div style={{ fontSize: '10px', color: SETTINGS_MUTED, marginTop: '2px' }}>Toggle sidebar calendar visibility</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-pressed={showMiniCalendar}
                    aria-label={showMiniCalendar ? 'Hide mini calendar' : 'Show mini calendar'}
                    onClick={() => setShowMiniCalendar(prev => !prev)}
                    style={{ width: '44px', height: '24px', borderRadius: '12px', background: showMiniCalendar ? 'var(--btn-color, #A7C4A0)' : 'rgba(255,255,255,0.15)', border: `1px solid ${showMiniCalendar ? 'var(--btn-color, #A7C4A0)' : 'rgba(255,255,255,0.2)'}`, position: 'relative', cursor: 'pointer', transition: 'all 0.3s', flexShrink: 0 }}
                  >
                    <div style={{ position: 'absolute', top: '3px', left: showMiniCalendar ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: 'white', transition: 'left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
                  </button>
                </div>

                {/* Background Color */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 14px', background: SETTINGS_PANEL, border: `1px solid ${SETTINGS_PANEL_BORDER}`, borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '30px', height: '30px', background: SETTINGS_PANEL_ALT, border: `1px solid ${SETTINGS_PANEL_BORDER}`, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: SETTINGS_TEXT, flexShrink: 0 }}>◉</div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: SETTINGS_TEXT }}>Background Color</div>
                      <div style={{ fontSize: '10px', color: SETTINGS_MUTED, marginTop: '2px' }}>Base theme color</div>
                    </div>
                  </div>
                  <input
                    type="color"
                    aria-label="Choose background color"
                    value={normalizeColor(bgColor)}
                    onChange={(e) => { const v = e.target.value; setBgColor(v); saveBackgroundToTheme(v, useGradient, gradientColor); }}
                    style={{ width: '36px', height: '36px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', cursor: 'pointer', padding: '2px', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }}
                  />
                </div>

                {/* Font Color */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 14px', background: SETTINGS_PANEL, border: `1px solid ${SETTINGS_PANEL_BORDER}`, borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '30px', height: '30px', background: SETTINGS_PANEL_ALT, border: `1px solid ${SETTINGS_PANEL_BORDER}`, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'serif', fontSize: '15px', fontWeight: 'bold', color: SETTINGS_TEXT, flexShrink: 0 }}>A</div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: SETTINGS_TEXT }}>Font Color</div>
                      <div style={{ fontSize: '10px', color: SETTINGS_MUTED, marginTop: '2px' }}>Text appearance</div>
                    </div>
                  </div>
                  <input
                    type="color"
                    aria-label="Choose font color"
                    value={fontColor}
                    onChange={(e) => setFontColor(e.target.value)}
                    style={{ width: '36px', height: '36px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', cursor: 'pointer', padding: '2px', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }}
                  />
                </div>

                {/* Gradient Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 14px', background: SETTINGS_PANEL, border: `1px solid ${SETTINGS_PANEL_BORDER}`, borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '30px', height: '30px', background: SETTINGS_PANEL_ALT, border: `1px solid ${SETTINGS_PANEL_BORDER}`, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 600, color: SETTINGS_TEXT, flexShrink: 0 }}>GR</div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: SETTINGS_TEXT }}>Gradient Background</div>
                      <div style={{ fontSize: '10px', color: SETTINGS_MUTED, marginTop: '2px' }}>Blend two colors</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-pressed={useGradient}
                    aria-label={useGradient ? 'Disable gradient background' : 'Enable gradient background'}
                    onClick={() => { const f = !useGradient; setUseGradient(f); saveBackgroundToTheme(bgColor, f, gradientColor); }}
                    style={{ width: '44px', height: '24px', borderRadius: '12px', background: useGradient ? 'var(--btn-color, #A7C4A0)' : 'rgba(255,255,255,0.15)', border: `1px solid ${useGradient ? 'var(--btn-color, #A7C4A0)' : 'rgba(255,255,255,0.2)'}`, position: 'relative', cursor: 'pointer', transition: 'all 0.3s', flexShrink: 0 }}
                  >
                    <div style={{ position: 'absolute', top: '3px', left: useGradient ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: 'white', transition: 'left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
                  </button>
                </div>

                {/* Gradient End Color */}
                {useGradient && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 14px', background: SETTINGS_PANEL, border: `1px solid ${SETTINGS_PANEL_BORDER}`, borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '30px', height: '30px', background: SETTINGS_PANEL_ALT, border: `1px solid ${SETTINGS_PANEL_BORDER}`, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: SETTINGS_TEXT, flexShrink: 0 }}>→</div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: SETTINGS_TEXT }}>Gradient End Color</div>
                        <div style={{ fontSize: '10px', color: SETTINGS_MUTED, marginTop: '2px' }}>Second blend color</div>
                      </div>
                    </div>
                    <input
                      type="color"
                      aria-label="Choose gradient end color"
                      value={normalizeColor(gradientColor)}
                      onChange={(e) => { setGradientColor(e.target.value); saveBackgroundToTheme(bgColor, true, e.target.value); }}
                      style={{ width: '36px', height: '36px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', cursor: 'pointer', padding: '2px', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }}
                    />
                  </div>
                )}

                {/* Background Image Upload */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 14px', background: SETTINGS_PANEL, border: `1px solid ${SETTINGS_PANEL_BORDER}`, borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '30px', height: '30px', background: SETTINGS_PANEL_ALT, border: `1px solid ${SETTINGS_PANEL_BORDER}`, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', color: SETTINGS_TEXT, flexShrink: 0 }}><PictureOutlined /></div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: SETTINGS_TEXT }}>Background Image</div>
                      <div style={{ fontSize: '10px', color: SETTINGS_MUTED, marginTop: '2px' }}>Image file — max ~4 MB</div>
                    </div>
                  </div>

                  {bgImage ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '8px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <img src={bgImage} alt="preview" style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '5px', flexShrink: 0 }} />
                        <span style={{ fontSize: '11px', color: SETTINGS_MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bgImageName}</span>
                      </div>
                      <button
                        onClick={clearBgImage}
                        type="button"
                        aria-label="Remove background image"
                        title="Remove image"
                        style={{ background: 'none', border: '1px solid rgba(255,255,255,0.28)', borderRadius: '6px', cursor: 'pointer', color: SETTINGS_MUTED, fontSize: '11px', padding: '4px 8px', flexShrink: 0, transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#e88080'; e.currentTarget.style.borderColor = '#e88080'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = SETTINGS_MUTED; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.28)'; }}
                      >Remove</button>
                    </div>
                  ) : (
                    <label
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '9px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                    >
                      <span style={{ color: SETTINGS_TEXT, fontSize: '16px', lineHeight: 1 }}>↑</span>
                      <span style={{ fontSize: '12px', color: SETTINGS_MUTED }}>Drop or click to browse…</span>
                      <input aria-label="Upload background image" type="file" accept="image/*,.png,.gif,.jpg,.jpeg,.webp" onChange={handleBgImageUpload} style={{ display: 'none' }} />
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* Alerts*/}
            {settingsTab === 'alerts' && (
              <div style={{ padding: settingsPanelPadding, display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: settingsScrollableHeight, overflowY: 'auto' }}>
                <div style={{ fontSize: '9px', letterSpacing: '4px', textTransform: 'uppercase', color: SETTINGS_SUBTLE, marginBottom: '2px' }}>Notifications</div>

                {/* Enable Notifications toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 14px', background: SETTINGS_PANEL, border: `1px solid ${SETTINGS_PANEL_BORDER}`, borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '30px', height: '30px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>🔔</div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: SETTINGS_TEXT }}>Enable Notifications</div>
                      <div style={{ fontSize: '10px', color: SETTINGS_MUTED, marginTop: '2px' }}>Push and in-app alerts</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-pressed={notificationsEnabled}
                    aria-label={notificationsEnabled ? 'Disable notifications' : 'Enable notifications'}
                    onClick={() => setNotificationsEnabled(prev => !prev)}
                    style={{ width: '44px', height: '24px', borderRadius: '12px', background: notificationsEnabled ? 'var(--btn-color, #A7C4A0)' : 'rgba(255,255,255,0.15)', border: `1px solid ${notificationsEnabled ? 'var(--btn-color, #A7C4A0)' : 'rgba(255,255,255,0.2)'}`, position: 'relative', cursor: 'pointer', transition: 'all 0.3s', flexShrink: 0 }}
                  >
                    <div style={{ position: 'absolute', top: '3px', left: notificationsEnabled ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: 'white', transition: 'left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
                  </button>
                </div>

                {/* Reminders panel */}
                {notificationsEnabled && (
                  <div style={{ background: SETTINGS_PANEL, border: `1px solid ${SETTINGS_PANEL_BORDER}`, borderRadius: '12px', padding: '14px' }}>
                    <div style={{ fontSize: '9px', letterSpacing: '4px', textTransform: 'uppercase', color: SETTINGS_MUTED, marginBottom: '10px' }}>Reminders</div>

                    {/* Existing reminders */}
                    {reminders.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                        {reminders.map(r => (
                          <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '9px', padding: '8px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: SETTINGS_MUTED, flexShrink: 0 }} />
                              <span style={{ fontSize: '12px', color: 'var(--text-color, white)' }}>{r.label}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{r.timeLabel}</span>
                              <button
                                onClick={() => deleteReminder(r.id)}
                                title="Remove"
                                type="button"
                                aria-label={`Remove reminder ${r.label}`}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: SETTINGS_SUBTLE, fontSize: '13px', padding: '0 2px', lineHeight: 1, transition: 'color 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.color = '#e88080'}
                                onMouseLeave={e => e.currentTarget.style.color = SETTINGS_SUBTLE}
                              >✕</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add reminder trigger */}
                    {!showAddReminder && (
                      <button
                        type="button"
                        onClick={() => setShowAddReminder(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', border: '1px dashed rgba(255,255,255,0.26)', borderRadius: '9px', cursor: 'pointer', background: 'rgba(255,255,255,0.04)', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.26)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                        aria-label="Add a reminder"
                      >
                        <span style={{ color: SETTINGS_TEXT, fontSize: '18px', lineHeight: 1, fontWeight: 300 }}>+</span>
                        <span style={{ fontSize: '12px', color: SETTINGS_MUTED }}>Add a reminder...</span>
                      </button>
                    )}

                    {/* Add reminder form */}
                    {showAddReminder && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: SETTINGS_PANEL, border: `1px solid ${SETTINGS_PANEL_BORDER}`, borderRadius: '9px', padding: '12px' }}>
                        <label htmlFor="settings-reminder-type" style={{ fontSize: '11px', color: SETTINGS_MUTED }}>Reminder type</label>
                        <select
                          id="settings-reminder-type"
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
                            <label htmlFor="settings-reminder-amount" style={styles.srOnly}>Reminder amount</label>
                            <input
                              id="settings-reminder-amount"
                              type="number"
                              min="1"
                              max="9999"
                              value={newRemAmount}
                              onChange={e => setNewRemAmount(Number(e.target.value) || 1)}
                              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '7px', color: 'var(--text-color, white)', fontSize: '14px', padding: '6px 10px', outline: 'none', width: '64px', textAlign: 'center' }}
                            />
                            <label htmlFor="settings-reminder-unit" style={styles.srOnly}>Reminder unit</label>
                            <select
                              id="settings-reminder-unit"
                              value={newRemUnit}
                              onChange={e => setNewRemUnit(e.target.value)}
                              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '7px', color: 'var(--text-color, white)', fontFamily: 'inherit', fontSize: '12px', padding: '7px 10px', cursor: 'pointer', outline: 'none' }}
                            >
                              <option value="minutes">minutes</option>
                              <option value="hours">hours</option>
                              <option value="days">days</option>
                              <option value="weeks">weeks</option>
                            </select>
                            <span style={{ fontSize: '11px', color: SETTINGS_MUTED }}>before</span>
                          </div>
                        )}

                        {(newRemType === 'dayof' || newRemType === 'daily') && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '11px', color: SETTINGS_MUTED }}>At</span>
                            <label htmlFor="settings-reminder-time" style={styles.srOnly}>Reminder time</label>
                            <input
                              id="settings-reminder-time"
                              type="time"
                              value={newRemTime}
                              onChange={e => setNewRemTime(e.target.value)}
                              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '7px', color: 'var(--text-color, white)', fontSize: '13px', padding: '6px 10px', outline: 'none' }}
                            />
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={addReminder}
                            style={{ padding: '7px 16px', borderRadius: '7px', background: SETTINGS_PANEL_ALT, border: '1px solid rgba(255,255,255,0.3)', color: SETTINGS_TEXT, fontFamily: 'inherit', fontSize: '11px', letterSpacing: '1px', cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                            onMouseLeave={e => e.currentTarget.style.background = SETTINGS_PANEL_ALT}
                          >Add</button>
                          <button
                            type="button"
                            onClick={() => { setShowAddReminder(false); setNewRemType('before'); setNewRemAmount(15); setNewRemUnit('minutes'); setNewRemTime('09:00'); }}
                            style={{ padding: '7px 14px', borderRadius: '7px', background: 'transparent', border: '1px solid rgba(255,255,255,0.22)', color: SETTINGS_MUTED, fontFamily: 'inherit', fontSize: '11px', cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.color = SETTINGS_TEXT}
                            onMouseLeave={e => e.currentTarget.style.color = SETTINGS_MUTED}
                          >Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {settingsTab === 'plant-journal' && (
              <div style={{ padding: settingsPanelPadding, display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: settingsScrollableHeight, overflowY: 'auto' }}>
                <div style={{ fontSize: '9px', letterSpacing: '4px', textTransform: 'uppercase', color: SETTINGS_SUBTLE, marginBottom: '2px' }}>Plant Journal</div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-color, white)' }}>Current reward</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.72)' }}>
                    Plant: {activeJournalPlant?.name || 'None selected'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.72)' }}>
                    Pot: {activeJournalPot?.name || 'None selected'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.72)' }}>
                    Started: {formatJournalDateTime(activeRewardSnapshot?.startedAt)}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.72)' }}>
                    Status: {activeRewardSnapshot?.step === REWARD_FLOW.COMPLETE ? 'Completed' : activeRewardSnapshot?.selectedPlantId ? 'Growing' : 'Not started'}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-color, white)' }}>Completed plants</div>
                  {plantJournalEntries.length === 0 ? (
                    <div style={{ padding: '12px 14px', background: SETTINGS_PANEL, border: `1px solid ${SETTINGS_PANEL_BORDER}`, borderRadius: '12px', fontSize: '12px', color: SETTINGS_MUTED }}>
                      No completed plant rewards yet.
                    </div>
                  ) : (
                    plantJournalEntries.map((entry) => (
                      <div key={entry.id} style={{ display: 'flex', flexDirection: isPhone ? 'column' : 'row', gap: '12px', alignItems: isPhone ? 'stretch' : 'flex-start', padding: '12px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                        <div style={{ width: '64px', height: '64px', flexShrink: 0, borderRadius: '10px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          {getJournalEntryImage(entry) ? (
                            <img src={getJournalEntryImage(entry)} alt={`${entry.plantName} in ${entry.potName}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          ) : null}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-color, white)' }}>{entry.plantName}</div>
                            <div style={{ fontSize: '11px', color: SETTINGS_MUTED }}>{formatDuration(entry.durationMs)}</div>
                          </div>
                          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.72)' }}>Pot: {entry.potName}</div>
                          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.72)' }}>Started: {formatJournalDateTime(entry.startedAt)}</div>
                          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.72)' }}>Finished: {formatJournalDateTime(entry.completedAt)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
