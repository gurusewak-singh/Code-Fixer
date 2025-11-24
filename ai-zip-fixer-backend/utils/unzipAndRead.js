const fs = require("fs");
const fsp = fs.promises;
const unzipper = require("unzipper");
const path = require("path");
const logger = require("../config/logger");

// Security: Validate that a path doesn't escape the base directory
function isPathSafe(basePath, targetPath) {
  const resolvedBase = path.resolve(basePath);
  const resolvedTarget = path.resolve(targetPath);
  return resolvedTarget.startsWith(resolvedBase);
}

const allowedExtensions = [
  ".js", ".ts", ".jsx", ".tsx", ".py", ".html", ".css", ".scss", ".less",
  ".json", ".xml", ".yaml", ".yml", ".md", ".txt", ".java", ".c", ".cpp",
  ".h", ".hpp", ".cs", ".php", ".rb", ".go", ".swift", ".kt", ".kts", ".dart",
  ".rs", ".sh", ".pl", ".lua", ".sql", ".r", ".m", ".scala", ".groovy", ".vue"
];
const specificFilenamesToInclude = ['.env', '.gitignore', 'dockerfile', 'procfile', 'readme.md'];
const specificFilenamesToExclude = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];

const unzipAndRead = async (zipFilePath, baseOutputFolder) => {
  logger.info(`[unzipAndRead] Starting process for zip: ${zipFilePath}`);
  const uniqueFolderName = Date.now().toString() + "_" + Math.random().toString(36).substring(2, 10);
  const extractedPath = path.join(baseOutputFolder, uniqueFolderName);
  logger.info(`[unzipAndRead] Target temporary extraction path: ${extractedPath}`);

  try {
    await fsp.mkdir(extractedPath, { recursive: true });
  } catch (mkdirError) {
    logger.error(`[unzipAndRead] FATAL: Failed to create extraction directory ${extractedPath}.`, { error: mkdirError });
    throw mkdirError;
  }

  try {
    await fs.createReadStream(zipFilePath)
      .pipe(unzipper.Extract({ path: extractedPath }))
      .promise();
    logger.info(`[unzipAndRead] Successfully extracted ${zipFilePath} to ${extractedPath}.`);
  } catch (unzipError) {
    logger.error(`[unzipAndRead] FATAL: Error during unzipper.Extract for ${zipFilePath}.`, { error: unzipError });
    // Clean up if extraction fails
    try {
      if (fs.existsSync(extractedPath)) {
        await fsp.rm(extractedPath, { recursive: true, force: true });
        logger.info(`[unzipAndRead] Cleaned up extraction directory after failure: ${extractedPath}`);
      }
    } catch (cleanupError) {
      logger.error(`[unzipAndRead] Error during cleanup of ${extractedPath}:`, { error: cleanupError });
    }
    throw unzipError;
  }

  const codeFiles = [];
  let filesScanned = 0;

  async function readFilesRecursively(currentFolder, relativeBase) {
    try {
      const items = await fsp.readdir(currentFolder);
      for (const item of items) {
        const fullPath = path.join(currentFolder, item);
        
        // Security: Prevent path traversal attacks
        if (!isPathSafe(relativeBase, fullPath)) {
          logger.warn(`[readFilesRecursively] SECURITY: Blocked path traversal attempt: ${fullPath}`);
          continue;
        }
        
        try {
          const stat = await fsp.stat(fullPath);
          if (stat.isDirectory()) {
            if (item.toLowerCase() === "node_modules" || item.startsWith(".")) {
              logger.info(`[readFilesRecursively] SKIPPING directory: ${fullPath}`);
              continue;
            }
            await readFilesRecursively(fullPath, relativeBase);
          } else {
            filesScanned++;
            const fileExtension = path.extname(item).toLowerCase();
            const fileNameLower = item.toLowerCase();
            if (specificFilenamesToExclude.includes(fileNameLower)) continue;
            if (specificFilenamesToInclude.includes(fileNameLower) || allowedExtensions.includes(fileExtension)) {
              try {
                const content = await fsp.readFile(fullPath, "utf-8");
                const relativePath = path.relative(relativeBase, fullPath).replace(/\\/g, "/");
                codeFiles.push({ filename: relativePath, content });
              } catch (readError) {
                // Handle files that can't be read as UTF-8 (binary files)
                logger.warn(`[readFilesRecursively] Could not read file as UTF-8 (may be binary): ${fullPath}`, { error: readError.message });
              }
            }
          }
        } catch (statError) {
          logger.warn(`[readFilesRecursively] WARN: Could not stat item ${fullPath}.`, { error: statError.message });
        }
      }
    } catch (readDirError) {
      logger.error(`[readFilesRecursively] ERROR: Could not read directory ${currentFolder}.`, { error: readDirError });
    }
  }

  try {
    await readFilesRecursively(extractedPath, extractedPath);
    logger.info(`[unzipAndRead] Scan finished. Files Scanned: ${filesScanned}, Files Collected: ${codeFiles.length}.`);
  } catch (scanError) {
    logger.error(`[unzipAndRead] Error during file scanning:`, { error: scanError });
    // Clean up extraction directory on error
    try {
      if (fs.existsSync(extractedPath)) {
        await fsp.rm(extractedPath, { recursive: true, force: true });
        logger.info(`[unzipAndRead] Cleaned up extraction directory after scan error: ${extractedPath}`);
      }
    } catch (cleanupError) {
      logger.error(`[unzipAndRead] Error during cleanup of ${extractedPath}:`, { error: cleanupError });
    }
    throw scanError;
  }

  // This is the key: return the path so it can be deleted after.
  return { extractedPath, files: codeFiles };
};

module.exports = unzipAndRead;