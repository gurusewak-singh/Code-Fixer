import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { downloadProject } from '../services/api';
import { ArrowDownTrayIcon, PencilSquareIcon, PlusCircleIcon, SparklesIcon, ArrowPathIcon, LightBulbIcon, PaperAirplaneIcon } from '@heroicons/react/24/solid';

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

// FIX: Update props to accept `files` directly
const RefinementView = ({ onRefine, files, resultData, onReset, isLoading, error }) => {
    const [prompt, setPrompt] = useState('');
    const [lastFixSummary, setLastFixSummary] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        if (resultData && resultData.success) {
            setLastFixSummary({
                fileChanges: resultData.fileChanges,
                suggestedChanges: resultData.suggestedChanges
            });
        } else {
            setLastFixSummary(null);
        }
    }, [resultData]);

    const handleRefineClick = () => {
        onRefine(prompt);
        setPrompt('');
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            // FIX: Use the `files` prop directly. It is guaranteed to be an array.
            await downloadProject(files);
        } catch (err) {
            console.error("Download failed:", err);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 p-4 sm:p-6 rounded-xl shadow-2xl w-full h-full flex flex-col">
            <h3 className="text-xl font-semibold mb-4 text-gray-200 flex items-center gap-2">
                <SparklesIcon className="w-6 h-6 text-violet-400" />
                AI Refinement
            </h3>
            
            <div className="bg-gray-900/70 p-4 rounded-lg border border-gray-700 flex-grow flex flex-col gap-4">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Provide new instructions or choose a suggestion..."
                    className="w-full flex-grow p-3 bg-gray-900 text-gray-200 border border-gray-600 rounded-md focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition font-mono text-sm resize-none"
                />
                <button
                    onClick={handleRefineClick}
                    disabled={isLoading || !prompt}
                    className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-bold py-2.5 px-4 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
                >
                    <PaperAirplaneIcon className="w-5 h-5"/>
                    Refine Further
                </button>
            </div>

            {error && !isLoading && (
                <motion.div key="error" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 bg-red-900/50 border border-red-700 text-red-200 px-4 py-2 rounded-lg text-sm shadow-lg" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span>{error}</span>
                </motion.div>
            )}

            {lastFixSummary && !isLoading && (
                 <motion.div initial={{opacity:0}} animate={{opacity:1}} className="mt-4 space-y-4">
                    {lastFixSummary.suggestedChanges && lastFixSummary.suggestedChanges.length > 0 && (
                        <div className="text-left">
                            <h4 className="font-semibold text-gray-300 mb-2 text-md flex items-center gap-2"><LightBulbIcon className="w-5 h-5 text-yellow-300"/>Suggestions</h4>
                            <div className="space-y-2">
                                {lastFixSummary.suggestedChanges.map((suggestion, index) => (
                                    <button key={index} onClick={() => setPrompt(suggestion)} className="w-full text-left text-sm text-cyan-300 hover:text-cyan-200 bg-gray-700/50 hover:bg-gray-700 p-2 rounded-md transition-colors">
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {lastFixSummary.fileChanges && lastFixSummary.fileChanges.length > 0 && (
                        <div className="text-left">
                           <h4 className="font-semibold text-gray-300 mb-2 text-md">Last Operation's Changes</h4>
                            <div className="space-y-2 max-h-32 overflow-y-auto pr-2 bg-gray-900/50 p-2 rounded-md">
                                {lastFixSummary.fileChanges.map((change, index) => (
                                <div key={index} className="bg-gray-800 p-2 rounded-md flex items-start gap-2 text-sm">
                                    {getActionIcon(change.action)}
                                    <div>
                                        <p className="font-mono text-pink-400 break-words">{change.filename}</p>
                                        <p className="mt-1 text-gray-400">{change.explanation}</p>
                                    </div>
                                </div>
                                ))}
                            </div>
                        </div>
                    )}
                     <div className="flex items-center gap-4 pt-2">
                        <button onClick={handleDownload} disabled={isDownloading} className="flex-1 inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors disabled:opacity-50">
                            {isDownloading ? 'Zipping...' : <><ArrowDownTrayIcon className="w-5 h-5" /> Download .ZIP</>}
                        </button>
                        <button onClick={onReset} className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-gray-200 font-semibold py-2 px-4 rounded-lg shadow-md transition-colors">
                            <ArrowPathIcon className="w-5 h-5"/> Start Over
                        </button>
                    </div>
                 </motion.div>
            )}
        </div>
    );
};

export default RefinementView;