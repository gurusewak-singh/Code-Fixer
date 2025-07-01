const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const logger = require("../config/logger");
require("dotenv").config();

if (!process.env.GEMINI_API_KEY) {
  logger.error("FATAL ERROR: GEMINI_API_KEY is not set in .env file. Please set it and restart the server.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
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
      model: "gemini-1.5-flash", // Using flash for speed
      safetySettings,
      generationConfig: {
        responseMimeType: "application/json",
      },
      systemInstruction: `You are a highly precise AI code modification engine. Your only function is to execute a user's command on a given code and return a JSON object. You must not deviate from the user's command.`,
    });

    let projectFilesBundle = "";
    originalFiles.forEach(file => {
      projectFilesBundle += `### FILENAME: ${file.filename}\n${file.content}\n### --- END OF ${file.filename} ---\n\n`;
    });
    
    const prompt = `
--- YOUR DIRECTIVE ---
You have one critical task: analyze the "USER'S COMMAND" and execute it on the provided "PROJECT FILES".

--- OPERATING PROCEDURE ---
1.  **Read the "USER'S COMMAND" carefully.** Understand its intent. Is it a request to fix, rewrite, add, or transform?
2.  **Perform the requested operation** on the relevant file(s) from the "PROJECT FILES" section.
3.  **VERIFY YOUR WORK:** Before generating the final JSON, ask yourself: "Does my new code *directly* accomplish what the user asked for?" For example, if the user asked for an "Armstrong number function" and you wrote a "Fibonacci function," your work is incorrect. You must correct it to match the user's command. This verification step is mandatory.
4.  **Generate a response** in the specified JSON format.

--- USER'S COMMAND ---
${userPrompt || "No specific command provided. Perform a general analysis, fix any obvious bugs or logical errors, and improve code quality."}
--- END USER'S COMMAND ---

--- RESPONSE FORMAT ---
Your output must be a single, valid JSON object with this exact structure:
{
  "file_operations": [
    {
      "filename": "path/to/file.ext",
      "content": "...",
      "action": "modified" | "created",
      "explanation": "A concise, one-sentence summary of what you did, directly reflecting the user's command."
    }
  ],
  "suggested_changes": [
    "A clear, actionable suggestion for a future improvement."
  ]
}

**RULES:**
- **ABSOLUTE PRIORITY:** The "USER'S COMMAND" overrides any other impulse. If the user says "change the file to an Armstrong number function," you do it, regardless of the original file content.
- **EFFICIENCY:** The "file_operations" array MUST ONLY contain files that were 'modified' or 'created'.
- **ESCAPING:** The "content" field MUST be a single-line JSON string with all special characters properly escaped.

--- PROJECT FILES ---
${projectFilesBundle}
--- END PROJECT FILES ---
`;

    logger.info(`[geminiFixer] Sending prompt to Gemini for ${originalFiles.length} files. User prompt: "${userPrompt || 'General Analysis'}"`);
    
    const result = await model.generateContent(prompt);
    
    const response = result.response;
    if (!response || !response.text) {
        throw new Error("Received an invalid or empty response from the Gemini API.");
    }

    const responseText = response.text();
    const potentialJson = stripPotentialMarkdownJSON(responseText);

    try {
        const aiResponse = JSON.parse(potentialJson);
        if (typeof aiResponse !== 'object' || !Array.isArray(aiResponse.file_operations) || !Array.isArray(aiResponse.suggested_changes)) {
            throw new Error("AI response was not a valid object with 'file_operations' and 'suggested_changes' arrays.");
        }
        logger.info(`[geminiFixer] Successfully parsed AI response. ${aiResponse.file_operations.length} file operations received.`);
        return aiResponse;
    } catch (parseError) {
        logger.error("[geminiFixer] Failed to parse AI JSON response.", { errorMessage: parseError.message, rawResponse: responseText });
        throw new Error(`AI returned malformed JSON. Check server logs for the raw output.`);
    }
  } catch (error) {
    logger.error(`[geminiFixer] Critical error during Gemini processing:`, { error: error.stack || error });
    throw error;
  }
}

module.exports = fixProjectBundle;