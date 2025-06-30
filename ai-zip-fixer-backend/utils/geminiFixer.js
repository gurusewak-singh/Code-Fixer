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

function stripPotentialMarkdownJSON(text) {
  if (typeof text !== 'string') return text;
  const trimmedText = text.trim();
  const codeBlockRegex = /^```(?:json)?\s*([\s\S]*?)\s*```$/;
  const match = trimmedText.match(codeBlockRegex);
  if (match && match[1]) {
    return match[1].trim();
  }
  return trimmedText;
}

async function fixProjectBundle(originalFiles, userPrompt) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      safetySettings,
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    let projectFilesBundle = "";
    originalFiles.forEach(file => {
      projectFilesBundle += `### FILENAME: ${file.filename}\n${file.content}\n### --- END OF ${file.filename} ---\n\n`;
    });

    const userInstructionSection = userPrompt
      ? `
--- USER INSTRUCTIONS ---
The user has provided specific instructions. You MUST prioritize these.
User's Request: "${userPrompt}"
--- END USER INSTRUCTIONS ---
`
      : '';

    // THE CORE FIX IS IN THIS PROMPT
    const prompt = `
You are a JSON generation expert acting as a world-class software engineer. Your ONLY output must be a single, valid JSON array.

${userInstructionSection}

Analyze the provided project files. Your task is to fix all bugs, logical errors, and bad practices.

Your response MUST be a single, valid JSON array of file objects. Each object MUST have this exact structure:
{
  "filename": "path/to/file.ext",
  "content": "...",
  "action": "modified" | "created" | "unchanged" | "deleted",
  "explanation": "A clear summary of changes. This is mandatory."
}

**EXTREMELY CRITICAL RULE FOR THE "content" FIELD:**
The value for the "content" field MUST be a SINGLE LINE JSON STRING. ALL special characters inside the file content MUST be escaped.
- A backslash (\\) must become a double backslash (\\\\).
- A double quote (") must become a backslash-quote (\\").
- A newline must become a backslash-n (\\n).
- A tab must become a backslash-t (\\t).
- Other control characters (carriage return, form feed, etc.) must also be properly escaped.
FAILURE TO DO THIS WILL BREAK THE APPLICATION. DO NOT USE multiline strings.

--- START PROJECT FILES ---
${projectFilesBundle}
--- END PROJECT FILES ---
`;

    console.log(`[geminiFixer] Sending prompt to Gemini for ${originalFiles.length} files. User prompt provided: ${!!userPrompt}`);
    
    // Add a retry mechanism for the `fetch failed` error
    let result;
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
        try {
            result = await model.generateContent(prompt);
            break; // If successful, exit the loop
        } catch (error) {
            if (error.message.includes('fetch failed') && i < maxRetries - 1) {
                console.warn(`[geminiFixer] Fetch failed, retrying... (${i + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retrying
            } else {
                throw error; // If it's not a fetch error or it's the last retry, re-throw
            }
        }
    }
    
    const response = result.response;
    
    if (!response || !response.text) {
        throw new Error("Received an invalid response from the Gemini API.");
    }

    const responseText = response.text();
    const potentialJson = stripPotentialMarkdownJSON(responseText);

    try {
        const fixedFileObjects = JSON.parse(potentialJson);
        if (!Array.isArray(fixedFileObjects)) {
            throw new Error("AI response was valid JSON but not an array.");
        }
        console.log(`[geminiFixer] Successfully parsed AI response. ${fixedFileObjects.length} file operations received.`);
        return fixedFileObjects;
    } catch (parseError) {
        console.error("[geminiFixer] Failed to parse AI JSON response:", parseError.message);
        console.error("[geminiFixer] Raw AI Response that failed parsing:", responseText);
        throw new Error(`AI response was not valid JSON. Check server logs for the raw output.`);
    }
  } catch (error) {
    console.error(`[geminiFixer] Critical error during Gemini processing:`, error);
    throw error;
  }
}

module.exports = fixProjectBundle;