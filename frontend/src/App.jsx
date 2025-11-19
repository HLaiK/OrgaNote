import { useState, useEffect } from "react";
import "./styles/style.css";

import TaskList from "./components/TaskList";
import AddTaskModal from "./components/AddTaskModal";
import ThemeMenu from "./components/ThemeMenu";

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [showModal, setShowModal] = useState(false);

  // Load tasks from backend
  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    const res = await fetch("http://localhost:3000/api/tasks");
    const data = await res.json();
    setTasks(data);
  }

  async function addTask(task) {
    const res = await fetch("http://localhost:3000/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    });

    const newTask = await res.json();
    setTasks([newTask, ...tasks]);
    setShowModal(false);
  }

  async function deleteTask(id) {
    await fetch(`http://localhost:3000/api/tasks/${id}`, { method: "DELETE" });
    setTasks(tasks.filter((t) => t.id !== id));
  }

  return (
    <div className="container">
      <header>
        <h1>OrgaNote</h1>
        <p className="tagline">Stay organized, stay productive</p>
      </header>

      <main>
        <section className="add-button-section">
          <button
            className="btn-add-task"
            onClick={() => setShowModal(true)}
          >
            <span className="plus-icon">+</span> Add New Task
          </button>
        </section>

        <section className="controls">
          <div className="filter-group">
            <label>Filter by:</label>
            <select>
              <option value="all">All Categories</option>
              <option value="work">Work</option>
              <option value="school">School</option>
              <option value="personal">Personal</option>
              <option value="other">Other</option>
            </select>

            <select>
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="sort-group">
            <label>Sort by:</label>
            <select>
              <option value="created">Date Created</option>
              <option value="due_date">Due Date</option>
              <option value="priority">Priority</option>
              <option value="category">Category</option>
            </select>
          </div>
        </section>

        <section className="tasks-section">
          <h2>Your Tasks</h2>

          <TaskList tasks={tasks} deleteTask={deleteTask} />
        </section>
      </main>

      <ThemeMenu />

      <AddTaskModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={addTask}
      />
    </div>
  );
}
