import React, { useState, useEffect } from 'react';
import Preview from './Preview';
import { motion } from 'framer-motion';
import { PencilSquareIcon } from '@heroicons/react/24/solid';

const FileList = ({ files, fixResult }) => {
  const [selectedFilename, setSelectedFilename] = useState(null);
  const [changedFiles, setChangedFiles] = useState(new Set());

  // Derive the selected file object from the filename and the master files list
  const selectedFile = files.find(f => f.filename === selectedFilename) || files[0] || null;

  // When the master list of files changes, update the selection
  useEffect(() => {
    if (files && files.length > 0 && !selectedFilename) {
      setSelectedFilename(files[0].filename);
    }
  }, [files, selectedFilename]);

  // When a new fixResult arrives, update the set of changed files
  useEffect(() => {
    if (fixResult && fixResult.fileChanges) {
      const newChangedFiles = new Set(fixResult.fileChanges.map(change => change.filename));
      setChangedFiles(newChangedFiles);
    }
  }, [fixResult]);

  const handleFileClick = (file) => {
    setSelectedFilename(file.filename);
    // Remove the file from the "changed" set when the user reviews it
    if (changedFiles.has(file.filename)) {
        setChangedFiles(prev => {
            const newSet = new Set(prev);
            newSet.delete(file.filename);
            return newSet;
        });
    }
  }

  if (!files || files.length === 0) {
    return null;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 p-4 sm:p-6 rounded-xl shadow-2xl w-full flex flex-col lg:flex-row gap-4 lg:gap-6"
      style={{ minHeight: '600px', maxHeight: '80vh' }}
    >
      {/* File Tree Column */}
      <div className="lg:w-1/3 flex-shrink-0">
        <h3 className="text-xl font-semibold mb-4 text-gray-200">
          Project Files ({files.length})
        </h3>
        <div className="bg-gray-900/70 rounded-lg p-2 h-full max-h-48 lg:max-h-[calc(100%-4rem)] overflow-y-auto">
          <ul className="space-y-1">
            {files.map((file) => {
                const isSelected = selectedFile && selectedFile.filename === file.filename;
                const wasChanged = changedFiles.has(file.filename);
                // Using a composite key forces a re-render when `wasChanged` status changes
                const key = `${file.filename}-${wasChanged}`;

                return (
                    <li
                        key={key}
                        onClick={() => handleFileClick(file)}
                        className={`p-2.5 rounded-md text-sm cursor-pointer transition-all duration-150 font-mono flex items-center justify-between
                        ${isSelected
                            ? 'bg-violet-600 text-white shadow-md'
                            : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
                        }`}
                    >
                        <span className="truncate">{file.filename}</span>
                        {wasChanged && (
                            <motion.div initial={{scale:0}} animate={{scale:1}} className="ml-2 flex-shrink-0">
                                <PencilSquareIcon className="h-4 w-4 text-yellow-300" title="Modified by AI" />
                            </motion.div>
                        )}
                    </li>
                );
            })}
          </ul>
        </div>
      </div>

      {/* Preview Column */}
      <div className="flex-grow min-w-0">
        <Preview file={selectedFile} />
      </div>
    </motion.div>
  );
};

export default FileList;