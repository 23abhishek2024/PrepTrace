import invokeJSON from "../utils/llmJson.js";
import feedbackPrompt from "../prompts/feedbackPrompt.js";
import { feedbackSchema } from "../schemas/llm.schemas.js";
import { detectInjection, INJECTION_WARNING, LIMITS, wrapUntrusted } from "../utils/promptGuard.js";

const SCORE_FIELDS = [
  "score",
  "correctness",
  "clarity",
  "relevance",
  "detail",
  "efficiency",
  "communication",
  "problemSolving",
  "creativity",
];

// An empty answer always scores 0: no LLM call needed.
const emptyAnswerFeedback = () => ({
  ...Object.fromEntries(SCORE_FIELDS.map((field) => [field, 0])),
  feedback: "No answer was given for this question.",
  improvements: [
    "Attempt an answer, even a partial one.",
    "State your approach before the details.",
    "Use the full time available.",
  ],
  injectionFlag: false,
});

export const feedbackAgent = async ({ question, answer, difficulty }) => {
  const answerText = String(answer ?? "").trim();
  if (!answerText) return emptyAnswerFeedback();

  const injectionFlag = detectInjection(answerText);
  if (injectionFlag) {
    console.warn("[answer-feedback] instruction-like text detected in answer");
  }

  const user = [
    `Interview question (difficulty: ${difficulty || "medium"}):\n${question}`,
    `Candidate answer:\n${wrapUntrusted("answer", answerText, LIMITS.answer)}`,
    injectionFlag ? INJECTION_WARNING : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const feedback = await invokeJSON({
    task: "answer-feedback",
    system: feedbackPrompt(),
    user,
    schema: feedbackSchema,
  });

  return { ...feedback, injectionFlag };
};

export default feedbackAgent;
