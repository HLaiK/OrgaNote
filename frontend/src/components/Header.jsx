export default function Header({ onAddTask }) {
  return (
    <header className="header">
      <h1>OrgaNote</h1>
      <button className="btn-add-task" onClick={onAddTask}>
        + Add Task
      </button>
    </header>
  );
}
