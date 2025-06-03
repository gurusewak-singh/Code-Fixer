const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
require("dotenv").config();

if (!process.env.GEMINI_API_KEY) {
  console.error("FATAL ERROR: GEMINI_API_KEY is not set in .env file. Please set it and restart the server.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// Helper to attempt stripping markdown if AI unexpectedly wraps JSON
function stripPotentialMarkdownJSON(text) {
  if (typeof text !== 'string') return text;
  const trimmedText = text.trim();
  // Regex to match ```json ... ``` or just ``` ... ```
  const codeBlockRegex = /^```(?:json)?\s*([\s\S]*?)\s*```$/;
  const match = trimmedText.match(codeBlockRegex);
  if (match && match[1]) {
    return match[1].trim();
  }
  return trimmedText; // Return original trimmed text if no block is found
}

async function fixProjectBundle(originalFiles) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      safetySettings,
      generationConfig: {
        responseMimeType: "application/json", // Crucial for JSON output
      }
    });

    let projectFilesBundle = "";
    originalFiles.forEach(file => {
      projectFilesBundle += `### FILENAME: ${file.filename}\n`;
      projectFilesBundle += `${file.content}\n`; // Ensure content is string
      projectFilesBundle += `### --- END OF ${file.filename} ---\n\n`;
    });

//     const prompt = `
// You are an expert software developer. Your task is to analyze the following project.
// The project files are provided below, each delimited by "### FILENAME: ..." and "### --- END OF ... ---".
// Identify and correct any bugs, syntax errors, or violations of common best practices in the code files.
// You can also create new files if they are necessary for the project's improvement or functionality (e.g., a missing configuration file, a new utility module based on refactoring).
// For non-code files like .env or .gitignore, generally return them as is unless a change is directly necessitated by code modifications you are making (e.g., adding a new environment variable used by new code, or a new file to .gitignore).

// Your response MUST be a valid JSON array of file objects. Each object in the array should represent a file that should be included in the final fixed project.
// Each file object must have the following structure:
// {
//   "filename": "path/to/file.ext", // Original path for existing files, or new path for new files. Preserve directory structure.
//   "content": "...", // The full, corrected, or new content of the file as a string.
//   "action": "modified" | "created" | "unchanged" // Indicate if the file was modified, newly created, or is an original file returned unchanged.
// }

// Ensure ALL files that should be in the final output (including those you didn't change, or new ones you created) are present in the JSON array.
// If you create a new file, ensure its "filename" reflects its intended path within the project structure.
// Return ONLY the JSON array. Do not include any other text, explanations, or markdown formatting around the JSON.

// --- START PROJECT FILES ---
// ${projectFilesBundle}
// --- END PROJECT FILES ---
// `;

const prompt = `
You are an expert software developer. Your task is to analyze the following project.
The project files are provided below, each delimited by "### FILENAME: ..." and "### --- END OF ... ---".
Identify and correct any bugs, syntax errors, or violations of common best practices in the code files.
You can also create new files if necessary.
For non-code files like .env or .gitignore, generally return them as is unless a change is directly necessitated by code modifications.

Your response MUST be a valid JSON array of file objects.
Each file object MUST have this exact structure:
{
  "filename": "path/to/file.ext",
  "content": "...", // The file's complete content as a SINGLE JSON STRING LITERAL.
  "action": "modified" | "created" | "unchanged"
}

CRITICAL RULES FOR THE "content" FIELD:
1.  The value for "content" MUST be a single, contiguous JSON string.
2.  ALL special characters within the file's actual content (e.g., double quotes, backslashes, newlines, tabs) MUST be correctly escaped to form a valid JSON string (e.g., use \\" for a double quote within the content, \\\\ for a backslash, \\n for a newline).
3.  DO NOT use any programming language constructs like string concatenation operators (e.g., "+") or template literals *within the string value generated for the "content" field*. The "content" field must be a direct string representation of the file's text.
4.  If the original file content contains comments, these comments must be part of the single string value for "content". Ensure they do not break the overall JSON structure of your response.

Ensure ALL files for the final output are in the JSON array.
Preserve directory structure in "filename".
Return ONLY the JSON array. No other text, explanations, or markdown.

--- START PROJECT FILES ---
${projectFilesBundle}
--- END PROJECT FILES ---
`;

    console.log(`[geminiFixer] Sending prompt to Gemini for project bundle. Total original files: ${originalFiles.length}. Prompt length: ${prompt.length}`);
    // console.debug("[geminiFixer] Prompt (first 500 chars):", prompt.substring(0, 500)); // For debugging

    const result = await model.generateContent(prompt);
    const response = await result.response;

    if (!response || typeof response.text !== 'function') {
      console.error(`[geminiFixer] Gemini API did not return a recognizable response object. Response:`, response);
      throw new Error("Gemini API did not return a valid response structure.");
    }

    let responseText = response.text();
    console.log(`[geminiFixer] Raw response text from AI (first 500 chars): ${responseText.substring(0,500)}...`);

    // responseMimeType: "application/json" should mean responseText is raw JSON.
    // Fallback stripping if necessary, though ideally not needed.
    let potentialJson = stripPotentialMarkdownJSON(responseText);

    try {
      const fixedFileObjects = JSON.parse(potentialJson);

      if (!Array.isArray(fixedFileObjects)) {
        console.error("[geminiFixer] AI response is not a JSON array as expected. Parsed:", fixedFileObjects);
        throw new Error("AI response was not a JSON array.");
      }

      for (const fileObj of fixedFileObjects) {
        if (typeof fileObj.filename !== 'string' || typeof fileObj.content !== 'string' || !['modified', 'created', 'unchanged'].includes(fileObj.action)) {
          console.error("[geminiFixer] AI response contains malformed file object:", fileObj);
          throw new Error("AI response included a malformed file object. Ensure 'filename'(string), 'content'(string), and valid 'action'(string) are present.");
        }
      }
      console.log(`[geminiFixer] Successfully parsed AI response. Number of files in AI output: ${fixedFileObjects.length}`);
      return fixedFileObjects;

    } catch (e) {
      console.error("[geminiFixer] Failed to parse AI JSON response:", e.message);
      console.error("[geminiFixer] AI Raw Response Text that failed parsing:", responseText); // Log full failing text
      throw new Error(`AI response was not valid JSON or had incorrect structure: ${e.message}. Check server logs for raw AI output.`);
    }

  } catch (error) {
    console.error(`[geminiFixer] Error processing project bundle with Gemini:`, error.message);
    if (error.stack) console.error(error.stack);
    // Propagate the error. The route handler will create the final response to the client.
    throw error;
  }
}

module.exports = fixProjectBundle;