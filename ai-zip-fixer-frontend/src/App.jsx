import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import FileList from './components/FileList';
import Result from './components/Result';
import HeroPage from './components/HeroPage'; // Import HeroPage
import { fixCodeFiles } from './services/api';
import { SparklesIcon } from '@heroicons/react/24/outline';

const App = () => {
  const [showAppContent, setShowAppContent] = useState(false); // Controls Hero vs App
  const [extractedFiles, setExtractedFiles] = useState([]);
  const [extractedPath, setExtractedPath] = useState(null);
  const [fixResult, setFixResult] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const handleGetStarted = () => {
    setShowAppContent(true);
  };

  const handleFilesUploaded = (uploadData) => {
    setError(null);
    setFixResult(null);
    setExtractedFiles(uploadData.files || []);
    setExtractedPath(uploadData.extractedPath || null);
    if (uploadData.message) {
      console.log("Upload successful:", uploadData.message);
    }
  };

  const handleProcessingState = (processing, message = '') => {
    setIsLoading(processing);
    setLoadingMessage(message);
  };

  const handleError = (errorMessage) => {
    setError(errorMessage);
    setExtractedFiles([]);
    setExtractedPath(null);
    setFixResult(null); // Clear previous results on new error
  };

  const handleFixCode = async () => {
    if (!extractedFiles.length || !extractedPath) {
      setError('No files to fix, or extraction path is missing. Please upload a ZIP file first.');
      return;
    }
    setError(null);
    setFixResult(null);
    handleProcessingState(true, 'AI is analyzing and fixing your project...');

    const filesToFix = extractedFiles.map(file => ({
      filename: file.filename,
      content: file.content,
    }));

    try {
      const result = await fixCodeFiles(filesToFix, extractedPath);
      setFixResult(result);
      if (!result.success) {
        setError(result.message || "Failed to fix files. See details or check console.");
      }
    } catch (err) {
      console.error('Error during fix process:', err);
      const errorMessage = err.message || 'An unexpected error occurred while fixing the code.';
      setError(errorMessage);
      setFixResult({ success: false, message: errorMessage });
    } finally {
      handleProcessingState(false);
    }
  };

  const resetApp = () => {
    setFixResult(null);
    setExtractedFiles([]);
    setExtractedPath(null);
    setError(null);
    setIsLoading(false);
    setLoadingMessage('');
    // Optionally, could navigate back to FileUpload step or even HeroPage
    // For now, just resets state for new upload on the same screen.
  };

  if (!showAppContent) {
    return <HeroPage onGetStarted={handleGetStarted} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-gray-100 flex flex-col items-center justify-start p-4 sm:p-8 font-sans">
      <header className="mb-8 sm:mb-12 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 hover:animate-pulse">
          AI CodeFixer Pro
        </h1>
        <p className="mt-3 text-gray-400 text-sm sm:text-base max-w-xl">
          Upload your project's .zip file. Our AI will analyze, fix, and even create necessary files to enhance your codebase.
        </p>
      </header>

      <main className="w-full max-w-lg space-y-8">
        {!isLoading && !fixResult && (
          <FileUpload
            onFilesUploaded={handleFilesUploaded}
            onError={handleError}
            onProcessing={handleProcessingState}
          />
        )}

        {isLoading && (
          <div className="bg-gray-800 p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-lg text-center">
            <svg className="animate-spin mx-auto h-12 w-12 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-lg font-semibold text-gray-200">{loadingMessage || 'Processing...'}</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="bg-red-800/70 border border-red-600 text-red-100 px-4 py-3 rounded-lg relative w-full max-w-lg text-sm shadow-lg" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {!isLoading && extractedFiles.length > 0 && !fixResult && (
          <>
            <FileList files={extractedFiles} />
            <button
              onClick={handleFixCode}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-bold py-3.5 px-4 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-400 transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center text-lg"
            >
              <SparklesIcon className="h-6 w-6 mr-2" />
              Let AI Fix The Code!
            </button>
          </>
        )}

        {!isLoading && fixResult && (
            <Result resultData={fixResult} />
        )}
        {!isLoading && (fixResult || error) && ( // Show "Process Another" if there's a result OR an error after upload
             <button
                onClick={resetApp}
                className="mt-8 w-full max-w-lg bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold py-3 px-4 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-gray-500 transition duration-150 ease-in-out"
            >
                Process Another Project
            </button>
        )}
      </main>
      <footer className="mt-12 text-center text-gray-500 text-xs">
        <p>© {new Date().getFullYear()} CodeFixer Inc. All rights reserved.</p>
        <p>Powered by AI magic and robust engineering.</p>
      </footer>
    </div>
  );
};

export default App;