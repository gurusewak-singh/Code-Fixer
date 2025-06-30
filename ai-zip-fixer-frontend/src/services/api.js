import axios from 'axios';

export const BACKEND_ROOT_URL = import.meta.env.VITE_BACKEND_ROOT_URL;

if (!BACKEND_ROOT_URL) {
  throw new Error("CRITICAL: VITE_BACKEND_ROOT_URL is not defined in your .env file. Please create it and set it to your backend's URL (e.g., http://localhost:5000).");
}

const API_BASE_URL = `${BACKEND_ROOT_URL}/api`;

/**
 * Uploads a full project ZIP archive.
 */
export const uploadProjectZip = async (formData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    console.error('Error in uploadProjectZip:', error);
    throw new Error(error.response?.data?.message || error.message || 'ZIP file upload failed.');
  }
};

/**
 * [NEW] Uploads a single code file.
 */
export const uploadSingleFile = async (formData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/upload-single`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data; // The backend will return the same structure as the zip upload.
  } catch (error) {
    console.error('Error in uploadSingleFile:', error);
    throw new Error(error.response?.data?.message || error.message || 'Single file upload failed.');
  }
};

// UPDATE THIS FUNCTION
export const fixCodeFiles = async (filesToFix, extractedPath, userPrompt) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/fix`, {
      files: filesToFix,
      extractedPath: extractedPath,
      userPrompt: userPrompt, // <-- SEND THE PROMPT
    });
    return response.data;
  } catch (error) {
    console.error('Error in fixCodeFiles:', error);
    throw new Error(error.response?.data?.message || error.message || 'Failed to fix files.');
  }
};