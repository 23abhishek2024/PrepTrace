import llm from "../config/llm.js";
import summaryPrompt from "../prompts/summaryPrompt.js";

export const summaryAgent = async (data) => {
  try {
    const prompt = summaryPrompt(data);
    const response = await llm.invoke(prompt);

    let cleaned = response.content.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```/, "").replace(/```$/, "").trim();
    }

    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Summary Agent Error:", error);
    throw new Error("Failed to generate interview summary: " + error.message);
  }
};
