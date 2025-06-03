import React from 'react';
import { RocketLaunchIcon } from '@heroicons/react/24/solid'; // Updated icon

const HeroPage = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-gray-100 p-6 sm:p-10 font-sans">
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold mb-6">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
            AI CodeFixer
          </span>
          <span className="text-gray-300"> Pro</span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-300 mb-10 leading-relaxed">
          Elevate your code quality effortlessly. Upload your project as a ZIP file, and let our advanced AI analyze, debug, and refactor your codebase. Get cleaner, more efficient, and robust code in minutes.
        </p>
        <button
          onClick={onGetStarted}
          className="inline-flex items-center justify-center px-10 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-lg font-semibold rounded-lg shadow-xl transform transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-pink-400 focus:ring-opacity-60"
        >
          <RocketLaunchIcon className="h-6 w-6 mr-3" />
          Get Started Now
        </button>
        <p className="mt-12 text-sm text-gray-500">
          Supports a wide array of programming languages & project structures.
        </p>
      </div>
      <footer className="absolute bottom-6 text-center text-gray-600 text-xs w-full">
        <p>© {new Date().getFullYear()} CodeFixer Inc. Your AI Partner in Development.</p>
      </footer>
    </div>
  );
};

export default HeroPage;