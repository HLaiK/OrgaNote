import TaskCard from "./TaskCard";

export default function TaskList({ tasks, deleteTask }) {
  if (tasks.length === 0) {
    return (
      <div className="tasks-list">
        <p className="no-tasks">No tasks yet. Add one above to get started!</p>
      </div>
    );
  }

  return (
    <div className="tasks-list">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} deleteTask={deleteTask} />
      ))}
    </div>
  );
}
