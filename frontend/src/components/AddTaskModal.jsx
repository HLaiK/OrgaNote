import { useState } from "react";

export default function AddTaskModal({ show, onClose, onSubmit }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");

  if (!show) return null;

  function submitForm(e) {
    e.preventDefault();

    onSubmit({
      title,
      category,
      priority,
      due_date: dueDate,
      description,
    });

    setTitle("");
    setCategory("");
    setPriority("medium");
    setDueDate("");
    setDescription("");
  }

  return (
    <div className="modal show">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Add New Task</h2>
          <span className="close-btn" onClick={onClose}>&times;</span>
        </div>

        <form onSubmit={submitForm}>
          <div className="form-group">
            <label>Task Name *</label>
            <input
              type="text"
              required
              placeholder="e.g., Study for exam"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Select...</option>
                <option value="work">Work</option>
                <option value="school">School</option>
                <option value="personal">Personal</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="form-group">
              <label>Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description (Optional)</label>
            <textarea
              rows="3"
              placeholder="Add any additional details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            ></textarea>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Add Task</button>
          </div>
        </form>
      </div>
    </div>
  );
}
