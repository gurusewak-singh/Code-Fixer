const fs = require("fs");
const fsp = fs.promises;
const unzipper = require("unzipper");
const path = require("path");

const allowedExtensions = [
  ".js", ".ts", ".jsx", ".tsx", ".py", ".html", ".css", ".scss", ".less",
  ".json", ".xml", ".yaml", ".yml", ".md", ".txt", ".java", ".c", ".cpp",
  ".h", ".hpp", ".cs", ".php", ".rb", ".go", ".swift", ".kt", ".kts", ".dart",
  ".rs", ".sh", ".pl", ".lua", ".sql", ".r", ".m", ".scala", ".groovy", ".vue"
  // Note: .env and .gitignore are handled by specificFilenamesToInclude
];

// List of specific filenames (case-insensitive) to include, often without extensions or as dotfiles
const specificFilenamesToInclude = [
  '.env',
  '.gitignore',
  'dockerfile',
  'procfile',
  'readme.md', // common to include readme
  // Add other files like '.npmrc', 'package.json', 'requirements.txt' if they aren't caught by extensions
  // and you want them processed or at least included in the context for the AI.
  // package.json is already caught by .json extension.
];

// List of specific filenames (case-insensitive) to EXCLUDE
const specificFilenamesToExclude = [
  'package-lock.json'
  // Add other files to explicitly exclude here if needed
];


const unzipAndRead = async (zipFilePath, baseOutputFolder) => {
  console.log(`[unzipAndRead] Starting for zip: ${zipFilePath}. Base output: ${baseOutputFolder}`);
  const uniqueFolderName = Date.now().toString() + "_" + Math.random().toString(36).substring(2, 10);
  const extractedPath = path.join(baseOutputFolder, uniqueFolderName);
  console.log(`[unzipAndRead] Target extraction path: ${extractedPath}`);

  try {
    await fsp.mkdir(extractedPath, { recursive: true });
    console.log(`[unzipAndRead] Created extraction directory successfully: ${extractedPath}`);
  } catch (mkdirError) {
    console.error(`[unzipAndRead] FATAL ERROR: Failed to create extraction directory ${extractedPath}. Error:`, mkdirError);
    throw mkdirError;
  }

  try {
    console.log(`[unzipAndRead] Attempting to extract ${zipFilePath} to ${extractedPath} using unzipper.`);
    await fs.createReadStream(zipFilePath)
      .pipe(unzipper.Extract({ path: extractedPath }))
      .promise();
    console.log(`[unzipAndRead] Successfully extracted ${zipFilePath} to ${extractedPath}.`);
  } catch (unzipError) {
    console.error(`[unzipAndRead] FATAL ERROR during unzipper.Extract for ${zipFilePath}. Error:`, unzipError);
    if (fs.existsSync(extractedPath)) {
        console.log(`[unzipAndRead] Attempting to clean up partially extracted folder: ${extractedPath}`);
        try {
            await fsp.rm(extractedPath, { recursive: true, force: true });
            console.log(`[unzipAndRead] Cleaned up folder: ${extractedPath}`);
        } catch (cleanupError) {
            console.error(`[unzipAndRead] Error during cleanup of ${extractedPath}:`, cleanupError);
        }
    }
    throw unzipError;
  }

  const codeFiles = [];
  let filesScanned = 0;
  let directoriesScanned = 0;
  let filesAddedToCollection = 0;

  async function readFilesRecursively(currentFolder, relativeBase) {
    directoriesScanned++;
    let items;
    try {
      items = await fsp.readdir(currentFolder);
    } catch (readDirError) {
      console.error(`[readFilesRecursively] ERROR: Could not read directory ${currentFolder}. Error:`, readDirError);
      return;
    }

    for (const item of items) {
      const fullPath = path.join(currentFolder, item);
      let stat;
      try {
        stat = await fsp.stat(fullPath);
      } catch (statError) {
        console.warn(`[readFilesRecursively] WARN: Could not stat item ${fullPath}. Error: ${statError.message}. Skipping.`);
        continue;
      }

      if (stat.isDirectory()) {
        if (item.toLowerCase() === "node_modules" || item.toLowerCase() === ".git") {
          console.log(`[readFilesRecursively] SKIPPING directory: ${fullPath}`);
          continue;
        }
        await readFilesRecursively(fullPath, relativeBase);
      } else {
        filesScanned++;
        const fileExtension = path.extname(item).toLowerCase();
        const fileNameLower = item.toLowerCase();

        // Check if the file should be explicitly excluded
        if (specificFilenamesToExclude.includes(fileNameLower)) {
          console.log(`[readFilesRecursively] EXCLUDING specific file (matches exclusion list): ${fullPath}`);
          continue; // Skip this file
        }

        if (specificFilenamesToInclude.includes(fileNameLower) || allowedExtensions.includes(fileExtension)) {
          try {
            const content = await fsp.readFile(fullPath, "utf-8");
            const relativePath = path.relative(relativeBase, fullPath).replace(/\\/g, "/"); // Normalize path separators
            codeFiles.push({ filename: relativePath, content });
            filesAddedToCollection++;
            if (filesAddedToCollection % 100 === 0) {
                 console.log(`[readFilesRecursively] Added ${filesAddedToCollection} code files to collection... Last added: ${relativePath}`);
            }
          } catch (readFileError) {
            console.error(`[readFilesRecursively] ERROR: Failed to read file content for ${fullPath}. Error:`, readFileError);
          }
        } else {
          // Optional: Log files that are skipped due to not matching any inclusion criteria
          // console.log(`[readFilesRecursively] Skipping file (does not match inclusion criteria): ${fullPath}`);
        }
      }
    }
  }

  console.log(`[unzipAndRead] Starting recursive scan of extracted files in ${extractedPath}.`);
  await readFilesRecursively(extractedPath, extractedPath);
  console.log(`[unzipAndRead] Recursive scan finished. Total directories scanned: ${directoriesScanned}. Total files scanned: ${filesScanned}. Code files collected: ${filesAddedToCollection}.`);

  if (filesAddedToCollection === 0 && filesScanned > 0) {
    console.warn(`[unzipAndRead] WARNING: Scanned ${filesScanned} files but none matched the allowed extensions/filenames or could be read.`);
  }

  return {
    extractedPath,
    files: codeFiles,
  };
};

module.exports = unzipAndRead;