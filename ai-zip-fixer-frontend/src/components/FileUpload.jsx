import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { uploadProjectZip, uploadSingleFile } from '../services/api';
import { DocumentTextIcon, ArchiveBoxIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';

const FileUpload = ({ onFilesUploaded, onError, onProcessing }) => {
  const [file, setFile] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      onError(null);
    }
  }, [onError]);

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'application/zip': ['.zip'],
      'text/*': ['.js', '.jsx', '.ts', '.tsx', '.py', '.html', '.css', '.scss', '.json', '.md', '.txt', '.yml', '.yaml'],
      'application/javascript': ['.js'],
    }
  });

  const getBorderClassName = () => {
    if (isDragAccept) return 'dropzone-accept';
    if (isDragReject) return 'dropzone-reject';
    if (isDragActive) return 'dropzone-active';
    return 'border-gray-600 hover:border-violet-500';
  };

  const handleUpload = async () => {
    if (!file) {
      onError('Please select a file to upload.');
      return;
    }

    onProcessing(true, 'Uploading and preparing your files...');
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
      const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred during upload.';
      onError(errorMessage);
    } finally {
      onProcessing(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} 
      animate={{ opacity: 1, scale: 1 }} 
      className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-lg mx-auto"
    >
      <div
        {...getRootProps()}
        className={`relative block w-full p-8 text-center border-2 border-dashed rounded-lg cursor-pointer transition-all duration-300 ${getBorderClassName()}`}
      >
        <input {...getInputProps()} />
        <div className="flex justify-center items-center text-gray-400">
            <ArchiveBoxIcon className="w-16 h-16" />
        </div>

        <p className="mt-4 text-lg text-gray-300">
          <span className="font-semibold text-violet-400">Click to upload</span> or drag & drop
        </p>
        
        {file ? (
          <p className="mt-2 text-sm text-green-400 font-mono">{file.name} selected</p>
        ) : (
          <p className="mt-2 text-xs text-gray-500">Any code file or a single .ZIP project archive</p>
        )}
      </div>

      <motion.button
        onClick={handleUpload}
        disabled={!file}
        className="mt-6 w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        whileHover={{ scale: file ? 1.05 : 1 }}
        whileTap={{ scale: file ? 0.95 : 1 }}
      >
        <ArrowUpTrayIcon className="w-5 h-5"/>
        Upload & Preview
      </motion.button>
    </motion.div>
  );
};

export default FileUpload;