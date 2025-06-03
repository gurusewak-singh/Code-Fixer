import React from 'react';

const Result = ({ resultData }) => {
  if (!resultData) return null;

  const { success, message, downloadUrl, warnings } = resultData;

  return (
    <div className={`p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-lg mt-8 text-center transform transition-all hover:scale-105 duration-300 ${success ? 'bg-gray-800' : 'bg-red-800/60 border border-red-700'}`}>
      <h3 className={`text-2xl font-semibold mb-4 ${success ? 'text-green-400' : 'text-red-200'}`}>
        {success ? 'Processing Complete!' : 'Processing Issue'}
      </h3>
      <p className={`mb-4 ${success ? 'text-gray-300' : 'text-red-200'}`}>
        {message || (success ? "Your project has been processed." : "An error occurred during processing.")}
      </p>

      {downloadUrl && success && (
        <>
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            download // Suggests a download action to the browser
            className="inline-block bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-bold py-3 px-8 rounded-lg shadow-md transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-teal-400"
          >
            Download Fixed Project
          </a>
          <div className="mt-6 text-sm text-gray-400 bg-gray-700/50 p-4 rounded-md text-left space-y-2">
            <p className="font-semibold text-gray-200">Next Steps:</p>
            <p>
              After downloading and extracting the ZIP file, navigate to your project's root directory in your terminal.
            </p>
            <p>
              Then, run your project's dependency installation command to ensure all libraries are correctly set up. Common commands include:
            </p>
            <ul className="list-disc list-inside pl-4 text-gray-300">
              <li><code>npm install</code> (for Node.js/JavaScript projects)</li>
              <li><code>yarn install</code> (alternative for Node.js/JavaScript)</li>
              <li><code>pip install -r requirements.txt</code> (for Python projects)</li>
              <li><code>bundle install</code> (for Ruby projects)</li>
              <li><code>composer install</code> (for PHP projects)</li>
              <li>Or your project's specific command.</li>
            </ul>
          </div>
        </>
      )}

      {warnings && warnings.length > 0 && (
        <div className="mt-6 text-left">
          <h4 className="font-semibold text-yellow-400 mb-2">Notices:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-yellow-300/80 max-h-40 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700">
            {warnings.map((warn, index) => (
              <li key={index}>
                <strong>{warn.filename || 'General'}:</strong> {warn.detail || warn.warning || warn.error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Result;