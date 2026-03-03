import { useEffect, useMemo, useState } from "react";
import {
  EditOutlined,
  CheckOutlined,
  DeleteOutlined,
  CloseOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { apiFetch } from "../api";

const UNGROUPED_ID = "__ungrouped__";

export default function TasksPanel({ refreshTrigger, searchQuery = "" }) {
  const [tasks, setTasks] = useState([]);
  const [groups, setGroups] = useState([]);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [editingTask, setEditingTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const localDateTimeForInput = (value) => {
    if (!value) return "";
    try {
      const d = new Date(value);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return "";
    }
  };

  const loadAll = async () => {
    try {
      const userId = localStorage.getItem("organote_user_id");
      if (!userId) {
        setError("No user ID found. Please refresh the page.");
        setLoading(false);
        return;
      }

      const [taskData, groupData] = await Promise.all([
        apiFetch("/tasks"),
        apiFetch("/task-groups"),
      ]);

      setTasks(taskData || []);
      setGroups(groupData || []);
      setError(null);
    } catch (err) {
      console.error("Error loading data:", err);
      setError(err.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [refreshTrigger]);

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [tasks, searchQuery],
  );

  const groupedSections = useMemo(() => {
    const grouped = groups.map((group) => ({
      id: group.id,
      name: group.name,
      color: group.color,
      tasks: filteredTasks.filter((task) => task.group_id === group.id),
    }));

    grouped.push({
      id: UNGROUPED_ID,
      name: "Ungrouped",
      color: "rgba(255,255,255,0.35)",
      tasks: filteredTasks.filter((task) => !task.group_id),
      readOnly: true,
    });

    return grouped;
  }, [groups, filteredTasks]);

  const handleToggleComplete = async (taskId, currentStatus) => {
    try {
      const newStatus =
        currentStatus === "completed" || currentStatus === true
          ? "pending"
          : "completed";
      await apiFetch(`/tasks/${taskId}`, {
        method: "PUT",
        body: { status: newStatus },
      });
      setTasks((prev) =>
        prev
          .map((task) =>
            task.id === taskId ? { ...task, status: newStatus } : task,
          )
          .slice()
          .sort((a, b) => (a.status === "completed") - (b.status === "completed")),
      );
    } catch (err) {
      console.error("Error updating task:", err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await apiFetch(`/tasks/${taskId}`, { method: "DELETE" });
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  const createGroupFromPrompt = async () => {
    const name = window.prompt("Group name (e.g., School, Work, Class 1)");
    if (!name || !name.trim()) return null;

    try {
      const created = await apiFetch("/task-groups", {
        method: "POST",
        body: { name: name.trim(), color: "#4F46E5" },
      });
      setGroups((prev) => [...prev, created]);
      return created;
    } catch (err) {
      console.error("Error creating group:", err);
      alert("Failed to create group");
      return null;
    }
  };

  const createGroup = async () => {
    await createGroupFromPrompt();
  };

  const createGroupForEditingTask = async () => {
    const created = await createGroupFromPrompt();
    if (created && editingTask) {
      handleEditChange("group_id", created.id);
    }
  };

  const renameGroup = async (group) => {
    const name = window.prompt("Rename group", group.name || "");
    if (!name || !name.trim() || name.trim() === group.name) return;

    try {
      const updated = await apiFetch(`/task-groups/${group.id}`, {
        method: "PUT",
        body: { name: name.trim() },
      });
      setGroups((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      console.error("Error renaming group:", err);
      alert("Failed to rename group");
    }
  };

  const changeGroupColor = async (groupId, color) => {
    try {
      const updated = await apiFetch(`/task-groups/${groupId}`, {
        method: "PUT",
        body: { color },
      });
      setGroups((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      console.error("Error updating group color:", err);
    }
  };

  const deleteGroup = async (groupId) => {
    const confirmed = window.confirm(
      "Delete this group? Tasks will remain and become ungrouped.",
    );
    if (!confirmed) return;

    try {
      await apiFetch(`/task-groups/${groupId}`, { method: "DELETE" });
      setGroups((prev) => prev.filter((group) => group.id !== groupId));
      setTasks((prev) =>
        prev.map((task) =>
          task.group_id === groupId ? { ...task, group_id: null } : task,
        ),
      );
    } catch (err) {
      console.error("Error deleting group:", err);
      alert("Failed to delete group");
    }
  };

  const toggleGroupCollapse = (groupKey) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const handleEdit = (task) => {
    setEditingTask({ ...task, group_id: task.group_id ?? null });
  };

  const handleEditChange = (field, value) => {
    setEditingTask((current) => ({ ...current, [field]: value }));
  };

  const submitEdit = async () => {
    if (!editingTask) return;
    try {
      const body = {
        title: editingTask.title,
        description: editingTask.description,
        category: editingTask.category,
        priority: editingTask.priority,
        due_date: editingTask.due_date,
        group_id: editingTask.group_id || null,
      };

      const updated = await apiFetch(`/tasks/${editingTask.id}`, {
        method: "PUT",
        body,
      });

      setTasks((prev) => prev.map((task) => (task.id === updated.id ? updated : task)));
      setEditingTask(null);
    } catch (err) {
      console.error("Error editing task:", err);
    }
  };

  const cancelEdit = () => setEditingTask(null);

  if (loading) {
    return <div style={styles.loadingText}>Loading tasks…</div>;
  }

  if (error) {
    return <div style={styles.errorText}>Error: {error}</div>;
  }

  return (
    <>
      <div style={styles.groupToolbar}>
        <span style={styles.groupToolbarLabel}>Task Groups</span>
        <button style={styles.groupAddButton} onClick={createGroup}>
          <PlusOutlined /> New Group
        </button>
      </div>

      <div style={styles.groupListContainer}>
        {groupedSections.every((section) => section.tasks.length === 0) ? (
          <div style={styles.emptyText}>No tasks yet. Add some using the input below!</div>
        ) : (
          groupedSections.map((section) => {
            if (section.tasks.length === 0 && section.id === UNGROUPED_ID) {
              return null;
            }

            const isCollapsed = !!collapsedGroups[section.id];
            return (
              <div key={section.id} style={styles.groupSection}>
                <div
                  style={{ ...styles.groupHeader, borderLeft: `4px solid ${section.color}` }}
                >
                  <button
                    style={styles.groupToggleButton}
                    onClick={() => toggleGroupCollapse(section.id)}
                    title={isCollapsed ? "Expand group" : "Collapse group"}
                  >
                    <span style={styles.groupName}>{section.name}</span>
                    <span style={styles.groupMeta}>
                      {section.tasks.length} · {isCollapsed ? "Collapsed" : "Expanded"}
                    </span>
                  </button>

                  {!section.readOnly && (
                    <div style={styles.groupActions}>
                      <input
                        type="color"
                        value={section.color || "#4F46E5"}
                        title="Group color"
                        style={styles.groupColorPicker}
                        onChange={(e) => changeGroupColor(section.id, e.target.value)}
                      />
                      <button
                        style={styles.groupActionBtn}
                        onClick={() => renameGroup(section)}
                        title="Rename group"
                      >
                        <EditOutlined />
                      </button>
                      <button
                        style={styles.groupActionBtn}
                        onClick={() => deleteGroup(section.id)}
                        title="Delete group"
                      >
                        <DeleteOutlined />
                      </button>
                    </div>
                  )}
                </div>

                {!isCollapsed && (
                  <ul style={styles.list}>
                    {section.tasks.map((task) => (
                      <li key={task.id} style={styles.item}>
                        <div style={styles.itemContent}>
                          <div style={styles.taskInfo}>
                            <div
                              style={{
                                ...styles.title,
                                textDecoration:
                                  task.status === "completed" ? "line-through" : "none",
                              }}
                            >
                              {task.title}
                            </div>
                            {task.due_date && (
                              <div style={styles.date}>
                                Due: {new Date(task.due_date).toLocaleDateString()} at{" "}
                                {new Date(task.due_date).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            )}
                          </div>
                          <div style={styles.actions}>
                            <button
                              style={styles.editButton}
                              onClick={() => handleEdit(task)}
                              title="Edit"
                            >
                              <EditOutlined />
                            </button>
                            <button
                              style={styles.checkButton}
                              onClick={() => handleToggleComplete(task.id, task.status)}
                              title="Mark complete"
                            >
                              <CheckOutlined />
                            </button>
                            <button
                              style={styles.deleteButton}
                              onClick={() => handleDeleteTask(task.id)}
                              title="Delete"
                            >
                              <DeleteOutlined />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </div>

      {editingTask && (
        <div style={modalStyles.overlay} onClick={cancelEdit}>
          <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <h3 style={modalStyles.title}>Edit Task</h3>
              <button
                onClick={cancelEdit}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-color, white)",
                  fontSize: "1.8rem",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CloseOutlined />
              </button>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                marginBottom: "24px",
              }}
            >
              <div>
                <label style={modalStyles.label}>Title</label>
                <input
                  style={modalStyles.input}
                  value={editingTask.title || ""}
                  onChange={(e) => handleEditChange("title", e.target.value)}
                  placeholder="Task title"
                />
              </div>

              <div>
                <label style={modalStyles.label}>Group</label>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
                  <button
                    type="button"
                    onClick={createGroupForEditingTask}
                    style={modalStyles.groupCreateButton}
                  >
                    <PlusOutlined /> Create new group
                  </button>
                </div>
                <select
                  style={modalStyles.input}
                  value={editingTask.group_id || ""}
                  onChange={(e) =>
                    handleEditChange(
                      "group_id",
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                >
                  <option value="">Ungrouped</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={modalStyles.label}>Due date & time</label>
                <input
                  type="datetime-local"
                  style={{ ...modalStyles.input, marginBottom: 0 }}
                  value={
                    editingTask.due_date ? localDateTimeForInput(editingTask.due_date) : ""
                  }
                  onChange={(e) =>
                    handleEditChange("due_date", e.target.value ? e.target.value : null)
                  }
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                style={modalStyles.saveBtn}
                onClick={submitEdit}
                onMouseEnter={(e) => {
                  e.target.style.background = "var(--btn-color, #A7C4A0)";
                  e.target.style.borderColor = "var(--btn-color, #A7C4A0)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "rgba(255,255,255,0.2)";
                  e.target.style.borderColor = "rgba(255,255,255,0.3)";
                }}
              >
                Save
              </button>
              <button
                style={modalStyles.cancelBtn}
                onClick={cancelEdit}
                onMouseEnter={(e) => {
                  e.target.style.background = "rgba(255,255,255,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "rgba(255,255,255,0.2)";
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  loadingText: {
    color: "var(--text-color, rgba(255,255,255,0.7))",
    fontSize: "0.95rem",
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: "0.95rem",
    padding: "10px",
    background: "rgba(255, 107, 107, 0.1)",
    borderRadius: "6px",
  },
  emptyText: {
    color: "var(--text-color, rgba(255,255,255,0.7))",
    fontSize: "0.95rem",
  },
  groupToolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  groupToolbarLabel: {
    color: "var(--text-color, #2A2A2A)",
    fontWeight: "600",
    fontSize: "0.9rem",
  },
  groupAddButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "rgba(255,255,255,0.2)",
    border: "2px solid rgba(255,255,255,0.3)",
    borderRadius: "8px",
    padding: "6px 10px",
    color: "var(--text-color, #2A2A2A)",
    cursor: "pointer",
  },
  groupListContainer: {
    maxHeight: "60vh",
    overflowY: "auto",
    paddingRight: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  groupSection: {
    background: "rgba(255,255,255,0.08)",
    border: "2px solid rgba(255,255,255,0.2)",
    borderRadius: "10px",
    padding: "8px",
  },
  groupHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "rgba(255,255,255,0.08)",
    borderRadius: "8px",
    padding: "8px",
    marginBottom: "8px",
  },
  groupToggleButton: {
    background: "none",
    border: "none",
    color: "var(--text-color, #2A2A2A)",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "2px",
    cursor: "pointer",
    padding: 0,
  },
  groupName: {
    fontWeight: "700",
    fontSize: "0.9rem",
  },
  groupMeta: {
    fontSize: "0.75rem",
    opacity: 0.8,
  },
  groupActions: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  groupColorPicker: {
    width: "28px",
    height: "28px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    padding: 0,
  },
  groupActionBtn: {
    width: "28px",
    height: "28px",
    borderRadius: "6px",
    border: "1px solid rgba(255,255,255,0.25)",
    background: "rgba(255,255,255,0.1)",
    color: "var(--text-color, #2A2A2A)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  item: {
    background: "rgba(255,255,255,0.1)",
    border: "2px solid rgba(255,255,255,0.2)",
    borderRadius: "8px",
    padding: "12px",
    backdropFilter: "blur(5px)",
  },
  itemContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
  },
  taskInfo: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: "0.95rem",
    fontWeight: "500",
    color: "var(--text-color, white)",
    wordBreak: "break-word",
  },
  date: {
    fontSize: "0.8rem",
    color: "var(--text-color, rgba(255,255,255,0.7))",
    marginTop: "4px",
  },
  actions: {
    display: "flex",
    gap: "8px",
    flexShrink: 0,
  },
  editButton: {
    background: "rgba(255,255,255,0.2)",
    border: "2px solid rgba(255,255,255,0.3)",
    borderRadius: "4px",
    width: "32px",
    height: "32px",
    cursor: "pointer",
    color: "var(--text-color, rgba(255,255,255,0.8))",
    fontSize: "1rem",
    fontWeight: "bold",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  checkButton: {
    background: "rgba(255,255,255,0.2)",
    border: "2px solid rgba(255,255,255,0.3)",
    borderRadius: "4px",
    width: "32px",
    height: "32px",
    cursor: "pointer",
    color: "var(--text-color, rgba(255,255,255,0.8))",
    fontSize: "1rem",
    fontWeight: "bold",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButton: {
    background: "rgba(255,255,255,0.2)",
    border: "2px solid rgba(255,255,255,0.3)",
    borderRadius: "4px",
    width: "32px",
    height: "32px",
    cursor: "pointer",
    color: "var(--text-color, rgba(255,255,255,0.8))",
    fontSize: "1rem",
    fontWeight: "bold",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};

const modalStyles = {
  overlay: {
    position: "fixed",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.27)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
  },
  modal: {
    border: "2px solid rgba(255,255,255,0.4)",
    borderRadius: "12px",
    padding: "30px",
    maxWidth: "500px",
    width: "90%",
    backdropFilter: "blur(10px)",
  },
  title: {
    margin: 0,
    marginBottom: 24,
    fontSize: "1.8rem",
    fontWeight: "bold",
    color: "var(--text-color, white)",
    fontStyle: "italic",
  },
  label: {
    fontSize: "0.95rem",
    marginTop: 0,
    marginBottom: 8,
    display: "block",
    fontWeight: "600",
    color: "var(--text-color, rgba(255,255,255,0.9))",
  },
  input: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "2px solid rgba(255,255,255,0.3)",
    backgroundColor: "rgba(255,255,255,0.1)",
    color: "var(--text-color, white)",
    fontFamily: "inherit",
    backdropFilter: "blur(5px)",
    marginBottom: "16px",
    boxSizing: "border-box",
    fontSize: "0.95rem",
  },
  groupCreateButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "rgba(255,255,255,0.2)",
    border: "2px solid rgba(255,255,255,0.3)",
    borderRadius: "8px",
    padding: "6px 10px",
    color: "var(--text-color, white)",
    cursor: "pointer",
    fontSize: "0.85rem",
  },
  saveBtn: {
    flex: 1,
    padding: "12px",
    background: "rgba(255,255,255,0.2)",
    color: "var(--text-color, white)",
    border: "2px solid rgba(255,255,255,0.3)",
    borderRadius: "8px",
    fontWeight: "500",
    cursor: "pointer",
    fontSize: "1rem",
    transition: "all 0.2s",
  },
  cancelBtn: {
    flex: 1,
    padding: "12px",
    background: "rgba(255,255,255,0.2)",
    border: "2px solid rgba(255,255,255,0.3)",
    borderRadius: "8px",
    fontWeight: "500",
    cursor: "pointer",
    color: "var(--text-color, white)",
    fontSize: "1rem",
    transition: "all 0.2s",
  },
};
