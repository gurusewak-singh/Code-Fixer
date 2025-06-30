// ai-zip-fixer-backend/routes/upload.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const fsp = fs.promises;
const unzipAndRead = require("../utils/unzipAndRead");
const fixProjectBundle = require("../utils/geminiFixer");
const { zipFixedFiles } = require("../utils/zipFixedFiles");

const router = express.Router();

const projectBackendRoot = path.join(__dirname, '..');
const uploadDir = path.join(projectBackendRoot, "uploads");
const extractedBaseDir = path.join(projectBackendRoot, "extracted");
const fixedOutputDirectory = path.join(projectBackendRoot, "fixed");

// Multer setup for file uploads
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
  // Note: We don't need a file filter here, as we can trust the frontend's 'accept' attribute for basic filtering.
  // The server logic will handle different types.
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Existing route for ZIP files (no changes needed)
router.post("/upload", upload.single("projectZip"), async (req, res) => {
  console.log("[/api/upload] Received ZIP upload request.");
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No .zip file provided." });
  }

  const { path: zipFilePath, filename } = req.file;
  const baseExtractionFolder = path.basename(filename, path.extname(filename));
  const extractionPath = path.join(extractedBaseDir, baseExtractionFolder);

  try {
    const { files, extractedPath: actualExtractionPath } = await unzipAndRead(zipFilePath, extractionPath);
    if (!files || files.length === 0) {
      if (fs.existsSync(actualExtractionPath)) await fsp.rm(actualExtractionPath, { recursive: true, force: true });
      return res.status(400).json({ success: false, message: "The ZIP file is empty or contains no processable files." });
    }
    res.status(200).json({ success: true, message: "Project ZIP uploaded and extracted successfully.", extractedPath: actualExtractionPath, files });
  } catch (error) {
    console.error("[/api/upload] Error during ZIP processing:", error);
    res.status(500).json({ success: false, message: `Failed to process ZIP file: ${error.message}` });
  }
});


// [NEW] Route for single file uploads
router.post("/upload-single", upload.single("codeFile"), async (req, res) => {
  console.log("[/api/upload-single] Received single file upload request.");
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file provided." });
  }

  const { path: tempFilePath, originalname } = req.file;

  try {
    const content = await fsp.readFile(tempFilePath, "utf-8");
    
    // IMPORTANT: Clean up the temporary file uploaded by multer
    await fsp.unlink(tempFilePath);
    
    // Normalize the response to match the structure of the ZIP upload
    res.status(200).json({
      success: true,
      message: "Single file uploaded successfully.",
      extractedPath: null, // No extraction path for single files
      files: [{
        filename: originalname, // Use the original file name
        content: content
      }]
    });
  } catch (error) {
     console.error("[/api/upload-single] Error during single file processing:", error);
     // Also try to clean up on error
     if (fs.existsSync(tempFilePath)) {
        await fsp.unlink(tempFilePath);
     }
     res.status(500).json({ success: false, message: `Failed to process file: ${error.message}` });
  }
});


// UPDATE THIS ROUTE
router.post("/fix", async (req, res) => {
  console.log("[/api/fix] Received fix request.");
  // NEW: Destructure the userPrompt from the request body
  const { files: originalInputFiles, extractedPath, userPrompt } = req.body;

  try {
    if (!originalInputFiles || !Array.isArray(originalInputFiles) || originalInputFiles.length === 0) {
      return res.status(400).json({ success: false, message: "No files provided for fixing." });
    }

    // Pass the prompt to the fixer utility
    const aiProcessedFileObjects = await fixProjectBundle(originalInputFiles, userPrompt);
    
    // The rest of the logic in this route remains the same and is correct
    const filesToZip = aiProcessedFileObjects
      .filter(op => op.action !== 'deleted' && typeof op.content === 'string')
      .map(op => ({ filename: op.filename, fixedContent: op.content }));

    let downloadUrl = null;
    let message = "AI processing complete.";
    const warnings = [];

    if (filesToZip.length > 0) {
      const timestamp = Date.now();
      const zipFilename = `fixed-project-${timestamp}.zip`;
      const outputPath = path.join(fixedOutputDirectory, zipFilename);
      await zipFixedFiles(filesToZip, outputPath);
      downloadUrl = `/fixed/${zipFilename}`;
      message = `Project processing complete. ${filesToZip.length} file(s) are in the output ZIP.`;
    } else {
      message = "AI processing complete. No files were modified or created for the output package.";
    }

    if (extractedPath && fs.existsSync(extractedPath)) {
      await fsp.rm(extractedPath, { recursive: true, force: true }).catch(err => {
        console.error(`[/api/fix] Failed to clean up temporary folder ${extractedPath}:`, err.message);
        warnings.push({ filename: "N/A", detail: `Failed to clean up temporary folder.`});
      });
    }

    res.status(200).json({
      success: true,
      message,
      downloadUrl,
      fileChanges: aiProcessedFileObjects,
      warnings,
    });
    
  } catch (error) {
    console.error("[/api/fix] Critical error in /fix route:", error);
    res.status(500).json({ success: false, message: `An error occurred during the fixing process: ${error.message}` });
  }
});

module.exports = router;