const express = require("express");
const path = require("path");
const app = express();

// Serve static files from dist
app.use(express.static(path.join(__dirname, "dist")));

// Serve index.html on all routes (for SPA)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Listen on Railway port
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Frontend running on http://0.0.0.0:${PORT}`);
});
