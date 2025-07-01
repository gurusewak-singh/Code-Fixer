const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./config/logger');
const uploadRoutes = require('./routes/upload');

// ===== LOAD ENV VARIABLES =====
dotenv.config();

// ===== VERY TOP LEVEL ERROR HANDLERS =====
process.on('uncaughtException', (error) => {
  logger.error('!!!!!!!!!! UNCAUGHT EXCEPTION !!!!!!!!!!!', { error: error.stack || error });
  // In production, it's critical to stop the process as it's in an unknown state.
  // A process manager like PM2 will restart it.
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('!!!!!!!!!! UNHANDLED REJECTION !!!!!!!!!!!', { reason, promise });
});
// ===========================================

const app = express();
const PORT = process.env.PORT || 5000;

// ===== SECURITY & MIDDLEWARE =====
app.use(helmet()); // Set security-related HTTP response headers
app.use(cors()); // Enable CORS for all routes
app.use(express.json({ limit: '25mb' })); // Reduced limit for JSON payloads
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Request logging middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.originalUrl}`, { ip: req.ip });
    next();
});

// Rate limiting to prevent abuse
const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes.' }
});

// ===== ROUTES =====
// Simple ping route for health check
app.get("/api/ping", (req, res) => {
  logger.info("[/api/ping] Received ping request.");
  res.status(200).send("pong");
});

// API routes with rate limiting
app.use("/api", apiLimiter, uploadRoutes);

// Static serving for fixed files
const fixedDirectory = path.join(__dirname, "fixed");
app.use("/fixed", express.static(fixedDirectory));

// Root route
app.get("/", (req, res) => {
  res.send("CodeFixer API is up and running!");
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
    logger.error(`Unhandled error for ${req.method} ${req.path}:`, { error: err.stack || err });
    res.status(500).json({ success: false, message: 'An internal server error occurred.' });
});

// ===== STARTUP LOGIC =====
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      logger.info(`[Server Startup] Created directory: ${dirPath}`);
    } catch (e) {
      logger.error(`[Server Startup] FAILED to create directory: ${dirPath}`, { error: e });
      process.exit(1); // Exit if essential directories cannot be created
    }
  }
};

app.listen(PORT, () => {
  logger.info(`Server attempting to run on port ${PORT}`);
  ensureDirectoryExists(path.join(__dirname, "uploads"));
  ensureDirectoryExists(path.join(__dirname, "extracted"));
  ensureDirectoryExists(fixedDirectory);
  ensureDirectoryExists(path.join(__dirname, "logs")); // For winston logs

  if (!process.env.GEMINI_API_KEY) {
    logger.warn("CRITICAL WARNING: GEMINI_API_KEY is not set in the .env file. The application will not function.");
  } else {
    logger.info("GEMINI_API_KEY is loaded.");
  }
  logger.info(`Server is running on port ${PORT}`);
  logger.info(`Backend API accessible at http://localhost:${PORT}`);
});