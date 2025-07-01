const archiver = require("archiver");
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

    files.forEach((file) => {
      if (file && typeof file.fixedContent === 'string' && typeof file.filename === 'string') {
        archive.append(Buffer.from(file.fixedContent, 'utf-8'), { name: file.filename });
      }
    });

    archive.finalize();
  });
};

module.exports = { zipToBuffer };