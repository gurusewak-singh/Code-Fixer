import React, { useState } from 'react';
import { uploadProjectZip, uploadSingleFile } from '../services/api';
// NEW: Import icons
import { DocumentTextIcon, ArchiveBoxIcon, FolderOpenIcon } from '@heroicons/react/24/outline';

const ACCEPTED_FILE_TYPES = [
  '.zip', '.js', '.jsx', '.ts', '.tsx', '.py', '.html', '.css', '.scss', '.json',
  '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.php', '.rb', '.go', '.swift',
  '.kt', '.dart', '.rs', '.sh', '.md', '.txt', '.yml', '.yaml', 'Dockerfile'
].join(',');

const FileUpload = ({ onFilesUploaded, onError, onProcessing, isProcessing }) => {
  const [file, setFile] = useState(null);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      onError(null);
    }
  };

  const handleFileUpload = async () => {
    if (!file) {
      onError('Please select a file to upload.');
      return;
    }

    onProcessing(true, 'Uploading and preparing file...');
    const formData = new FormData();

    try {
      let responseData;
      if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
        formData.append('projectZip', file);
        responseData = await uploadProjectZip(formData);
      } else {
        formData.append('codeFile', file);
        responseData = await uploadSingleFile(formData);
      }
      onFilesUploaded(responseData);
    } catch (error) {
      onError(error.message || 'An unexpected error occurred during upload.');
    } finally {
      onProcessing(false);
    }
  };

  return (
    <div className="bg-gray-800 p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-lg">
      <label
        htmlFor="file-upload"
        className="relative block w-full p-8 text-center border-2 border-gray-600 border-dashed rounded-lg cursor-pointer hover:border-violet-500 transition-colors duration-200"
      >
        <div className="flex justify-center items-center space-x-8 text-gray-400">
          <div className="text-center">
            <DocumentTextIcon className="w-12 h-12 mx-auto" />
            <p className="mt-1 text-xs">Single File</p>
          </div>
          <div className="text-center">
            <ArchiveBoxIcon className="w-12 h-12 mx-auto" />
            <p className="mt-1 text-xs">ZIP Archive</p>
          </div>
          <div className="text-center">
            <FolderOpenIcon className="w-12 h-12 mx-auto" />
            <p className="mt-1 text-xs">Any Project</p>
          </div>
        </div>

        <p className="mt-4 text-sm text-gray-300">
          <span className="font-semibold text-violet-400">Click to upload</span> or drag and drop
        </p>
        
        {file ? (
          <p className="mt-2 text-xs text-green-400">{file.name} selected</p>
        ) : (
          <p className="mt-2 text-xs text-gray-500">Any code file or a single .ZIP archive</p>
        )}

        <input
          id="file-upload"
          name="file-upload"
          type="file"
          className="sr-only"
          onChange={handleFileChange}
          accept={ACCEPTED_FILE_TYPES}
        />
      </label>

      <button
        onClick={handleFileUpload}
        disabled={!file || isProcessing}
        className="mt-6 w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-wait flex items-center justify-center"
      >
        {isProcessing ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </>
        ) : (
          'Upload & Preview'
        )}
      </button>
    </div>
  );
};

export default FileUpload;