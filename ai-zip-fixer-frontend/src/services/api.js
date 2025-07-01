import axios from 'axios';

export const BACKEND_ROOT_URL = import.meta.env.VITE_BACKEND_ROOT_URL;

if (!BACKEND_ROOT_URL) {
  throw new Error("CRITICAL: VITE_BACKEND_ROOT_URL is not defined.");
}

const api = axios.create({
  baseURL: `${BACKEND_ROOT_URL}/api`,
  timeout: 180000,
});

const handleError = (error, context) => {
    console.error(`Error in ${context}:`, error);
    const message = error.response?.data?.message || error.message || `An unknown error occurred in ${context}.`;
    throw new Error(message);
}

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

export const fixCodeFiles = async (filesToFix, userPrompt) => {
  try {
    const response = await api.post('/fix', {
      files: filesToFix,
      userPrompt: userPrompt,
    });
    return response.data;
  } catch (error) {
    handleError(error, 'fixCodeFiles');
  }
};

// This is the function with the corrected logic
export const downloadProject = async (projectState) => {
    // Defensive check to prevent the error before it happens.
    if (!projectState || !Array.isArray(projectState) || projectState.length === 0) {
        const error = new Error('No project data available to download.');
        handleError(error, 'downloadProject - pre-flight check');
        return; // Stop execution
    }

    try {
        // THE FIX: The backend route expects an object `{ "projectState": [...] }`.
        // We must wrap the projectState array in an object with that key.
        const response = await api.post('/download', { projectState: projectState }, {
            responseType: 'blob',
        });
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;

        const contentDisposition = response.headers['content-disposition'];
        let filename = 'fixed-project.zip';
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="(.+)"/);
            if (filenameMatch && filenameMatch.length === 2)
                filename = filenameMatch[1];
        }

        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

    } catch (error) {
        handleError(error, 'downloadProject');
    }
}