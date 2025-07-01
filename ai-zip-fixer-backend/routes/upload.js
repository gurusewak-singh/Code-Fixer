const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const fsp = fs.promises;
const logger = require("../config/logger");
const unzipAndRead = require("../utils/unzipAndRead");
const fixProjectBundle = require("../utils/geminiFixer");
const { zipFixedFiles } = require("../utils/zipFixedFiles");

const router = express.Router();

const projectBackendRoot = path.join(__dirname, '..');
const uploadDir = path.join(projectBackendRoot, "uploads");
const extractedBaseDir = path.join(projectBackendRoot, "extracted");
const fixedOutputDirectory = path.join(projectBackendRoot, "fixed");

// ... (multer setup remains the same, no changes needed here)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, `${uniqueSuffix}-${safeOriginalName}`);
  },
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});
// ... (upload and upload-single routes remain the same)
router.post("/upload", upload.single("projectZip"), async (req, res) => {
  logger.info("[/api/upload] Received ZIP upload request.");
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No .zip file provided." });
  }

  const { path: zipFilePath, filename } = req.file;
  const baseExtractionFolder = path.basename(filename, path.extname(filename));
  const extractionPath = path.join(extractedBaseDir, baseExtractionFolder);

  try {
    const { files, extractedPath: actualExtractionPath } = await unzipAndRead(zipFilePath, extractionPath);
    
    await fsp.unlink(zipFilePath);
    logger.info(`[/api/upload] Cleaned up original zip: ${zipFilePath}`);

    // Critical: Clean up the temporary extracted folder immediately
    if (fs.existsSync(actualExtractionPath)) {
        await fsp.rm(actualExtractionPath, { recursive: true, force: true });
        logger.info(`[/api/upload] Cleaned up extracted folder: ${actualExtractionPath}`);
    }

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: "The ZIP file is empty or contains no processable files." });
    }
    // We no longer send extractedPath, as it's been cleaned up
    res.status(200).json({ success: true, message: "Project ZIP uploaded and processed successfully.", files });
  } catch (error) {
    logger.error("[/api/upload] Error during ZIP processing:", { error });
    res.status(500).json({ success: false, message: `Failed to process ZIP file: ${error.message}` });
  }
});

router.post("/upload-single", upload.single("codeFile"), async (req, res) => {
  logger.info("[/api/upload-single] Received single file upload request.");
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file provided." });
  }
  const { path: tempFilePath, originalname } = req.file;
  try {
    const content = await fsp.readFile(tempFilePath, "utf-8");
    await fsp.unlink(tempFilePath); 
    res.status(200).json({
      success: true,
      message: "Single file uploaded successfully.",
      files: [{ filename: originalname, content: content }]
    });
  } catch (error) {
     logger.error("[/api/upload-single] Error during single file processing:", { error });
     if (fs.existsSync(tempFilePath)) { await fsp.unlink(tempFilePath); }
     res.status(500).json({ success: false, message: `Failed to process file: ${error.message}` });
  }
});


// MAJOR UPDATE TO THE /fix ROUTE
router.post("/fix", async (req, res) => {
  logger.info("[/api/fix] Received fix request.");
  const { files: currentProjectFiles, userPrompt } = req.body;

  try {
    if (!currentProjectFiles || !Array.isArray(currentProjectFiles) || currentProjectFiles.length === 0) {
      return res.status(400).json({ success: false, message: "No files provided for fixing." });
    }

    // The AI response now has a different structure
    const aiResponse = await fixProjectBundle(currentProjectFiles, userPrompt);
    const { file_operations: fileChanges, suggested_changes: suggestedChanges } = aiResponse;

    // --- LOGIC TO CALCULATE THE NEW PROJECT STATE ---
    const updatedProjectFilesMap = new Map(currentProjectFiles.map(file => [file.filename, file.content]));
    fileChanges.forEach(change => {
      // 'modified' and 'created' actions both result in setting the file content
      updatedProjectFilesMap.set(change.filename, change.content);
    });
    const updatedProjectState = Array.from(updatedProjectFilesMap, ([filename, content]) => ({ filename, content }));
    // --- END OF STATE CALCULATION ---

    const filesToZip = updatedProjectState.map(file => ({
        filename: file.filename,
        fixedContent: file.content
    }));

    let downloadUrl = null;
    let message = "AI processing complete.";

    if (filesToZip.length > 0) {
      const timestamp = Date.now();
      const zipFilename = `fixed-project-${timestamp}.zip`;
      const outputPath = path.join(fixedOutputDirectory, zipFilename);
      await zipFixedFiles(filesToZip, outputPath);
      downloadUrl = `/fixed/${zipFilename}`;
      message = `Project successfully refined. ${fileChanges.length} file(s) were updated.`;
    } else {
      message = "AI processing complete. No files were modified in this step.";
    }

    res.status(200).json({
      success: true,
      message,
      downloadUrl,
      fileChanges,        // The specific changes from this step
      suggestedChanges,   // The new suggestions from the AI
      updatedProjectState // The complete, new state of all project files
    });
    
  } catch (error) {
    logger.error("[/api/fix] Critical error in /fix route:", { error });
    res.status(500).json({ success: false, message: `An error occurred during the fixing process: ${error.message}` });
  }
});

module.exports = router;