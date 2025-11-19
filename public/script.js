console.log("OrgaNote loaded!");
let tasks = []; // Store all tasks in memory

// On page load
document.addEventListener("DOMContentLoaded", () => {
  loadTasks(); // Fetch tasks from API
});

// Fetch tasks from backend
async function loadTasks() {
  const response = await fetch("/api/tasks"); // GET request
  tasks = await response.json(); // Parse JSON
  renderTasks(); // Display them
}

// Add new task
async function handleAddTask(e) {
  e.preventDefault(); // Stop form from refreshing page

  const newTask = {
    title: document.getElementById("taskTitle").value,
    category: document.getElementById("taskCategory").value,
    // ...
  };

  const response = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newTask),
  });

  const createdTask = await response.json();
  tasks.unshift(createdTask); // Add to beginning of array
  renderTasks(); // Re-render
}

// Display tasks on page
function renderTasks() {
  const filtered = filterTasks(); // Apply filters
  const sorted = sortTasks(filtered); // Apply sorting

  tasksList.innerHTML = sorted
    .map(
      (task) => createTaskCard(task) // Convert each task to HTML
    )
    .join("");
}

// Generate HTML for one task
function createTaskCard(task) {
  return `
    <div class="task-card">
      <div class="task-title">${task.title}</div>
      <button onclick="toggleComplete(${task.id})">Complete</button>
      <button onclick="deleteTask(${task.id})">Delete</button>
    </div>
  `;
}
