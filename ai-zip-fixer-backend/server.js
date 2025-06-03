const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path'); // Correctly required
const fs = require('fs');
const uploadRoutes = require('./routes/upload');

// ===== VERY TOP LEVEL ERROR HANDLERS =====
process.on('uncaughtException', (error, origin) => {
  console.error('!!!!!!!!!! UNCAUGHT EXCEPTION !!!!!!!!!!!');
  console.error('Origin:', origin);
  console.error('Error Stack:', error.stack || error); // Log stack for more details
  // It's generally recommended to exit the process after an uncaught exception
  // process.exit(1); // Uncomment this for production-like behavior
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('!!!!!!!!!! UNHANDLED REJECTION !!!!!!!!!!!');
  console.error('Promise:', promise);
  console.error('Reason:', reason);
});
// ===========================================

dotenv.config();
const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors()); // Enable CORS for all routes
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Simple ping route for basic server health check
app.get("/api/ping", (req, res) => {
  console.log("[/api/ping] Received ping request.");
  res.status(200).send("pong");
});

// API routes
app.use("/api", uploadRoutes);

// Static serving for fixed files
const fixedDirectory = path.join(__dirname, "fixed");
app.use("/fixed", express.static(fixedDirectory));

// Root route
app.get("/", (req, res) => {
  res.send("CodeFixer API is up and running!");
});

const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`[Server Startup] Created directory: ${dirPath}`);
    } catch (e) {
      console.error(`[Server Startup] FAILED to create directory: ${dirPath}`, e);
      // Consider exiting if essential directories cannot be created
      // process.exit(1);
    }
  }
};

app.listen(PORT, () => {
  console.log(`Server attempting to run on port ${PORT}`);
  ensureDirectoryExists(path.join(__dirname, "uploads"));
  ensureDirectoryExists(path.join(__dirname, "extracted"));
  ensureDirectoryExists(fixedDirectory); // Use the variable defined above

  if (!process.env.GEMINI_API_KEY) {
    console.warn("WARNING: GEMINI_API_KEY is not set in the .env file. The application might not function correctly.");
  } else {
    console.log("GEMINI_API_KEY is loaded.");
  }
  console.log(`Server is running on port ${PORT}`);
  console.log(`Backend API accessible at http://localhost:${PORT}`);
  console.log(`Try pinging the server at http://localhost:${PORT}/api/ping`);
});