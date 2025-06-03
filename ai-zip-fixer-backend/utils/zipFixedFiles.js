const fs = require("fs");
const archiver = require("archiver");

const zipFixedFiles = (files, outputPath) => {
  return new Promise((resolve, reject) => {
    // This 'files' parameter is what we call 'filesToZip' in the route handler.
    // It should be an array of { filename: string, fixedContent: string }

    if (!files || files.length === 0) {
      // This condition means an empty array was passed in.
      console.warn("[zipFixedFiles] Received empty or null 'files' array. An empty zip will likely be created.");
      // To ensure an empty zip is created and the promise resolves,
      // we should still finalize the archive.
      const output = fs.createWriteStream(outputPath);
      const archive = archiver("zip", { zlib: { level: 9 } });
      archive.pipe(output);
      output.on("close", () => {
        console.log(`[zipFixedFiles] Empty archive created (no files provided): ${outputPath}, ${archive.pointer()} total bytes.`);
        resolve();
      });
      archive.on("error", (err) => { // Still need error handling for stream/archive issues
        console.error("[zipFixedFiles] Archiver error during empty zip creation:", err);
        reject(err);
      });
      archive.finalize(); // Finalize even if empty
      return; // Important to return here to not execute the rest of the function
    }

    // If files array is NOT empty, proceed as before
    const output = fs.createWriteStream(outputPath);
    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    let filesAddedToArchiveCount = 0; // Counter

    output.on("close", () => {
      console.log(`[zipFixedFiles] Archive created: ${outputPath}, ${archive.pointer()} total bytes. Files appended: ${filesAddedToArchiveCount}`);
      resolve();
    });

    archive.on("warning", (err) => {
      console.warn("[zipFixedFiles] Archiver warning:", err);
      // ... (your existing warning handling) ...
    });

    archive.on("error", (err) => {
      console.error("[zipFixedFiles] Archiver error:", err);
      reject(err);
    });

    archive.pipe(output);

    console.log(`[zipFixedFiles] Attempting to add ${files.length} files to the archive.`); // Log how many files it received
    files.forEach((file) => {
      if (file && typeof file.fixedContent === 'string' && typeof file.filename === 'string') {
        console.log(`[zipFixedFiles] Appending to archive: ${file.filename}`); // Log each appended file
        archive.append(Buffer.from(file.fixedContent, 'utf-8'), { name: file.filename });
        filesAddedToArchiveCount++;
      } else {
        console.warn("[zipFixedFiles] Skipping invalid file object during zipping:", file ? `{filename: ${file.filename}, fixedContent_type: ${typeof file.fixedContent}}` : 'undefined file');
      }
    });

    if (filesAddedToArchiveCount === 0 && files.length > 0) {
        console.warn("[zipFixedFiles] Received files to zip, but none were valid to append to the archive.");
    }

    archive.finalize();
  });
};

module.exports = { zipFixedFiles };