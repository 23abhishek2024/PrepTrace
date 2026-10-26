import invokeJSON from "../utils/llmJson.js";
import summaryPrompt from "../prompts/summaryPrompt.js";
import { summarySchema } from "../schemas/llm.schemas.js";
import { cleanShortField, wrapUntrusted } from "../utils/promptGuard.js";

export const summaryAgent = async ({ role, type, questions }) => {
  const transcript = (questions || [])
    .map((q, index) =>
      [
        `Q${index + 1} [${q.difficulty}]: ${q.question}`,
        `Answer:\n${wrapUntrusted(`answer_${index + 1}`, q.userAnswer || "(no answer)", 3000)}`,
        `Feedback: score ${q.feedback?.score ?? 0}/100. ${q.feedback?.feedback || ""}`,
      ].join("\n")
    )
    .join("\n\n");

  const user = [
    `Interview type: ${cleanShortField(type, 20)}`,
    `Target role: ${cleanShortField(role, 100)}`,
    `Questions, answers and feedback:\n\n${transcript}`,
  ].join("\n\n");

  return invokeJSON({
    task: "interview-summary",
    system: summaryPrompt(),
    user,
    schema: summarySchema,
  });
};

export default summaryAgent;
