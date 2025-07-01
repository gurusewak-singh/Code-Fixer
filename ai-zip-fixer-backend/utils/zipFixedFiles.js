const fs = require("fs");
const archiver = require("archiver");
const logger = require("../config/logger");

const zipFixedFiles = (files, outputPath) => {
  return new Promise((resolve, reject) => {
    if (!files || files.length === 0) {
      logger.warn("[zipFixedFiles] Received empty or null 'files' array. Not creating a zip file.");
      resolve(); // Resolve immediately as there's nothing to do.
      return;
    }

    const output = fs.createWriteStream(outputPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    let filesAddedToArchiveCount = 0;

    output.on("close", () => {
      logger.info(`[zipFixedFiles] Archive created: ${outputPath}, ${archive.pointer()} total bytes. Files appended: ${filesAddedToArchiveCount}`);
      resolve();
    });

    archive.on("warning", (err) => {
      if (err.code === 'ENOENT') {
        logger.warn("[zipFixedFiles] Archiver warning (ENOENT):", { error: err });
      } else {
        reject(err);
      }
    });

    archive.on("error", (err) => {
      logger.error("[zipFixedFiles] Archiver error:", { error: err });
      reject(err);
    });

    archive.pipe(output);

    files.forEach((file) => {
      if (file && typeof file.fixedContent === 'string' && typeof file.filename === 'string') {
        archive.append(Buffer.from(file.fixedContent, 'utf-8'), { name: file.filename });
        filesAddedToArchiveCount++;
      } else {
        logger.warn("[zipFixedFiles] Skipping invalid file object during zipping.", { fileObject: file ? `{filename: ${file.filename}, content_type: ${typeof file.fixedContent}}` : 'undefined file' });
      }
    });

    if (filesAddedToArchiveCount === 0 && files.length > 0) {
        logger.warn("[zipFixedFiles] Received files to zip, but none were valid to append to the archive.");
    }

    archive.finalize();
  });
};

module.exports = { zipFixedFiles };