import React from 'react';
import { motion } from 'framer-motion';
import { BACKEND_ROOT_URL } from '../services/api';
import { ArrowDownTrayIcon, CheckCircleIcon, XCircleIcon, PencilSquareIcon, PlusCircleIcon, SparklesIcon, ArrowPathIcon } from '@heroicons/react/24/solid';

const getActionIcon = (action) => {
    switch (action) {
      case 'modified':
        return <PencilSquareIcon className="w-5 h-5 text-yellow-400 flex-shrink-0" />;
      case 'created':
        return <PlusCircleIcon className="w-5 h-5 text-green-400 flex-shrink-0" />;
      default:
        return null;
    }
}

const Result = ({ resultData, onReset }) => {
  if (!resultData) return null;

  const { success, message, downloadUrl, warnings, fileChanges } = resultData;
  const fullDownloadUrl = downloadUrl ? `${BACKEND_ROOT_URL}${downloadUrl}` : null;

  const changesWithExplanations = fileChanges?.filter(
    (change) => (change.action === 'modified' || change.action === 'created') && change.explanation
  );

  return (
    <div className={`p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-2xl mx-auto text-center border ${success ? 'bg-gray-800/50 border-gray-700' : 'bg-red-900/50 border-red-700'}`}>
      <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', delay: 0.2 }}>
        {success ? <CheckCircleIcon className="w-16 h-16 text-green-400 mx-auto" /> : <XCircleIcon className="w-16 h-16 text-red-400 mx-auto" />}
      </motion.div>
      <h3 className={`text-2xl font-semibold mt-4 mb-2 ${success ? 'text-gray-100' : 'text-red-200'}`}>
        {success ? 'Processing Complete' : 'Processing Issue'}
      </h3>
      <p className={`mb-6 ${success ? 'text-gray-400' : 'text-red-300'}`}>
        {message}
      </p>

      {fullDownloadUrl && (
        <motion.a
            href={fullDownloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold py-3 px-8 rounded-lg shadow-md mb-6"
            whileHover={{ scale: 1.05, boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)' }}
            whileTap={{ scale: 0.95 }}
        >
            <ArrowDownTrayIcon className="w-5 h-5" />
            Download Fixed Project
        </motion.a>
      )}

      {changesWithExplanations && changesWithExplanations.length > 0 && (
        <div className="mb-6 text-left bg-gray-900/70 p-4 rounded-lg border border-gray-700">
          <h4 className="font-semibold text-teal-300 mb-3 text-lg flex items-center gap-2"><SparklesIcon className="w-5 h-5" />AI Change Summary</h4>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
            {changesWithExplanations.map((change, index) => (
              <motion.div key={index} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + index * 0.1 }} className="bg-gray-800 p-3 rounded-md flex items-start gap-3">
                {getActionIcon(change.action)}
                <div className='w-full'>
                  <p className="font-mono text-sm text-pink-400 break-words">{change.filename}</p>
                  <p className="mt-1 text-gray-300 text-sm">{change.explanation}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <div className="text-sm text-gray-400 bg-gray-700/50 p-4 rounded-md text-left space-y-2">
          <p className="font-semibold text-gray-200">Next Steps:</p>
          <p>After downloading, extract the ZIP and run <code>npm install</code> (or your project's equivalent) to set up dependencies.</p>
      </div>

      {warnings && warnings.length > 0 && (
        <div className="mt-6 text-left p-4 rounded-lg bg-yellow-900/30 border border-yellow-700">
          <h4 className="font-semibold text-yellow-400 mb-2">Notices:</h4>
          <ul className="list-disc list-inside text-sm text-yellow-300/80">
            {warnings.map((warn, index) => (
              <li key={index}><strong>{warn.filename || 'General'}:</strong> {warn.detail}</li>
            ))}
          </ul>
        </div>
      )}

      <button onClick={onReset} className="mt-8 flex items-center justify-center gap-2 w-full max-w-sm mx-auto bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold py-2.5 px-4 rounded-lg shadow-md transition-colors">
          <ArrowPathIcon className="w-5 h-5"/>
          Process Another Project
      </button>
    </div>
  );
};

export default Result;