export default function Header({ onAddTask }) {
  return (
    <header className="header">
      <h1>OrgaNote</h1>
      <button type="button" className="btn-add-task" onClick={onAddTask} aria-label="Add a new task">
        + Add Task
      </button>
    </header>
  );
}
