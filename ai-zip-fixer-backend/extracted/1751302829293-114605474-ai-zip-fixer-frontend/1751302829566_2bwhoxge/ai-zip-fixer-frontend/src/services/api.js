import axios from 'axios';

// This is the single source of truth for your backend's location.
export const BACKEND_ROOT_URL = 'http://localhost:5000';

// The full URL for the API endpoints.
const API_BASE_URL = `${BACKEND_ROOT_URL}/api`;

export const uploadProjectZip = async (formData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error in uploadProjectZip:', error);
    // Provide a clear error message from the backend if available, otherwise a generic one.
    throw new Error(error.response?.data?.message || error.message || 'File upload failed. Please check the server connection and try again.');
  }
};

export const fixCodeFiles = async (filesToFix, extractedPath) => {
  try {
    // FIX: Corrected variable from API_BE_URL to API_BASE_URL
    const response = await axios.post(`${API_BASE_URL}/fix`, {
      files: filesToFix,
      extractedPath: extractedPath,
    });
    return response.data;
  } catch (error) {
    console.error('Error in fixCodeFiles:', error);
    throw new Error(error.response?.data?.message || error.message || 'Failed to fix files. The AI may have encountered an issue.');
  }
};