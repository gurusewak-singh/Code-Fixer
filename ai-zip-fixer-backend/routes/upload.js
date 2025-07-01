const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const fsp = fs.promises;
const logger = require("../config/logger");
const unzipAndRead = require("../utils/unzipAndRead");
const fixProjectBundle = require("../utils/geminiFixer");
const { zipToBuffer } = require("../utils/zipFixedFiles");

const router = express.Router();

const projectBackendRoot = path.join(__dirname, '..');
const uploadDir = path.join(projectBackendRoot, "uploads");
const extractedBaseDir = path.join(projectBackendRoot, "extracted");

// Switch back to diskStorage for handling large files
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

router.post("/upload", upload.single("projectZip"), async (req, res) => {
  logger.info("[/api/upload] Received ZIP upload request to disk.");
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No .zip file provided." });
  }

  let tempZipPath = req.file.path;
  let tempExtractedPath;

  try {
    const { extractedPath, files } = await unzipAndRead(tempZipPath, extractedBaseDir);
    tempExtractedPath = extractedPath; // Keep track for cleanup

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: "The ZIP file is empty or contains no processable files." });
    }
    res.status(200).json({ success: true, message: "Project ZIP processed successfully.", files });

  } catch (error) {
    logger.error("[/api/upload] Error during disk-based ZIP processing:", { error });
    res.status(500).json({ success: false, message: `Failed to process ZIP file: ${error.message}` });
  } finally {
    // CRITICAL CLEANUP STEP
    if (tempZipPath && fs.existsSync(tempZipPath)) {
      await fsp.unlink(tempZipPath);
      logger.info(`[/api/upload] Cleaned up temporary zip file: ${tempZipPath}`);
    }
    if (tempExtractedPath && fs.existsSync(tempExtractedPath)) {
      await fsp.rm(tempExtractedPath, { recursive: true, force: true });
      logger.info(`[/api/upload] Cleaned up temporary extracted directory: ${tempExtractedPath}`);
    }
  }
});

// Single file upload can remain in memory as they are small
const memoryUpload = multer({ storage: multer.memoryStorage() });
router.post("/upload-single", memoryUpload.single("codeFile"), async (req, res) => {
  logger.info("[/api/upload-single] Received single file upload request to memory.");
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file provided." });
  }
  try {
    const content = req.file.buffer.toString('utf-8');
    res.status(200).json({
      success: true,
      message: "Single file uploaded successfully.",
      files: [{ filename: req.file.originalname, content: content }]
    });
  } catch (error) {
     logger.error("[/api/upload-single] Error during single file processing:", { error });
     res.status(500).json({ success: false, message: `Failed to process file: ${error.message}` });
  }
});

// The /fix and /download routes do not need to change. They are already fully in-memory.
router.post("/fix", async (req, res) => {
  logger.info("[/api/fix] Received fix request.");
  const { files: currentProjectFiles, userPrompt } = req.body;
  try {
    if (!currentProjectFiles || !Array.isArray(currentProjectFiles) || currentProjectFiles.length === 0) {
      return res.status(400).json({ success: false, message: "No files provided for fixing." });
    }
    const aiResponse = await fixProjectBundle(currentProjectFiles, userPrompt);
    const { file_operations: fileChanges, suggested_changes: suggestedChanges } = aiResponse;
    const updatedProjectFilesMap = new Map(currentProjectFiles.map(file => [file.filename, file.content]));
    fileChanges.forEach(change => {
      updatedProjectFilesMap.set(change.filename, change.content);
    });
    const updatedProjectState = Array.from(updatedProjectFilesMap, ([filename, content]) => ({ filename, content }));
    res.status(200).json({
      success: true,
      message: `Project successfully refined. ${fileChanges.length} file(s) were updated.`,
      fileChanges,
      suggestedChanges,
      updatedProjectState
    });
  } catch (error) {
    logger.error("[/api/fix] Critical error in /fix route:", { error });
    res.status(500).json({ success: false, message: `An error occurred during the fixing process: ${error.message}` });
  }
});

router.post('/download', async (req, res) => {
    logger.info('[/api/download] Received project download request.');
    const { projectState } = req.body;
    if (!projectState || !Array.isArray(projectState) || projectState.length === 0) {
        return res.status(400).json({ success: false, message: 'No project data provided for download.' });
    }
    try {
        const filesToZip = projectState.map(file => ({
            filename: file.filename,
            fixedContent: file.content
        }));
        const zipBuffer = await zipToBuffer(filesToZip);
        const timestamp = Date.now();
        const zipFilename = `fixed-project-${timestamp}.zip`;
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=${zipFilename}`);
        res.send(zipBuffer);
    } catch(error) {
        logger.error('[/api/download] Error creating zip for download:', { error });
        res.status(500).json({ success: false, message: 'Failed to create project archive.' });
    }
});

module.exports = router;