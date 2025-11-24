const archiver = require("archiver");
const path = require("path");
const logger = require("../config/logger");

const zipToBuffer = (files) => {
  return new Promise((resolve, reject) => {
    if (!files || files.length === 0) {
      logger.warn("[zipToBuffer] Received empty or null 'files' array. Returning empty buffer.");
      resolve(Buffer.from('')); 
      return;
    }

    const archive = archiver("zip", { zlib: { level: 9 } });
    const buffers = [];

    archive.on('data', (buffer) => {
        buffers.push(buffer);
    });

    archive.on('end', () => {
        logger.info(`[zipToBuffer] Archive created in memory, ${archive.pointer()} total bytes.`);
        resolve(Buffer.concat(buffers));
    });
    
    archive.on("warning", (err) => {
      logger.warn("[zipToBuffer] Archiver warning:", { error: err });
    });

    archive.on("error", (err) => {
      logger.error("[zipToBuffer] Archiver error:", { error: err });
      reject(err);
    });

    files.forEach((file, index) => {
      if (!file || typeof file !== 'object') {
        logger.warn(`[zipToBuffer] Skipping invalid file at index ${index}: not an object`);
        return;
      }
      if (typeof file.filename !== 'string' || file.filename.trim() === '') {
        logger.warn(`[zipToBuffer] Skipping file at index ${index}: invalid or empty filename`);
        return;
      }
      if (typeof file.fixedContent !== 'string') {
        logger.warn(`[zipToBuffer] Skipping file '${file.filename}': content is not a string`);
        return;
      }
      
      // Security: Prevent path traversal in zip files
      const normalizedPath = path.normalize(file.filename).replace(/^(\.\.(\/|\\|$))+/, '');
      if (normalizedPath !== file.filename) {
        logger.warn(`[zipToBuffer] Normalized potentially unsafe path from '${file.filename}' to '${normalizedPath}'`);
      }
      
      archive.append(Buffer.from(file.fixedContent, 'utf-8'), { name: normalizedPath });
    });

    archive.finalize();
  });
};

module.exports = { zipToBuffer };