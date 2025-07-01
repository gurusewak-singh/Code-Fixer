import axios from 'axios';

// This will be replaced by Vite during the build process with the value from your .env file
export const BACKEND_ROOT_URL = import.meta.env.VITE_BACKEND_ROOT_URL;

if (!BACKEND_ROOT_URL) {
  // This provides a clear, immediate error during development if the .env file is missing or misconfigured.
  throw new Error("CRITICAL: VITE_BACKEND_ROOT_URL is not defined. Please create a .env file in the frontend root and set it (e.g., VITE_BACKEND_ROOT_URL=http://localhost:5000).");
}

const api = axios.create({
  baseURL: `${BACKEND_ROOT_URL}/api`,
  timeout: 180000, // Set a long timeout (3 minutes) for potentially slow AI processing
});

// A function to handle errors more gracefully
const handleError = (error, context) => {
    console.error(`Error in ${context}:`, error);
    // Prefer the backend's error message if available
    const message = error.response?.data?.message || error.message || `An unknown error occurred in ${context}.`;
    throw new Error(message);
}

/**
 * Uploads a full project ZIP archive.
 */
export const uploadProjectZip = async (formData) => {
  try {
    const response = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    handleError(error, 'uploadProjectZip');
  }
};

/**
 * Uploads a single code file.
 */
export const uploadSingleFile = async (formData) => {
  try {
    const response = await api.post('/upload-single', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    handleError(error, 'uploadSingleFile');
  }
};

/**
 * Sends files to the backend for AI fixing.
 */
export const fixCodeFiles = async (filesToFix, extractedPath, userPrompt) => {
  try {
    const response = await api.post('/fix', {
      files: filesToFix,
      extractedPath: extractedPath,
      userPrompt: userPrompt,
    });
    return response.data;
  } catch (error) {
    handleError(error, 'fixCodeFiles');
  }
};