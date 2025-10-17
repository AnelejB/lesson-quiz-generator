const { GoogleGenAI, Type } = require("@google/genai");

// Initialize the Google AI client with the API key from environment variables
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

exports.handler = async function (event) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { lessonText, uploadedFiles, difficulty } = JSON.parse(event.body);

    if (!lessonText && (!uploadedFiles || uploadedFiles.length === 0)) {
       return {
         statusCode: 400,
         body: JSON.stringify({ error: "Please provide some lesson material." }),
       };
    }

    const quizSchema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            answer: { type: Type.STRING }
          },
          required: ["question", "options", "answer"]
        }
    };

    const difficultyPrompt = difficulty === 'hard'
      ? "Make the questions very challenging, requiring deep analysis, synthesis of information, and critical thinking. Go beyond simple recall."
      : "";
    const prompt = `Generate a multiple-choice quiz with 4-5 questions from the following lesson material. For each question, provide 4 options and clearly indicate the correct answer. Ensure the correct answer is one of the provided options. ${difficultyPrompt}`;

    let contents;
    if (uploadedFiles && uploadedFiles.length > 0) {
        const fileParts = uploadedFiles.map(file => ({
            inlineData: { data: file.data, mimeType: file.mimeType }
        }));
        contents = { parts: [{ text: prompt }, ...fileParts] };
    } else {
        contents = `${prompt}\n\n${lessonText}`;
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: contents,
        config: {
            responseMimeType: 'application/json',
            responseSchema: quizSchema,
        },
    });
    
    // The response.text already contains the JSON string from the model.
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: response.text,
    };

  } catch (error) {
    console.error("Error generating quiz:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "An error occurred while generating the quiz." }),
    };
  }
};