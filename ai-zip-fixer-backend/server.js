const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./config/logger');
const uploadRoutes = require('./routes/upload');

dotenv.config();

process.on('uncaughtException', (error) => {
  logger.error('!!!!!!!!!! UNCAUGHT EXCEPTION !!!!!!!!!!!', { error: error.stack || error });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('!!!!!!!!!! UNHANDLED REJECTION !!!!!!!!!!!', { reason, promise });
});

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({
    exposedHeaders: ['Content-Disposition'],
}));
app.use(express.json({ limit: '50mb' })); // Increase limit for larger file content payloads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use((req, res, next) => {
    logger.info(`${req.method} ${req.originalUrl}`, { ip: req.ip });
    next();
});

const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 100,
	standardHeaders: true,
	legacyHeaders: false,
    message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes.' }
});

app.get("/api/ping", (req, res) => {
  logger.info("[/api/ping] Received ping request.");
  res.status(200).send("pong");
});

app.use("/api", apiLimiter, uploadRoutes);

app.get("/", (req, res) => {
  res.send("CodeFixer API is up and running!");
});

app.use((err, req, res, next) => {
    logger.error(`Unhandled error for ${req.method} ${req.path}:`, { error: err.stack || err });
    res.status(500).json({ success: false, message: 'An internal server error occurred.' });
});

const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      logger.info(`[Server Startup] Created directory: ${dirPath}`);
    } catch (e) {
      logger.error(`[Server Startup] FAILED to create directory: ${dirPath}`, { error: e });
      process.exit(1);
    }
  }
};

app.listen(PORT, () => {
  logger.info(`Server attempting to run on port ${PORT}`);
  // Re-add creation of temporary directories
  ensureDirectoryExists(path.join(__dirname, "uploads"));
  ensureDirectoryExists(path.join(__dirname, "extracted"));
  ensureDirectoryExists(path.join(__dirname, "logs"));

  if (!process.env.GEMINI_API_KEY) {
    logger.warn("CRITICAL WARNING: GEMINI_API_KEY is not set. The application will not function.");
  } else {
    logger.info("GEMINI_API_KEY is loaded.");
  }
  logger.info(`Server is running on port ${PORT}`);
});
