import React, { useState } from 'react';

const Preview = ({ fileContent }) => {
  const [showFull, setShowFull] = useState(false);

  if (!fileContent || !fileContent.content) {
    return (
      <div className="mt-4 p-4 bg-gray-700 rounded-lg text-gray-400">
        Select a file to see its preview.
      </div>
    );
  }

  const togglePreview = () => {
    setShowFull(!showFull);
  };

  const displayContent = showFull
    ? fileContent.content
    : fileContent.content.slice(0, 500) + (fileContent.content.length > 500 ? '...' : '');

  return (
    <div className="mt-4 bg-gray-900 p-1 rounded-lg shadow-inner">
      <div className="flex justify-between items-center mb-3 px-4 pt-3">
        <h4 className="text-lg font-medium text-gray-200 truncate" title={fileContent.filename}>
          {fileContent.filename}
        </h4>
        {fileContent.content.length > 500 && (
         <button
            onClick={togglePreview}
            className="text-sm text-violet-400 hover:text-violet-300 hover:underline focus:outline-none"
          >
            {showFull ? 'Show Less' : 'Show More'}
          </button>
        )}
      </div>
      <pre className="bg-black text-gray-300 p-4 rounded-b-md text-xs sm:text-sm overflow-x-auto max-h-80 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
        <code>{displayContent || '(File is empty or content not available)'}</code>
      </pre>
    </div>
  );
};

export default Preview;