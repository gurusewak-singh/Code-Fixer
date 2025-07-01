const fs = require("fs");
const fsp = fs.promises;
const unzipper = require("unzipper");
const path = require("path");
const logger = require("../config/logger");

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
    if (fs.existsSync(extractedPath)) {
        await fsp.rm(extractedPath, { recursive: true, force: true }).catch(cleanupError => 
            logger.error(`[unzipAndRead] Error during cleanup of ${extractedPath}:`, { error: cleanupError })
        );
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
              const content = await fsp.readFile(fullPath, "utf-8");
              const relativePath = path.relative(relativeBase, fullPath).replace(/\\/g, "/");
              codeFiles.push({ filename: relativePath, content });
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

  await readFilesRecursively(extractedPath, extractedPath);
  logger.info(`[unzipAndRead] Scan finished. Files Scanned: ${filesScanned}, Files Collected: ${codeFiles.length}.`);

  // This is the key: return the path so it can be deleted after.
  return { extractedPath, files: codeFiles };
};

module.exports = unzipAndRead;