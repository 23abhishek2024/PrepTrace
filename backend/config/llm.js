import { ChatGroq } from "@langchain/groq";
import dotenv from "dotenv";

dotenv.config();

export const MODEL_NAME = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

// Tasks that score or grade something run at temperature 0, so the same input
// gets the same result as often as possible. Generation tasks keep a little
// randomness so interview questions and roadmaps stay varied.
const SCORING_TASKS = new Set(["resume-analysis", "answer-feedback", "interview-summary"]);

const createModel = (temperature) =>
  new ChatGroq({
    model: MODEL_NAME,
    temperature,
    apiKey: process.env.GROQ_API_KEY,
    maxTokens: 4000,
    maxRetries: 2, // network-level retries (rate limits, timeouts)
  });

let creativeModel = null;
let scoringModel = null;
let testModel = null;

// Models are created on first use, so tests and `npm run eval -- --mock`
// work without a Groq API key.
export const getLLM = (task = "") => {
  if (testModel) return testModel;
  if (SCORING_TASKS.has(task)) {
    if (!scoringModel) scoringModel = createModel(0);
    return scoringModel;
  }
  if (!creativeModel) creativeModel = createModel(0.2);
  return creativeModel;
};

// Tests and the mock eval swap in a fake model with the same invoke() method.
export const setLLMForTesting = (model) => {
  testModel = model;
};

export default getLLM;
