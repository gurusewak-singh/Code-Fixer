import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const getLanguage = (filename = '') => {
  const extension = filename.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'py':
      return 'python';
    case 'json':
      return 'json';
    case 'css':
      return 'css';
    case 'scss':
      return 'scss';
    case 'html':
      return 'html';
    case 'md':
        return 'markdown'
    default:
      return 'clike'; // A generic default
  }
};

const Preview = ({ file }) => {
  if (!file) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900/50 rounded-lg">
        <p className="text-gray-500">Select a file to preview</p>
      </div>
    );
  }

  const language = getLanguage(file.filename);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={file.filename}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="h-full flex flex-col bg-gray-900 rounded-lg shadow-inner overflow-hidden"
      >
        <div className="flex-shrink-0 bg-gray-800/50 px-4 py-2 border-b border-gray-700">
          <h4 className="text-md font-medium text-gray-300 font-mono truncate" title={file.filename}>
            {file.filename}
          </h4>
        </div>
        <div className="flex-grow overflow-auto">
           <SyntaxHighlighter
            language={language}
            style={vscDarkPlus}
            customStyle={{
                margin: 0,
                padding: '1rem',
                backgroundColor: 'transparent',
                height: '100%',
                fontSize: '0.875rem' // Equivalent to text-sm
            }}
            codeTagProps={{
                style: {
                    fontFamily: '"JetBrains Mono", monospace'
                }
            }}
            showLineNumbers
            >
            {file.content || '(File is empty)'}
            </SyntaxHighlighter>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Preview;