import axios from 'axios';

const API_BASE_URL = 'https://code-fixer-jwe9.onrender.com';

// 'http://localhost:5000/api'; // Ensure this is correct

export const uploadProjectZip = async (formData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Full error object from uploadProjectZip:', error); // For debugging
    if (error.response && error.response.data && error.response.data.error) {
      // If backend sends a JSON error like { error: "message" }
      throw new Error(error.response.data.error);
    } else if (error.message) {
      // Network errors or other generic axios errors
      throw new Error(error.message);
    }
    // Fallback
    throw new Error('Upload failed. Check server status or network connection.');
  }
};

export const fixCodeFiles = async (filesToFix, extractedPath) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/fix`, {
      files: filesToFix,
      extractedPath: extractedPath,
    });
    return response.data; // Backend returns { success, message, downloadUrl?, warnings? }
  } catch (error) {
    console.error('Full error object from fixCodeFiles:', error); // For debugging
    if (error.response && error.response.data) {
      // Let App.jsx handle the structure { success, message, ... } or throw message if not success
      if (!error.response.data.success && error.response.data.message) {
        throw new Error(error.response.data.message);
      }
      return error.response.data; // Propagate the whole data structure
    } else if (error.message) {
      throw new Error(error.message);
    }
    throw new Error('Failed to fix files. Check server status or network connection.');
  }
};