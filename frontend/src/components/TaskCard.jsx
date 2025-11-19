export default function TaskCard({ task, deleteTask }) {
  return (
    <div className={`task-card ${task.status === "completed" ? "completed" : ""}`}>
      <div className="task-header">
        <div>
          <div className="task-title">{task.title}</div>

          <div className="task-meta">
            {task.category && (
              <span className="badge category">{task.category}</span>
            )}

            {task.priority && (
              <span className={`badge priority-${task.priority}`}>
                {task.priority}
              </span>
            )}

            {task.due_date && (
              <span className="badge due-date">
                Due: {task.due_date.substring(0, 10)}
              </span>
            )}
          </div>
        </div>
      </div>

      {task.description && (
        <p className="task-description">{task.description}</p>
      )}

      <div className="task-actions">
        <button className="btn-small btn-delete" onClick={() => deleteTask(task.id)}>
          Delete
        </button>
      </div>
    </div>
  );
}
