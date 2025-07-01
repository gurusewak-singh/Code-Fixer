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
      return 'clike';
  }
};

// ** THE FIX IS HERE **
// This function takes a string that might be a JSON-escaped string
// and returns it as a properly formatted multi-line string.
const formatCodeForDisplay = (code) => {
    if (typeof code !== 'string') return '';
    try {
        // The easiest way to un-escape a JSON string is to parse it.
        // We wrap it in quotes to make it a valid JSON string literal.
        return JSON.parse(`"${code}"`);
    } catch (e) {
        // If it fails to parse (e.g., it's already a normal string),
        // just return the original code.
        return code;
    }
}


const Preview = ({ file }) => {
  if (!file) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900/50 rounded-lg">
        <p className="text-gray-500">Select a file to preview</p>
      </div>
    );
  }

  const language = getLanguage(file.filename);
  // Apply the formatting function to the file content
  const displayContent = formatCodeForDisplay(file.content);

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
                fontSize: '0.875rem'
            }}
            codeTagProps={{
                style: {
                    fontFamily: '"JetBrains Mono", monospace'
                }
            }}
            showLineNumbers
            >
            {displayContent || '(File is empty)'}
            </SyntaxHighlighter>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Preview;