import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SparklesIcon } from '@heroicons/react/24/solid';

import FileUpload from './components/FileUpload';
import FileList from './components/FileList';
import RefinementView from './components/RefinementView';
import HeroPage from './components/HeroPage';
import { fixCodeFiles } from './services/api';

// A dedicated loading overlay component
const LoadingOverlay = ({ message }) => (
    <motion.div
        key="loader"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-50"
    >
        <svg className="animate-spin mx-auto h-12 w-12 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="mt-4 text-lg font-semibold text-gray-200">{message || 'Processing...'}</p>
    </motion.div>
);

// The initial prompt component for the 'analyze' stage
const InitialPromptView = ({ onFix, isLoading }) => {
    const [prompt, setPrompt] = useState('');
    return (
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 p-4 sm:p-6 rounded-xl shadow-2xl w-full h-full flex flex-col justify-between">
            <div>
                <h3 className="text-xl font-semibold mb-4 text-gray-200">Initial Instructions</h3>
                <p className="text-sm text-gray-400 mb-4">
                    Your files are ready. Tell the AI what you'd like to do first. You can be general or specific.
                </p>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., 'Fix all bugs and add comments to the code.' or 'Refactor the App.jsx component to use TypeScript.'"
                    className="w-full h-40 p-3 bg-gray-900 text-gray-200 border border-gray-600 rounded-md focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition font-mono text-sm resize-none"
                />
            </div>
            <button
                onClick={() => onFix(prompt)}
                disabled={isLoading || !prompt}
                className="w-full mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3.5 px-4 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
                <SparklesIcon className="h-6 w-6" />
                Let AI Fix The Code!
            </button>
        </div>
    )
}


const App = () => {
  const [stage, setStage] = useState('hero'); // 'hero', 'upload', 'analyze', 'refine'
  const [projectFiles, setProjectFiles] = useState([]);
  const [fixResult, setFixResult] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const handleGetStarted = () => setStage('upload');

  const handleFilesUploaded = (uploadData) => {
    setError(null);
    setFixResult(null);
    setProjectFiles(uploadData.files || []);
    setStage('analyze');
  };

  const handleProcessingState = (processing, message = '') => {
    setIsLoading(processing);
    setLoadingMessage(message);
  };

  const handleError = (errorMessage) => {
    setError(errorMessage);
    setIsLoading(false);
  };

  const handleFixCode = async (prompt) => {
    if (!projectFiles.length) {
      setError('No files to fix. Please start over.');
      return;
    }
    setError(null);
    handleProcessingState(true, 'AI is analyzing your project...');

    try {
      const result = await fixCodeFiles(projectFiles, prompt);
      if (result.success) {
        setProjectFiles(result.updatedProjectState);
        setFixResult(result);
        setStage('refine');
      } else {
        setError(result.message || "Failed to fix files.");
        setFixResult(null); // Clear previous successful results on error
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'An unexpected error occurred.';
      setError(errorMessage);
      setFixResult(null); // Clear previous successful results on error
    } finally {
      handleProcessingState(false);
    }
  };

  const resetApp = () => {
    setStage('upload');
    setProjectFiles([]);
    setFixResult(null);
    setError(null);
    setIsLoading(false);
  };

  const renderContent = () => {
    switch (stage) {
      case 'hero':
        return <motion.div key="hero"><HeroPage onGetStarted={handleGetStarted} /></motion.div>;
      case 'upload':
        return <motion.div key="upload" className="w-full max-w-lg"><FileUpload onFilesUploaded={handleFilesUploaded} onError={handleError} onProcessing={handleProcessingState} /></motion.div>;
      case 'analyze':
      case 'refine':
        return (
            <motion.div key="main-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-7xl flex flex-col lg:flex-row gap-6">
                <div className="lg:w-1/2 xl:w-7/12">
                    {/* Pass fixResult to FileList */}
                    <FileList files={projectFiles} fixResult={fixResult} />
                </div>
                <div className="lg:w-1/2 xl:w-5/12">
                    {stage === 'analyze' && <InitialPromptView onFix={handleFixCode} isLoading={isLoading}/>}
                    {stage === 'refine' && <RefinementView onRefine={handleFixCode} resultData={fixResult} onReset={resetApp} isLoading={isLoading} error={error} />}
                </div>
            </motion.div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-gray-100 p-4 sm:p-6 lg:p-8 overflow-hidden">
        <AnimatePresence>
            {isLoading && <LoadingOverlay message={loadingMessage} />}
        </AnimatePresence>

        <header className="mb-8 text-center" style={{ display: stage === 'hero' ? 'none' : 'block' }}>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
            AI CodeFixer Pro
            </h1>
        </header>

        <main className="w-full flex-grow flex items-center justify-center">
            <AnimatePresence mode="wait">
                {renderContent()}
            </AnimatePresence>
        </main>
    </div>
  );
};

export default App;