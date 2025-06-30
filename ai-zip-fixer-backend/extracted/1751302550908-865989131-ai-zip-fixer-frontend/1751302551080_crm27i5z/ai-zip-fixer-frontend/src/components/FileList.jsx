import React, { useState } from 'react';
import Preview from './Preview'; // Assuming Preview.jsx is in the same folder

const FileList = ({ files }) => {
  const [selectedFile, setSelectedFile] = useState(null);

  if (!files || files.length === 0) {
    return null; // Don't render if no files
  }

  const handleFileClick = (file) => {
    setSelectedFile(file);
  };

  return (
    <div className="bg-gray-800 p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-lg mt-8 transform transition-all hover:scale-105 duration-300">
      <h3 className="text-2xl font-semibold mb-6 text-center text-gray-100">
        Extracted Code Files ({files.length})
      </h3>
      <p className="text-sm text-gray-400 mb-4 text-center">
        Click on a file name to preview its content.
      </p>
      <ul className="space-y-2 max-h-72 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700">
        {files.map((file, index) => (
          <li
            key={index}
            onClick={() => handleFileClick(file)}
            className={`p-3 rounded-md shadow-sm text-gray-300 text-sm cursor-pointer transition-colors duration-150
                        ${selectedFile && selectedFile.filename === file.filename ? 'bg-violet-600 text-white ring-2 ring-violet-400' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            {file.filename}
          </li>
        ))}
      </ul>
      {selectedFile && (
        <div className="mt-6 p-1 rounded-lg">
          <Preview fileContent={selectedFile} />
        </div>
      )}
    </div>
  );
};

export default FileList;