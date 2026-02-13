const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.text({ type: "application/json", limit: "50mb" }));

// API routes
const taskRoutes = require("./routes/tasks");
app.use("/api/tasks", taskRoutes);

const nlpRoutes = require("./routes/nlp");
app.use("/api/nlp", nlpRoutes);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
