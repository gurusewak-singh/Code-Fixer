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

// If upload.js is in 'ai-zip-fixer-backend/routes/', then __dirname is '.../ai-zip-fixer-backend/routes'.
// We want to go up one level to 'ai-zip-fixer-backend/' to define our 'uploads', 'extracted', 'fixed' directories.
const projectBackendRoot = path.join(__dirname, '..'); // <-- CORRECTED LINE

// These directories will now be correctly placed inside 'ai-zip-fixer-backend/'
const uploadDir = path.join(projectBackendRoot, "uploads");
const extractedBaseDir = path.join(projectBackendRoot, "extracted");
const fixedOutputDirectory = path.join(projectBackendRoot, "fixed");

// Ensure directories exist
[uploadDir, extractedBaseDir, fixedOutputDirectory].forEach(dir => {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`[Server Startup/Upload Route] Created directory: ${dir}`);
    } catch (e) {
      console.error(`[Server Startup/Upload Route] FAILED to create directory: ${dir}`, e);
    }
  }
});

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, uniqueSuffix + '-' + safeOriginalName);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/zip" || file.mimetype === "application/x-zip-compressed") {
      cb(null, true);
    } else {
      console.warn(`[/api/upload] Rejected file: ${file.originalname} due to invalid mimetype: ${file.mimetype}`);
      cb(new Error("Invalid file type. Only .zip files are allowed."), false);
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 }
});


// ==================================================
// ==          THE /upload ROUTE HANDLER           ==
// ==================================================
router.post("/upload", upload.single("projectZip"), async (req, res) => {
  console.log("[/api/upload] Received new upload request.");

  if (!req.file) {
    console.warn("[/api/upload] No file uploaded or file rejected by filter.");
    return res.status(400).json({ success: false, message: "No .zip file uploaded or file type was incorrect." });
  }

  const zipFilePath = req.file.path;
  const baseExtractionFolderName = path.basename(req.file.filename, path.extname(req.file.filename));
  const extractionPathForThisUpload = path.join(extractedBaseDir, baseExtractionFolderName);

  try {
    console.log(`[/api/upload] Uploaded file: ${zipFilePath}`);
    console.log(`[/api/upload] Base directory for extraction for this upload: ${extractionPathForThisUpload}`);

    if (!fs.existsSync(extractionPathForThisUpload)) {
      await fsp.mkdir(extractionPathForThisUpload, { recursive: true });
      console.log(`[/api/upload] Created base extraction directory for this upload: ${extractionPathForThisUpload}`);
    }

    const { files, extractedPath: actualExtractionPath } = await unzipAndRead(zipFilePath, extractionPathForThisUpload);

    if (!files || files.length === 0) {
        console.warn(`[/api/upload] UnzipAndRead processed the file but found no files inside or failed to read them: ${zipFilePath}`);
        if (fs.existsSync(actualExtractionPath)) await fsp.rm(actualExtractionPath, { recursive: true, force: true });
        try {
            const itemsInBase = await fsp.readdir(extractionPathForThisUpload);
            if (itemsInBase.length === 0) {
                await fsp.rmdir(extractionPathForThisUpload);
                console.log(`[/api/upload] Cleaned up empty base extraction directory: ${extractionPathForThisUpload}`);
            }
        } catch (e) { /* ignore */ }
        if (fs.existsSync(zipFilePath)) await fsp.unlink(zipFilePath);
        return res.status(400).json({ success: false, message: "The ZIP file seems to be empty or could not be processed." });
    }

    console.log(`[/api/upload] Successfully unzipped and read ${files.length} files from ${zipFilePath}. Extracted to unique folder: ${actualExtractionPath}`);

    res.status(200).json({
      success: true,
      message: "File uploaded and extracted successfully.",
      extractedPath: actualExtractionPath,
      files: files,
    });

  } catch (error) {
    console.error("[/api/upload] Error during file upload and extraction:", error.message, error.stack ? error.stack : '');
    if (req.file && req.file.filename) {
        const baseExtractionFolderNameOnError = path.basename(req.file.filename, path.extname(req.file.filename));
        const potentialExtractionPathOnError = path.join(extractedBaseDir, baseExtractionFolderNameOnError);
        if (fs.existsSync(potentialExtractionPathOnError)) {
            try {
                await fsp.rm(potentialExtractionPathOnError, { recursive: true, force: true });
                console.log(`[/api/upload] Cleaned up base extraction directory after error: ${potentialExtractionPathOnError}`);
            } catch (cleanupErr) {
                console.error(`[/api/upload] Error cleaning up ${potentialExtractionPathOnError} after failed upload:`, cleanupErr.message);
            }
        }
    }
    if (zipFilePath && fs.existsSync(zipFilePath)) {
        try {
            await fsp.unlink(zipFilePath);
            console.log(`[/api/upload] Deleted uploaded zip file after error: ${zipFilePath}`);
        } catch (zipDeleteErr) {
            console.error(`[/api/upload] Error deleting uploaded zip file ${zipFilePath} after error:`, zipDeleteErr.message);
        }
    }
    res.status(500).json({ success: false, message: `Failed to process uploaded file: ${error.message}` });
  }
});

// Multer error handler
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.warn("[Multer Error Handler] Multer error:", err.code, err.message);
    let message = "File upload error.";
    if (err.code === 'LIMIT_FILE_SIZE') message = "File is too large.";
    else if (err.code === 'LIMIT_UNEXPECTED_FILE') message = "Unexpected file field.";
    return res.status(400).json({ success: false, message });
  } else if (err && err.message === "Invalid file type. Only .zip files are allowed.") {
    console.warn("[Upload Route Error Handler] File filter error:", err.message);
    return res.status(400).json({ success: false, message: err.message });
  } else if (err) {
    console.warn("[Upload Route Error Handler] Non-Multer error during upload stage:", err.message);
    return res.status(500).json({ success: false, message: err.message || "An unexpected error occurred during upload." });
  }
  next();
});


// ==================================================
// ==         YOUR EXISTING /fix ROUTE             ==
// ==================================================
router.post("/fix", async (req, res) => {
  console.log("[/api/fix] Received new fix request.");
  const { files: originalInputFiles, extractedPath } = req.body;

  try {
    if (!originalInputFiles || !Array.isArray(originalInputFiles) || originalInputFiles.length === 0) {
      console.warn("[/api/fix] Invalid input: No files provided for fixing.");
      if (extractedPath && fs.existsSync(extractedPath)) {
        console.log(`[/api/fix] Attempting cleanup of ${extractedPath} due to invalid input (no files).`);
        await fsp.rm(extractedPath, { recursive: true, force: true }).catch(e => console.error(`[/api/fix] Cleanup error for ${extractedPath} on bad input: ${e.message}`));
      }
      return res.status(400).json({ success: false, message: "No files provided for fixing. Please upload a project first." });
    }
    if (!extractedPath || typeof extractedPath !== 'string' || !fs.existsSync(extractedPath)) { // Added existsSync check for robustness
        console.warn(`[/api/fix] Missing, invalid, or non-existent 'extractedPath': ${extractedPath}. Cleanup of temporary extracted files will be skipped for this request if path is not valid.`);
    }

    console.log(`[/api/fix] Starting AI processing for project with ${originalInputFiles.length} files. Extracted path (for cleanup): ${extractedPath || 'Not Provided'}`);

    const aiProcessedFileObjects = await fixProjectBundle(originalInputFiles);

    const filesToZip = [];
    let warnings = [];

    for (const fileOp of aiProcessedFileObjects) {
      let contentToZip;
      let isValidOperation = true;

      if (!fileOp || typeof fileOp.filename !== 'string' || typeof fileOp.action !== 'string') {
        console.warn(`[/api/fix] AI returned malformed file operation object. Skipping:`, fileOp);
        warnings.push({ filename: "N/A", detail: "AI returned a malformed file operation object.", item: JSON.stringify(fileOp) });
        continue;
      }

      if (fileOp.action === 'unchanged') {
        if (fileOp.content === undefined || fileOp.content === null || typeof fileOp.content !== 'string') {
          const originalFile = originalInputFiles.find(f => f.filename === fileOp.filename);
          if (originalFile && typeof originalFile.content === 'string') {
            contentToZip = originalFile.content;
          } else {
            warnings.push({ filename: fileOp.filename, detail: "Marked 'unchanged' by AI but content was missing/invalid and original could not be used." });
            isValidOperation = false;
          }
        } else {
          contentToZip = fileOp.content;
        }
      } else if (fileOp.action === 'created' || fileOp.action === 'modified') {
        if (typeof fileOp.content === 'string') {
          contentToZip = fileOp.content;
        } else {
            warnings.push({ filename: fileOp.filename, detail: `Marked '${fileOp.action}' but AI content was missing or not a string.` });
            isValidOperation = false;
        }
      } else if (fileOp.action === 'deleted') {
          isValidOperation = false;
      } else {
          warnings.push({ filename: fileOp.filename, detail: `Unknown AI action: '${fileOp.action}'.` });
          isValidOperation = false;
      }

      if (isValidOperation && contentToZip !== undefined) {
        filesToZip.push({ filename: fileOp.filename, fixedContent: contentToZip });
      }
    }

    if (filesToZip.length === 0) {
      let message = "AI processing complete. No files were designated for the output package.";
      if (originalInputFiles.length > 0 && warnings.length === 0) {
            warnings.push({ filename: "N/A", detail: "No files were eligible for the final ZIP archive based on AI output or processing." });
      }
      
      if (extractedPath && fs.existsSync(extractedPath)) {
          try {
              await fsp.rm(extractedPath, { recursive: true, force: true });
              console.log(`[/api/fix] Successfully deleted temporary extracted folder (no files to zip): ${extractedPath}`);
          } catch (cleanupErr) {
              console.error(`[/api/fix] Error deleting temporary extracted folder ${extractedPath} (no files to zip):`, cleanupErr.message);
              warnings.push({ filename: "N/A", detail: `Failed to clean up temporary folder: ${extractedPath}`});
          }
      }
      return res.status(200).json({ success: true, message: message, downloadUrl: null, warnings: warnings });
    }

    const timestamp = Date.now();
    const zipFilename = `fixed-project-${timestamp}.zip`;
    const outputPath = path.join(fixedOutputDirectory, zipFilename);

    await zipFixedFiles(filesToZip, outputPath);
    const downloadUrl = `/fixed/${zipFilename}`;

    if (extractedPath && fs.existsSync(extractedPath)) {
      try {
        await fsp.rm(extractedPath, { recursive: true, force: true });
        console.log(`[/api/fix] Successfully deleted temporary extracted folder: ${extractedPath}`);
      } catch (cleanupErr) {
        console.error(`[/api/fix] Error deleting temporary extracted folder ${extractedPath}:`, cleanupErr.message);
        warnings.push({ filename: "N/A", detail: `Failed to clean up temporary folder post-zip: ${extractedPath}`});
      }
    }

    let createdCount = aiProcessedFileObjects.filter(f => f.action === 'created').length;
    let modifiedCount = aiProcessedFileObjects.filter(f => f.action === 'modified').length;
    let unchangedCount = aiProcessedFileObjects.filter(f => f.action === 'unchanged').length;
    let deletedCount = aiProcessedFileObjects.filter(f => f.action === 'deleted').length;

    res.status(200).json({
      success: true,
      message: `Project processing complete. ${filesToZip.length} file(s) included in the output ZIP. (AI actions: Created: ${createdCount}, Modified: ${modifiedCount}, Unchanged: ${unchangedCount}, Deleted: ${deletedCount})`,
      downloadUrl: downloadUrl,
      warnings: warnings,
    });

  } catch (error) {
    console.error("[/api/fix] Critical error in /fix route:", error.message, error.stack ? error.stack : '');
    if (extractedPath && fs.existsSync(extractedPath)) {
        try {
            await fsp.rm(extractedPath, { recursive: true, force: true });
            console.log(`[/api/fix] Cleaned up extracted folder after error: ${extractedPath}`);
        } catch (cleanupErr) {
            console.error(`[/api/fix] Error during cleanup of ${extractedPath} after critical error:`, cleanupErr.message);
        }
    }
    res.status(500).json({ success: false, message: `Something went wrong during the fixing process: ${error.message}` });
  }
});

module.exports = router;