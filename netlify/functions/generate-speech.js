const { GoogleGenAI, Modality } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { text } = JSON.parse(event.body);

    if (!text || text.trim().length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Please provide some text to synthesize." }),
      };
    }
    
    // The model has a character limit, truncate to be safe
    const truncatedText = text.slice(0, 5000);

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say this lesson content: ${truncatedText}` }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' },
                },
            },
        },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      throw new Error("No audio data received from the API.");
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioContent: base64Audio }),
    };

  } catch (error) {
    console.error("Error generating speech:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "An error occurred while generating speech." }),
    };
  }
};
