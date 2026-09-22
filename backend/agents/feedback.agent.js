import llm from "../config/llm.js";
import feedbackPrompt from "../prompts/feedbackPrompt.js";

export const feedbackAgent = async (data) => {
  try {
    const prompt = feedbackPrompt(data);
    const response = await llm.invoke(prompt);

    let cleaned = response.content.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```/, "").replace(/```$/, "").trim();
    }

    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Feedback Agent Error:", error);
    throw new Error("Failed to generate feedback: " + error.message);
  }
};
