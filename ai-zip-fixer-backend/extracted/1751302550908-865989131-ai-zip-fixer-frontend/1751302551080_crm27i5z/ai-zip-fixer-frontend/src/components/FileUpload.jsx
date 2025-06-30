import React, { useState } from 'react';
import { uploadProjectZip } from '../services/api'; // Corrected import

const FileUpload = ({ onFilesUploaded, onError, onProcessing }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
    onError(null); // Clear previous errors
  };

  const handleFileUpload = async () => {
    if (!file) {
      onError('Please select a .zip file to upload.');
      return;
    }

    setLoading(true);
    onProcessing(true, 'Uploading and extracting...');
    const formData = new FormData();
    formData.append('projectZip', file);

    try {
      const responseData = await uploadProjectZip(formData);
      onFilesUploaded(responseData); // responseData includes { message, extractedPath, files }
    } catch (error) {
      console.error('Error uploading file:', error);
      onError(error.error || error.message || 'Failed to upload and extract files. Check console for details.');
    } finally {
      setLoading(false);
      onProcessing(false);
    }
  };

  return (
    <div className="bg-gray-800 p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-lg transform transition-all hover:scale-105 duration-300">
      <label
        htmlFor="file-upload"
        className="block text-sm font-medium text-gray-300 mb-2"
      >
        Select Project ZIP File
      </label>
      <div className="flex items-center space-x-4">
        <input
          id="file-upload"
          type="file"
          accept=".zip"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-400
                     file:mr-4 file:py-2.5 file:px-5
                     file:rounded-lg file:border-0
                     file:text-sm file:font-semibold
                     file:bg-violet-600 file:text-violet-50
                     hover:file:bg-violet-500
                     cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>
      <button
        onClick={handleFileUpload}
        disabled={loading || !file}
        className="mt-6 w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-pink-500 transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {loading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Uploading...
          </>
        ) : (
          'Upload & Preview Files'
        )}
      </button>
    </div>
  );
};

export default FileUpload;