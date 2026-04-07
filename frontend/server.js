import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.get("/app-config.js", (req, res) => {
  res.type("application/javascript");
  res.send(
    `window.__APP_CONFIG__ = ${JSON.stringify({
      VITE_API_URL: process.env.VITE_API_URL || "",
    })};`,
  );
});

// Serve static files from dist
app.use(express.static(path.join(__dirname, "dist")));

// Do not let API requests fall through to the SPA shell.
app.use("/api", (req, res) => {
  res.status(502).json({
    error:
      "API requests are hitting the frontend service. Set VITE_API_URL to your backend domain.",
  });
});

// Serve index.html on all routes (for SPA)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Listen on Railway port
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Frontend running on http://0.0.0.0:${PORT}`);
});
