import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Calendar } from "antd";
import dayjs from "dayjs";
import { apiFetch } from "../api";
import "./CalendarView.css";
import useViewport from "../hooks/useViewport";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const VIEW_OPTIONS = [
  { id: "day", label: "day" },
  { id: "week", label: "week" },
  { id: "month", label: "month" },
  { id: "year", label: "year" },
];

const PRIORITY_BADGE_STATUS = {
  high: "error",
  medium: "warning",
  low: "success",
};

const TASK_REMINDER_OPTIONS = [
  { value: "", label: "No reminder" },
  { value: "0", label: "At due time" },
  { value: "5", label: "5 minutes before" },
  { value: "15", label: "15 minutes before" },
  { value: "30", label: "30 minutes before" },
  { value: "60", label: "1 hour before" },
  { value: "1440", label: "1 day before" },
  { value: "10080", label: "1 week before" },
];

function dateKeyFromDate(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dateKeyFromIso(isoString) {
  if (!isoString) return null;
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) return null;
  return dateKeyFromDate(parsed);
}

function toApiDueDate(dateStr, timeStr) {
  if (!dateStr) return null;
  const combined = `${dateStr}T${timeStr || "09:00"}`;
  const parsed = new Date(combined);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function titleForRange(mode, baseDate) {
  if (mode === "day") {
    return baseDate.format("dddd, MMMM D, YYYY");
  }
  if (mode === "week") {
    const start = baseDate.startOf("week");
    const end = start.add(6, "day");
    return `${start.format("MMM D")} - ${end.format("MMM D, YYYY")}`;
  }
  if (mode === "month") {
    return baseDate.format("MMMM YYYY");
  }
  return baseDate.format("YYYY");
}

export default function CalendarView({
  refreshTrigger,
  onTasksChanged,
  searchQuery = "",
  taskFilters,
}) {
  const { isPhone, isTablet, isCompact, isLandscape } = useViewport();
  const [tasks, setTasks] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("month");
  const [anchorDate, setAnchorDate] = useState(dayjs());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null); // task object being edited
  const [editDraft, setEditDraft] = useState(null);    // mutable copy of editingTask fields
  const [titleDropdown, setTitleDropdown] = useState(null); // null | 'month' | 'year'
  const titleRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!titleDropdown) return;
    const handler = (e) => {
      if (titleRef.current && !titleRef.current.contains(e.target)) {
        setTitleDropdown(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [titleDropdown]);
  const [draftTask, setDraftTask] = useState({
    title: "",
    date: dayjs().format("YYYY-MM-DD"),
    time: "09:00",
    priority: "",
    group_id: "",
  });

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [taskData, groupData] = await Promise.all([
        apiFetch("/tasks"),
        apiFetch("/task-groups"),
      ]);
      setTasks(Array.isArray(taskData) ? taskData : []);
      setGroups(Array.isArray(groupData) ? groupData : []);
    } catch (err) {
      console.error("Calendar data load error:", err);
      setError("Failed to load calendar tasks.");
    } finally {
      setLoading(false);
    }
  };

  const getPriorityValue = (task) => {
    if (!task || task.priority == null || task.priority === "") return 0;
    const raw = String(task.priority).toLowerCase();
    if (raw === "high") return 3;
    if (raw === "medium") return 2;
    if (raw === "low") return 1;
    const parsed = Number(task.priority);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const isOverdueTask = (task) => {
    if (!task?.due_date) return false;
    if (task.status === "completed") return false;
    const due = new Date(task.due_date);
    return !Number.isNaN(due.getTime()) && due.getTime() < Date.now();
  };

  const filteredTasks = useMemo(() => {
    const safeFilters = taskFilters || {
      status: "all",
      priority: "all",
      category: "all",
      dueDate: "any",
    };
    const query = (searchQuery || "").trim().toLowerCase();
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const weekStart = new Date(dayStart);
    weekStart.setDate(dayStart.getDate() - dayStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    let result = tasks.filter((task) => {
      if (!query) return true;
      return (task.title || "").toLowerCase().includes(query);
    });

    if (safeFilters.status === "to-do") {
      result = result.filter(
        (task) => task.status !== "completed" && task.status !== "in-progress",
      );
    } else if (safeFilters.status === "in-progress") {
      result = result.filter((task) => task.status === "in-progress");
    } else if (safeFilters.status === "done") {
      result = result.filter((task) => task.status === "completed");
    } else if (safeFilters.status === "overdue") {
      result = result.filter((task) => isOverdueTask(task));
    }

    if (safeFilters.priority !== "all") {
      const target = safeFilters.priority === "high" ? 3 : safeFilters.priority === "medium" ? 2 : 1;
      result = result.filter((task) => getPriorityValue(task) === target);
    }

    if (safeFilters.category === "ungrouped") {
      result = result.filter((task) => !task.group_id);
    } else if (safeFilters.category !== "all") {
      const targetGroupId = Number(safeFilters.category);
      result = result.filter((task) => Number(task.group_id) === targetGroupId);
    }

    if (safeFilters.dueDate === "today") {
      result = result.filter((task) => {
        if (!task.due_date) return false;
        const due = new Date(task.due_date);
        return due >= dayStart && due < dayEnd;
      });
    } else if (safeFilters.dueDate === "this-week") {
      result = result.filter((task) => {
        if (!task.due_date) return false;
        const due = new Date(task.due_date);
        return due >= weekStart && due < weekEnd;
      });
    } else if (safeFilters.dueDate === "this-month") {
      result = result.filter((task) => {
        if (!task.due_date) return false;
        const due = new Date(task.due_date);
        return due >= monthStart && due < nextMonthStart;
      });
    } else if (safeFilters.dueDate === "past-due") {
      result = result.filter((task) => isOverdueTask(task));
    } else if (safeFilters.dueDate === "no-date") {
      result = result.filter((task) => !task.due_date);
    }

    // Calendar can only render tasks that have actual due dates.
    return result.filter((task) => !!task?.due_date);
  }, [tasks, searchQuery, taskFilters]);

  const tasksByDate = useMemo(() => {
    const byDate = new Map();
    filteredTasks.forEach((task) => {
      const key = dateKeyFromIso(task.due_date);
      if (!key) return;
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key).push(task);
    });
    return byDate;
  }, [filteredTasks]);

  const groupColorById = useMemo(() => {
    const map = new Map();
    groups.forEach((group) => {
      map.set(Number(group.id), group.color || "var(--text-color, #2A2A2A)");
    });
    return map;
  }, [groups]);

  const tasksForDay = (date) => {
    const key = typeof date === "string" ? date : date.format("YYYY-MM-DD");
    return tasksByDate.get(key) || [];
  };

  const monthTaskCount = (date) => {
    const prefix = date.format("YYYY-MM-");
    let count = 0;
    tasksByDate.forEach((items, key) => {
      if (key.startsWith(prefix)) count += items.length;
    });
    return count;
  };

  const openEditModal = (task, e) => {
    e?.stopPropagation();
    const due = task.due_date ? new Date(task.due_date) : null;
    setEditDraft({
      title: task.title || "",
      date: due ? dateKeyFromDate(due) : "",
      time: due ? `${String(due.getHours()).padStart(2,"0")}:${String(due.getMinutes()).padStart(2,"0")}` : "09:00",
      priority: task.priority || "",
      group_id: task.group_id != null ? String(task.group_id) : "",
      status: task.status || "pending",
      reminder_offset_minutes: due ? (task.reminder_offset_minutes ?? 15) : null,
    });
    setEditingTask(task);
  };

  const submitEditTask = async () => {
    if (!editDraft.title.trim()) { alert("Please enter a task title."); return; }
    try {
      const updated = await apiFetch(`/tasks/${editingTask.id}`, {
        method: "PUT",
        body: {
          title: editDraft.title.trim(),
          due_date: toApiDueDate(editDraft.date, editDraft.time),
          priority: editDraft.priority || null,
          group_id: editDraft.group_id ? Number(editDraft.group_id) : null,
          status: editDraft.status || "pending",
          reminder_offset_minutes: editDraft.date
            ? (editDraft.reminder_offset_minutes ?? 15)
            : null,
        },
      });
      setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t));
      setEditingTask(null);
      onTasksChanged?.();
    } catch (err) {
      console.error("Update task error:", err);
      alert("Failed to update task.");
    }
  };

  const deleteTask = async () => {
    if (!window.confirm("Delete this task?")) return;
    try {
      await apiFetch(`/tasks/${editingTask.id}`, { method: "DELETE" });
      setTasks((prev) => prev.filter((t) => t.id !== editingTask.id));
      setEditingTask(null);
      onTasksChanged?.();
    } catch (err) {
      console.error("Delete task error:", err);
      alert("Failed to delete task.");
    }
  };

  const openAddTaskModal = (date) => {
    setDraftTask((prev) => ({
      ...prev,
      date: date.format("YYYY-MM-DD"),
      time: prev.time || "09:00",
    }));
    setShowAddModal(true);
  };

  const submitAddTask = async () => {
    const title = draftTask.title.trim();
    if (!title) {
      alert("Please enter a task title.");
      return;
    }

    try {
      const created = await apiFetch("/tasks", {
        method: "POST",
        body: {
          title,
          due_date: toApiDueDate(draftTask.date, draftTask.time),
          priority: draftTask.priority || null,
          group_id: draftTask.group_id ? Number(draftTask.group_id) : null,
        },
      });

      setTasks((prev) => [...prev, created]);
      setShowAddModal(false);
      setDraftTask((prev) => ({ ...prev, title: "" }));
      onTasksChanged?.();
    } catch (err) {
      console.error("Create task error:", err);
      alert("Failed to create task.");
    }
  };

  const stepDate = (direction) => {
    if (viewMode === "day") {
      setAnchorDate((prev) => prev.add(direction, "day"));
      return;
    }
    if (viewMode === "week") {
      setAnchorDate((prev) => prev.add(direction, "week"));
      return;
    }
    if (viewMode === "month") {
      setAnchorDate((prev) => prev.add(direction, "month"));
      return;
    }
    setAnchorDate((prev) => prev.add(direction, "year"));
  };

  const resetToToday = () => {
    setAnchorDate(dayjs());
  };

  const renderTaskBadges = (list) => {
    if (!list.length) return null;

    const visible = list.slice(0, 2);
    const overflow = list.length - visible.length;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {visible.map((item) => (
          <div
            key={item.id}
            onClick={(e) => openEditModal(item, e)}
            style={{
              background: groupColorById.get(Number(item.group_id)) || "rgba(100,120,200,0.55)",
              color: "#fff",
              fontSize: "0.68rem",
              fontWeight: 600,
              padding: "1px 5px",
              borderRadius: "3px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              opacity: item.status === "completed" ? 0.55 : 1,
              textDecoration: item.status === "completed" ? "line-through" : "none",
              cursor: "pointer",
            }}
            title={item.title}
          >
            {item.title}
          </div>
        ))}
        {overflow > 0 && (
          <div style={{ fontSize: "0.62rem", color: "var(--text-color, rgba(255,255,255,0.5))", paddingLeft: "2px" }}>
            +{overflow} more
          </div>
        )}
      </div>
    );
  };

  const monthCellRender = (value) => {
    const count = monthTaskCount(value);
    const isYearView = viewMode === "year";
    const cellStyle = {
      textAlign: "center",
      marginTop: "6px",
      ...(isYearView && {
        cursor: "pointer",
        padding: "6px",
        borderRadius: "4px",
        transition: "background 0.2s",
      }),
    };
    const content = count ? (
      <div style={cellStyle}
        onMouseEnter={(e) => isYearView && (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
        onMouseLeave={(e) => isYearView && (e.currentTarget.style.background = "transparent")}
        onClick={() => {
          if (isYearView) {
            setAnchorDate(value);
            setViewMode("month");
          }
        }}
      >
        <section style={{ fontWeight: 700, color: "var(--text-color, #2A2A2A)" }}>{count}</section>
        <span style={{ fontSize: "0.72rem", color: "var(--text-color, rgba(42,42,42,0.7))" }}>tasks</span>
      </div>
    ) : isYearView ? (
      <div style={{ ...cellStyle, width: "100%", height: "100%", display: "flex", alignItems: "flex-start", justifyContent: "center" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        onClick={() => {
          setAnchorDate(value);
          setViewMode("month");
        }}
      />
    ) : null;
    return content;
  };

  const dateCellRender = (value) => {
    const list = tasksForDay(value);
    if (!list.length) return null;
    return <div style={{ marginTop: "2px" }}>{renderTaskBadges(list)}</div>;
  };

  const cellRender = (current, info) => {
    if (info.type === "date") return dateCellRender(current);
    if (info.type === "month") return monthCellRender(current);
    return info.originNode;
  };

  const tasksForHour = (date, hour) => {
    const dateKey = date.format("YYYY-MM-DD");
    const dayTasks = tasksByDate.get(dateKey) || [];
    return dayTasks.filter((task) => {
      if (!task.due_date) return false;
      return new Date(task.due_date).getHours() === hour;
    });
  };

  const rangeDays = useMemo(() => {
    if (viewMode === "week") {
      const start = anchorDate.startOf("week");
      return Array.from({ length: 7 }, (_, idx) => start.add(idx, "day"));
    }
    return [];
  }, [anchorDate, viewMode]);

  // Year view: 12 mini-calendars
  const yearMonths = useMemo(() => {
    const months = [];
    for (let m = 0; m < 12; m++) {
      const month = dayjs().year(anchorDate.year()).month(m);
      const start = month.startOf("month").startOf("week");
      const end = month.endOf("month").endOf("week");
      const days = [];
      let cur = start;
      while (cur.isBefore(end) || cur.isSame(end, "day")) {
        days.push(cur);
        cur = cur.add(1, "day");
      }
      const weeks = [];
      for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
      months.push({ month, weeks });
    }
    return months;
  }, [anchorDate]);

  // Custom month grid — rows guaranteed equal height via CSS grid 1fr
  const monthGrid = useMemo(() => {
    const start = anchorDate.startOf("month").startOf("week");
    const end = anchorDate.endOf("month").endOf("week");
    const days = [];
    let cur = start;
    while (cur.isBefore(end) || cur.isSame(end, "day")) {
      days.push(cur);
      cur = cur.add(1, "day");
    }
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
    return weeks;
  }, [anchorDate]);

  const isCompactLandscape = isLandscape && (isPhone || isTablet);
  const monthColumnTemplate = isCompactLandscape
    ? "repeat(7, minmax(0, 1fr))"
    : isCompact
      ? `repeat(7, minmax(${isPhone ? 84 : 96}px, 1fr))`
      : "repeat(7, 1fr)";
  const weekColumnMinWidth = isCompactLandscape ? 0 : isPhone ? 112 : isTablet ? 126 : 140;
  const weekColumnTemplate = isCompactLandscape
    ? `repeat(${rangeDays.length}, minmax(0, 1fr))`
    : `repeat(${rangeDays.length}, minmax(${weekColumnMinWidth}px, 1fr))`;
  const yearColumnTemplate = isPhone
    ? "minmax(0, 1fr)"
    : isTablet
      ? "repeat(2, minmax(240px, 1fr))"
      : "repeat(4, minmax(220px, 1fr))";
  const surfaceOverflow = viewMode === "day" ? "hidden" : "auto";
  const headerGap = isCompactLandscape ? "6px" : "8px";
  const headerPaddingBottom = isCompactLandscape ? "6px" : "8px";
  const titleFontSize = isCompactLandscape ? "0.9rem" : "1rem";
  const titleButtonGap = isCompactLandscape ? "4px" : "6px";
  const navPadding = isCompactLandscape ? "4px 6px" : navButtonStyle.padding;
  const monthHeaderRowHeight = isCompactLandscape ? 26 : 30;
  const monthCellPadding = isCompactLandscape ? "3px 4px" : "4px 6px";
  const monthDayFontSize = isCompactLandscape ? "11px" : "12px";
  const monthBadgeFontSize = isCompactLandscape ? "0.6rem" : "0.68rem";
  const weekSectionPadding = isCompactLandscape ? "6px" : "8px";
  const weekHeaderFontSize = isCompactLandscape ? "0.68rem" : "0.75rem";
  const weekDateFontSize = isCompactLandscape ? "0.88rem" : "1rem";
  const weekCardMinHeight = isCompactLandscape ? "96px" : "120px";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", height: "100%", padding: "0" }}>
      {/* Single Header Row: Nav | Title | View Buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: headerGap, paddingBottom: headerPaddingBottom, borderBottom: "1px solid rgba(255,255,255,0.1)", flexWrap: "wrap" }}>
        {/* Navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
          <button style={{ ...navButtonStyle, padding: navPadding, fontSize: isCompactLandscape ? "0.74rem" : navButtonStyle.fontSize }} onClick={() => stepDate(-1)}>‹</button>
          <button style={{ ...navButtonStyle, fontWeight: 600, padding: navPadding, fontSize: isCompactLandscape ? "0.74rem" : navButtonStyle.fontSize }} onClick={resetToToday}>today</button>
          <button style={{ ...navButtonStyle, padding: navPadding, fontSize: isCompactLandscape ? "0.74rem" : navButtonStyle.fontSize }} onClick={() => stepDate(1)}>›</button>
        </div>

        {/* Title — clickable in month/year view */}
        <div ref={titleRef} style={{ flex: 1, textAlign: "center", minWidth: 0, position: "relative" }}>
          {(viewMode === "month") ? (
            /* Month view: month name + year, each independently clickable */
            <span style={{ display: "inline-flex", alignItems: "center", gap: titleButtonGap, fontWeight: 700, fontSize: titleFontSize }}>
              <button
                onClick={() => setTitleDropdown(titleDropdown === "month" ? null : "month")}
                style={{ ...titlePartBtnStyle, fontSize: titleFontSize, color: titleDropdown === "month" ? "var(--btn-color, #A7C4A0)" : "var(--text-color, white)" }}
              >
                {anchorDate.format("MMMM")} ▾
              </button>
              <button
                onClick={() => setTitleDropdown(titleDropdown === "year" ? null : "year")}
                style={{ ...titlePartBtnStyle, fontSize: titleFontSize, color: titleDropdown === "year" ? "var(--btn-color, #A7C4A0)" : "var(--text-color, white)" }}
              >
                {anchorDate.format("YYYY")} ▾
              </button>
            </span>
          ) : (viewMode === "year") ? (
            /* Year view: just year, clickable */
            <button
              onClick={() => setTitleDropdown(titleDropdown === "year" ? null : "year")}
              style={{ ...titlePartBtnStyle, fontWeight: 700, fontSize: titleFontSize, color: titleDropdown === "year" ? "var(--btn-color, #A7C4A0)" : "var(--text-color, white)" }}
            >
              {anchorDate.format("YYYY")} ▾
            </button>
          ) : (
            <span style={{ color: "var(--text-color, #2A2A2A)", fontWeight: 700, fontSize: titleFontSize, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {titleForRange(viewMode, anchorDate)}
            </span>
          )}

          {/* Month picker dropdown */}
          {titleDropdown === "month" && (
            <div style={dropdownStyle}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "4px" }}>
                {MONTHS.map((name, idx) => (
                  <button
                    key={name}
                    onClick={() => { setAnchorDate(anchorDate.month(idx)); setTitleDropdown(null); }}
                    style={{
                      ...dropdownItemStyle,
                      background: anchorDate.month() === idx ? "rgba(255,255,255,0.18)" : "transparent",
                      color: anchorDate.month() === idx ? "var(--btn-color, #A7C4A0)" : "var(--text-color, white)",
                      fontWeight: anchorDate.month() === idx ? 700 : 400,
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Year picker dropdown */}
          {titleDropdown === "year" && (
            <div style={dropdownStyle}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "4px" }}>
                {Array.from({ length: 12 }, (_, i) => anchorDate.year() - 5 + i).map((yr) => (
                  <button
                    key={yr}
                    onClick={() => { setAnchorDate(anchorDate.year(yr)); setTitleDropdown(null); }}
                    style={{
                      ...dropdownItemStyle,
                      background: anchorDate.year() === yr ? "rgba(255,255,255,0.18)" : "transparent",
                      color: anchorDate.year() === yr ? "var(--btn-color, #A7C4A0)" : "var(--text-color, white)",
                      fontWeight: anchorDate.year() === yr ? 700 : 400,
                    }}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* View Mode Buttons */}
        <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => setViewMode(option.id)}
              style={{
                ...navButtonStyle,
                padding: navPadding,
                fontSize: isCompactLandscape ? "0.74rem" : navButtonStyle.fontSize,
                background: viewMode === option.id ? "rgba(255,255,255,0.18)" : navButtonStyle.background,
                color: viewMode === option.id ? "var(--btn-color, #A7C4A0)" : "var(--text-color, rgba(255,255,255,0.6))",
                fontWeight: viewMode === option.id ? "700" : "500",
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: surfaceOverflow,
          borderRadius: "8px",
          border: "1px solid rgba(255,255,255,0.14)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {loading ? (
          <div style={{ color: "var(--text-color, rgba(255,255,255,0.8))", padding: "20px" }}>Loading calendar...</div>
        ) : error ? (
          <div style={{ color: "#ff6b6b", padding: "20px" }}>{error}</div>
        ) : viewMode === "month" ? (
          /* ── Custom month grid — equal-height rows via CSS grid 1fr ── */
          <div style={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: monthColumnTemplate,
            gridTemplateRows: `${monthHeaderRowHeight}px repeat(${monthGrid.length}, 1fr)`,
            overflow: "hidden",
            width: isCompactLandscape ? "100%" : isCompact ? "max-content" : "100%",
            minWidth: isCompactLandscape ? 0 : isCompact ? "100%" : 0,
          }}>
            {/* Day-of-week headers */}
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d, i) => (
              <div key={d} style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: isCompactLandscape ? "10px" : "11px", fontWeight: 600, textTransform: "uppercase",
                letterSpacing: "0.5px", color: "var(--text-color, rgba(255,255,255,0.5))",
                background: "rgba(255,255,255,0.04)",
                borderBottom: "2px solid rgba(255,255,255,0.2)",
                borderRight: "1px solid rgba(255,255,255,0.14)",
                borderLeft: i === 0 ? "1px solid rgba(255,255,255,0.14)" : "none",
              }}>{d}</div>
            ))}
            {/* Day cells */}
            {monthGrid.flat().map((day) => {
              const inMonth = day.month() === anchorDate.month();
              const isToday = day.isSame(dayjs(), "day");
              const dayTasks = tasksForDay(day);
              const monthCellBackground = isToday
                ? "rgba(160, 183, 196, 0.24)"
                : "transparent";
              return (
                <div
                  key={day.format("YYYY-MM-DD")}
                  onClick={() => inMonth && openAddTaskModal(day)}
                  style={{
                    visibility: inMonth ? "visible" : "hidden",
                    display: "flex", flexDirection: "column",
                    padding: monthCellPadding,
                    overflow: "hidden",
                    cursor: inMonth ? "pointer" : "default",
                    background: monthCellBackground,
                    borderLeft: day.day() === 0 ? "1px solid rgba(255,255,255,0.14)" : "none",
                    borderRight: isToday ? "1px solid rgba(155, 186, 215, 0.55)" : "1px solid rgba(255,255,255,0.14)",
                    borderBottom: isToday ? "1px solid rgba(164, 213, 225, 0.55)" : "1px solid rgba(255,255,255,0.14)",
                    boxSizing: "border-box",
                    boxShadow: isToday ? "inset 0 0 0 1px rgba(168, 197, 232, 0.55)" : "none",
                    transition: "background 0.2s ease, box-shadow 0.2s ease",
                  }}
                >
                  <div style={{
                    fontSize: monthDayFontSize,
                    fontWeight: isToday ? 700 : 500,
                    lineHeight: "1.4",
                    flexShrink: 0,
                    color: isToday ? "var(--btn-color, #a0bdc4)" : "var(--text-color, rgba(255,255,255,0.75))",
                  }}>
                    {day.format("D")}
                  </div>
                  <div style={{ flex: 1, minHeight: 0, overflow: "hidden", fontSize: monthBadgeFontSize }}>
                    {renderTaskBadges(dayTasks)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === "year" ? (
          /* Year view: 4x3 grid of mini-calendars */
          <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: isPhone ? "12px" : "16px", display: "grid", gridTemplateColumns: yearColumnTemplate, gap: isPhone ? "12px" : "16px" }}>
            {yearMonths.map(({ month, weeks }) => {
              const monthStr = month.format("MMMM");
              const yearStr = month.format("YYYY");
              return (
                <div key={month.format("YYYY-MM")} style={{
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  padding: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}>
                  {/* Month title */}
                  <div style={{
                    textAlign: "center",
                    cursor: "pointer",
                    padding: "4px",
                    borderRadius: "4px",
                    transition: "background 0.2s",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    color: "var(--text-color, white)",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  onClick={() => { setAnchorDate(month); setViewMode("month"); }}
                  >
                    {monthStr}
                  </div>

                  {/* Mini calendar */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", fontSize: "0.75rem" }}>
                    {/* Day headers */}
                    {["S","M","T","W","T","F","S"].map((d) => (
                      <div key={d} style={{ textAlign: "center", fontWeight: 600, color: "rgba(255,255,255,0.5)", padding: "2px 0" }}>{d}</div>
                    ))}
                    {/* Days */}
                    {weeks.flat().map((day) => {
                      const inMonth = day.month() === month.month();
                      const dayTasks = tasksForDay(day);
                      const hasTask = dayTasks.length > 0;
                      const taskColor = hasTask ? groupColorById.get(Number(dayTasks[0].group_id)) || "rgba(100,120,200,0.7)" : "transparent";
                      const isToday = day.isSame(dayjs(), "day");
                      
                      return (
                        <div
                          key={day.format("YYYY-MM-DD")}
                          onClick={() => {
                            if (hasTask) {
                              setAnchorDate(day);
                              setViewMode("day");
                            } else if (inMonth) {
                              openAddTaskModal(day);
                            }
                          }}
                          style={{
                            aspectRatio: "1",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "3px",
                            background: hasTask ? taskColor : (inMonth ? "transparent" : "transparent"),
                            color: inMonth ? "var(--text-color, white)" : "rgba(255,255,255,0.3)",
                            fontWeight: isToday ? 700 : 500,
                            cursor: (hasTask || inMonth) ? "pointer" : "default",
                            fontSize: "0.7rem",
                            border: isToday ? "2px solid var(--btn-color, #A7C4A0)" : "1px solid rgba(255,255,255,0.1)",
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            if (hasTask || inMonth) {
                              e.currentTarget.style.background = hasTask ? taskColor : "rgba(255,255,255,0.08)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = hasTask ? taskColor : "transparent";
                          }}
                          title={hasTask ? dayTasks.map(t => t.title).join(", ") : ""}
                        >
                          {day.format("D")}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === "day" ? (
          /* Day View - Hourly Time Slots */
          <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
            {/* Day Header */}
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px", padding: "10px 12px 8px", borderBottom: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", flexShrink: 0 }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-color, rgba(255,255,255,0.5))", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 600 }}>
                {anchorDate.format("ddd")}
              </div>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text-color, white)", lineHeight: 1 }}>
                {anchorDate.format("D")}
              </div>
            </div>

            {/* Hourly Rows */}
            <div style={{ overflow: "auto", flex: 1 }}>
              {Array.from({ length: 24 }, (_, hour) => {
                const hourTasks = tasksForHour(anchorDate, hour);
                const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                const ampm = hour < 12 ? "AM" : "PM";
                const timeLabel = hour === 0 ? "" : `${h12} ${ampm}`;
                return (
                  <div
                    key={hour}
                    style={{ display: "flex", minHeight: hourTasks.length > 0 ? "auto" : "44px", borderBottom: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", transition: "background 0.15s" }}
                    onClick={() => {
                      setDraftTask((prev) => ({ ...prev, date: anchorDate.format("YYYY-MM-DD"), time: String(hour).padStart(2, "0") + ":00" }));
                      setShowAddModal(true);
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    {/* Time Label */}
                    <div style={{ width: "54px", flexShrink: 0, padding: "8px 8px 0 4px", fontSize: "0.62rem", color: "var(--text-color, rgba(255,255,255,0.38))", textAlign: "right", fontWeight: 500, userSelect: "none" }}>
                      {timeLabel}
                    </div>
                    {/* Divider */}
                    <div style={{ width: "1px", background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />
                    {/* Tasks */}
                    <div style={{ flex: 1, padding: "4px 8px", display: "flex", flexDirection: "column", gap: "3px" }}>
                      {hourTasks.map((task) => (
                        <div
                          key={task.id}
                          style={{
                            background: groupColorById.get(Number(task.group_id)) || "rgba(255,255,255,0.18)",
                            color: "#fff",
                            padding: "5px 10px",
                            borderRadius: "3px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            opacity: task.status === "completed" ? 0.55 : 1,
                            textDecoration: task.status === "completed" ? "line-through" : "none",
                          }}
                          title={task.title}
                        >
                          {task.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Week/5-day View */
          <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflow: "auto", flex: 1 }}>
            {/* Day Headers */}
            <div style={{ display: "grid", gridTemplateColumns: weekColumnTemplate, gap: "2px", padding: weekSectionPadding, paddingBottom: isCompactLandscape ? "2px" : "4px", position: "sticky", top: 0, background: "rgba(255,255,255,0.08)", zIndex: 10, width: isCompactLandscape ? "100%" : "max-content", minWidth: "100%" }}>
              {rangeDays.map((day) => {
                const isToday = day.isSame(dayjs(), "day");
                return (
                <div
                  key={`header-${day.format("YYYY-MM-DD")}`}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    borderRadius: "8px",
                    padding: "6px 4px",
                    background: isToday ? "rgba(154, 215, 227, 0.24)" : "transparent",
                    boxShadow: isToday ? "inset 0 0 0 1px rgba(165, 210, 233, 0.55)" : "none",
                  }}
                >
                  <div style={{ fontSize: weekHeaderFontSize, color: isToday ? "var(--text-color, #2A2A2A)" : "var(--text-color, rgba(255,255,255,0.6))", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {day.format("ddd")}
                  </div>
                  <div style={{ fontSize: weekDateFontSize, fontWeight: 700, color: isToday ? "var(--text-color, #2A2A2A)" : "var(--text-color, white)", marginTop: "2px" }}>
                    {day.format("D")}
                  </div>
                </div>
              )})}
            </div>

            {/* Day Content */}
            <div style={{ display: "grid", gridTemplateColumns: weekColumnTemplate, gap: "2px", padding: weekSectionPadding, flex: 1, width: isCompactLandscape ? "100%" : "max-content", minWidth: "100%" }}>
              {rangeDays.map((day) => {
                const dayTasks = tasksForDay(day);
                const isToday = day.isSame(dayjs(), "day");
                const baseDayBackground = isToday ? "rgba(154, 215, 227, 0.24)" : "rgba(255,255,255,0.06)";
                return (
                  <div
                    key={day.format("YYYY-MM-DD")}
                    onClick={() => openAddTaskModal(day)}
                    style={{
                      border: isToday ? "1px solid rgba(169, 201, 231, 0.55)" : "1px solid rgba(255,255,255,0.15)",
                      borderRadius: "6px",
                      padding: "6px",
                      background: baseDayBackground,
                      minHeight: weekCardMinHeight,
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      cursor: "pointer",
                      boxShadow: isToday ? "inset 0 0 0 1px rgba(149, 212, 228, 0.45)" : "none",
                      transition: "background 0.2s, box-shadow 0.2s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = isToday ? "rgba(167,196,160,0.3)" : "rgba(255,255,255,0.1)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = baseDayBackground; }}
                  >
                    {dayTasks.length === 0 ? (
                      <div style={{ fontSize: "0.7rem", color: "var(--text-color, rgba(255,255,255,0.3))", padding: "20px 4px", textAlign: "center" }}>
                        Add task
                      </div>
                    ) : (
                      dayTasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={(e) => openEditModal(task, e)}
                          style={{
                            background: groupColorById.get(Number(task.group_id)) || "rgba(255,255,255,0.18)",
                            color: "#fff",
                            padding: "5px 10px",
                            borderRadius: "3px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            opacity: task.status === "completed" ? 0.55 : 1,
                            textDecoration: task.status === "completed" ? "line-through" : "none",
                            cursor: "pointer",
                          }}
                          title={task.title}
                        >
                          {task.title}
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <div style={modalOverlayStyle} onClick={() => setShowAddModal(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: "14px", color: "var(--text-color, white)", fontStyle: "italic" }}>
              Add Task for {dayjs(draftTask.date).format("MMM D, YYYY")}
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input type="text" value={draftTask.title} onChange={(e) => setDraftTask((prev) => ({ ...prev, title: e.target.value }))} placeholder="Task title" style={inputStyle} />
              <div style={{ display: "grid", gridTemplateColumns: isPhone ? "1fr" : "1fr 1fr", gap: "8px" }}>
                <input type="date" value={draftTask.date} onChange={(e) => setDraftTask((prev) => ({ ...prev, date: e.target.value }))} style={inputStyle} />
                <input type="time" value={draftTask.time} onChange={(e) => setDraftTask((prev) => ({ ...prev, time: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isPhone ? "1fr" : "1fr 1fr", gap: "8px" }}>
                <select value={draftTask.priority} onChange={(e) => setDraftTask((prev) => ({ ...prev, priority: e.target.value }))} style={inputStyle}>
                  <option value="">No priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <select value={draftTask.group_id} onChange={(e) => setDraftTask((prev) => ({ ...prev, group_id: e.target.value }))} style={inputStyle}>
                  <option value="">Ungrouped</option>
                  {groups.map((group) => (<option key={group.id} value={group.id}>{group.name}</option>))}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "16px", flexDirection: isPhone ? "column" : "row" }}>
              <button style={saveButtonStyle} onClick={submitAddTask}>Save</button>
              <button style={cancelButtonStyle} onClick={() => setShowAddModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {editingTask && editDraft && (
        <div style={modalOverlayStyle} onClick={() => setEditingTask(null)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: "14px", color: "var(--text-color, white)", fontStyle: "italic" }}>
              Edit Task
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input type="text" value={editDraft.title} onChange={(e) => setEditDraft((prev) => ({ ...prev, title: e.target.value }))} placeholder="Task title" style={inputStyle} />
              <div style={{ display: "grid", gridTemplateColumns: isPhone ? "1fr" : "1fr 1fr", gap: "8px" }}>
                <input
                  type="date"
                  value={editDraft.date}
                  onChange={(e) =>
                    setEditDraft((prev) => ({
                      ...prev,
                      date: e.target.value,
                      reminder_offset_minutes: e.target.value
                        ? (prev.reminder_offset_minutes ?? 15)
                        : null,
                    }))
                  }
                  style={inputStyle}
                />
                <input type="time" value={editDraft.time} onChange={(e) => setEditDraft((prev) => ({ ...prev, time: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isPhone ? "1fr" : "1fr 1fr", gap: "8px" }}>
                <select value={editDraft.priority} onChange={(e) => setEditDraft((prev) => ({ ...prev, priority: e.target.value }))} style={inputStyle}>
                  <option value="">No priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <select value={editDraft.group_id} onChange={(e) => setEditDraft((prev) => ({ ...prev, group_id: e.target.value }))} style={inputStyle}>
                  <option value="">Ungrouped</option>
                  {groups.map((group) => (<option key={group.id} value={group.id}>{group.name}</option>))}
                </select>
              </div>
              <select value={editDraft.status} onChange={(e) => setEditDraft((prev) => ({ ...prev, status: e.target.value }))} style={inputStyle}>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="blocked">Blocked</option>
                <option value="completed">Completed</option>
              </select>
              {editDraft.date && (
                <select
                  value={editDraft.reminder_offset_minutes ?? ""}
                  onChange={(e) =>
                    setEditDraft((prev) => ({
                      ...prev,
                      reminder_offset_minutes: e.target.value === "" ? null : Number(e.target.value),
                    }))
                  }
                  style={inputStyle}
                >
                  {TASK_REMINDER_OPTIONS.map((option) => (
                    <option key={option.value || "none"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "16px", flexDirection: isPhone ? "column" : "row" }}>
              <button style={saveButtonStyle} onClick={submitEditTask}>Save</button>
              <button style={{ ...cancelButtonStyle, color: "#ff8a8a", borderColor: "rgba(255,100,100,0.4)" }} onClick={deleteTask}>Delete</button>
              <button style={cancelButtonStyle} onClick={() => setEditingTask(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const navButtonStyle = {
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.08)",
  color: "var(--text-color, #2A2A2A)",
  borderRadius: "4px",
  padding: "5px 8px",
  cursor: "pointer",
  fontSize: "0.8rem",
  transition: "all 0.2s",
};

const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.27)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 2200,
};

const modalStyle = {
  border: "2px solid rgba(255,255,255,0.35)",
  borderRadius: "12px",
  padding: "20px",
  width: "92%",
  maxWidth: "460px",
  background: "rgba(70, 70, 70, 0.55)",
  backdropFilter: "blur(12px)",
};

const inputStyle = {
  width: "100%",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.25)",
  background: "rgba(40,40,40,0.5)",
  color: "var(--text-color, white)",
  boxSizing: "border-box",
};

const saveButtonStyle = {
  flex: 1,
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.3)",
  background: "rgba(255,255,255,0.2)",
  color: "var(--text-color, white)",
  cursor: "pointer",
  fontWeight: 600,
};

const cancelButtonStyle = {
  flex: 1,
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.3)",
  background: "rgba(255,255,255,0.12)",
  color: "var(--text-color, white)",
  cursor: "pointer",
  fontWeight: 600,
};

const titlePartBtnStyle = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: "1rem",
  padding: "2px 4px",
  borderRadius: "4px",
  transition: "color 0.15s",
};

const dropdownStyle = {
  position: "absolute",
  top: "calc(100% + 6px)",
  left: "50%",
  transform: "translateX(-50%)",
  background: "rgba(178, 186, 181, 0.92)",
  border: "1px solid rgba(245,248,243,0.24)",
  borderRadius: "8px",
  padding: "10px",
  zIndex: 1000,
  backdropFilter: "blur(12px)",
  boxShadow: "0 8px 24px rgba(0,0,0,0.24)",
  minWidth: "200px",
};

const dropdownItemStyle = {
  border: "none",
  cursor: "pointer",
  padding: "6px 4px",
  borderRadius: "4px",
  fontSize: "0.8rem",
  textAlign: "center",
  transition: "background 0.15s",
};
