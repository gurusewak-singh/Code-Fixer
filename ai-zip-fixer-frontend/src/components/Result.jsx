import React from 'react';
import { BACKEND_ROOT_URL } from '../services/api'; // Import the base URL for downloads

const Result = ({ resultData }) => {
  if (!resultData) {
    return null;
  }

  const { success, message, downloadUrl, warnings, fileChanges } = resultData;

  // CRITICAL FIX: Construct the full, absolute URL for the download link.
  const fullDownloadUrl = downloadUrl ? `${BACKEND_ROOT_URL}${downloadUrl}` : null;

  const changesWithExplanations = fileChanges?.filter(
    (change) => (change.action === 'modified' || change.action === 'created') && change.explanation
  );

  return (
    <div className={`p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-lg mt-8 text-center ${success ? 'bg-gray-800' : 'bg-red-800/60 border border-red-700'}`}>
      <h3 className={`text-2xl font-semibold mb-4 ${success ? 'text-green-400' : 'text-red-200'}`}>
        {success ? 'Processing Complete' : 'Processing Issue'}
      </h3>
      <p className={`mb-6 ${success ? 'text-gray-300' : 'text-red-200'}`}>
        {message}
      </p>

      {fullDownloadUrl && (
        <div className="mb-6">
          <a
            href={fullDownloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="inline-block bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-bold py-3 px-8 rounded-lg shadow-md transition duration-150 ease-in-out"
          >
            Download Fixed Project
          </a>
        </div>
      )}

      {/* AI Change Summary Section */}
      {changesWithExplanations && changesWithExplanations.length > 0 && (
        <div className="mb-6 text-left bg-gray-900/70 p-4 rounded-lg border border-gray-700">
          <h4 className="font-semibold text-teal-300 mb-3 text-lg">AI Change Summary</h4>
          <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
            {changesWithExplanations.map((change, index) => (
              <div key={index} className="bg-gray-800 p-3 rounded-md">
                <p className="font-mono text-sm text-pink-400 break-words">
                  <span className="font-bold text-gray-400">File: </span>{change.filename}
                </p>
                <p className="mt-2 text-gray-300 text-sm whitespace-pre-wrap">
                  <span className="font-bold text-gray-400">Change: </span>{change.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Steps Section */}
      <div className="text-sm text-gray-400 bg-gray-700/50 p-4 rounded-md text-left space-y-2">
          <p className="font-semibold text-gray-200">Next Steps:</p>
          <p>After downloading, extract the ZIP file and run your project's dependency installation command (e.g., <code>npm install</code>).</p>
      </div>

      {warnings && warnings.length > 0 && (
        <div className="mt-6 text-left">
          <h4 className="font-semibold text-yellow-400 mb-2">Notices:</h4>
          <ul className="list-disc list-inside text-sm text-yellow-300/80">
            {warnings.map((warn, index) => (
              <li key={index}><strong>{warn.filename || 'General'}:</strong> {warn.detail}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Result;