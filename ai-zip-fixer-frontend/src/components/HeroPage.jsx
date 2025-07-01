import React from 'react';
import { motion } from 'framer-motion';
import { RocketLaunchIcon } from '@heroicons/react/24/solid';

const HeroPage = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center text-gray-100 p-6 sm:p-10 font-sans text-center">
      <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] "></div>
      
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="max-w-4xl mx-auto"
      >
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold mb-6 tracking-tighter">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 animate-gradient-bg bg-400%">
            AI CodeFixer Pro
          </span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-300 mb-10 leading-relaxed max-w-3xl mx-auto">
          Upload your project, and let our advanced AI analyze, debug, and refactor your codebase. Get cleaner, more efficient, and robust code in minutes.
        </p>
        <motion.button
          onClick={onGetStarted}
          className="inline-flex items-center justify-center px-10 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-lg font-semibold rounded-lg shadow-xl"
          whileHover={{ scale: 1.05, boxShadow: '0 0 25px rgba(219, 39, 119, 0.5)' }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <RocketLaunchIcon className="h-6 w-6 mr-3" />
          Get Started Now
        </motion.button>
      </motion.div>
      <footer className="absolute bottom-6 text-center text-gray-600 text-xs w-full">
        <p>© {new Date().getFullYear()} CodeFixer Inc. Your AI Partner in Development.</p>
      </footer>
    </div>
  );
};

export default HeroPage;