import { useState } from "react";
import TaskCard from "./TaskCard";

export default function KanbanView({ tasks, deleteTask }) {
  const categories = ["work", "school", "personal", "other"];

  const getTasksByCategory = (category) => {
    return tasks.filter((t) => t.category === category);
  };

  return (
    <div className="kanban-view">
      {categories.map((category) => (
        <div key={category} className="kanban-column">
          <h3 className="kanban-column-title">
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </h3>
          <div className="kanban-cards">
            {getTasksByCategory(category).length === 0 ? (
              <p className="no-tasks-column">No tasks</p>
            ) : (
              getTasksByCategory(category).map((task) => (
                <TaskCard key={task.id} task={task} deleteTask={deleteTask} />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
