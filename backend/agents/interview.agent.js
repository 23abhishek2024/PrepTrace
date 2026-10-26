import invokeJSON from "../utils/llmJson.js";
import hrInterviewPrompt from "../prompts/hrInterviewPrompt.js";
import technicalInterviewPrompt from "../prompts/technicalInterviewPrompt.js";
import { itemToString, questionsSchema } from "../schemas/llm.schemas.js";
import { cleanShortField, wrapUntrusted } from "../utils/promptGuard.js";
import { retrieveQuestions } from "../rag/retrieve.js";

const list = (values, max) => (values || []).map(itemToString).filter(Boolean).slice(0, max);

// Resume fields the question generator needs, as plain text.
const resumeProfile = (resume) =>
  [
    `Summary: ${itemToString(resume.summary) || "-"}`,
    `Skills: ${list(resume.skills, 25).join(", ") || "-"}`,
    `Projects:\n${list(resume.projects, 6).map((p) => `- ${p}`).join("\n") || "-"}`,
    `Experience:\n${list(resume.experience, 5).map((e) => `- ${e}`).join("\n") || "-"}`,
    `Strengths: ${list(resume.strengths, 6).join(", ") || "-"}`,
    `Weaknesses: ${list(resume.weaknesses, 6).join(", ") || "-"}`,
    `Missing skills: ${list(resume.missingSkills, 10).join(", ") || "-"}`,
  ].join("\n");

/**
 * Generate 6 interview questions.
 * @param {object} data
 * @param {string} data.role
 * @param {"technical"|"hr"} data.type
 * @param {object|null} data.resume  resume document from MongoDB (not from the request body)
 * @param {Function} [data.loadBank]  optional question-bank loader (used by the eval's mock mode)
 * @returns {Promise<{ questions: object[], references: object[] }>}
 */
export const interviewAgent = async ({ role, type, resume = null, loadBank }) => {
  const kind = String(type).toLowerCase() === "hr" ? "hr" : "technical";
  const cleanRole = cleanShortField(role, 100);

  // RAG: fetch the most relevant questions from the question bank.
  const references = await retrieveQuestions({
    role: cleanRole,
    type: kind,
    resume,
    ...(loadBank ? { loadBank } : {}),
  });

  const user = [
    `Target role: ${cleanRole}`,
    `Interview type: ${kind}`,
    `Resume available: ${resume ? "YES" : "NO"}`,
    resume ? wrapUntrusted("resume_profile", resumeProfile(resume), 6000) : "",
    references.length
      ? `REFERENCE QUESTIONS (from the PrepTrace question bank):\n${references
          .map((r) => `[${r.qid}] (${r.topic}, ${r.difficulty}) ${r.question}`)
          .join("\n")}`
      : "No reference questions are available. Write all 6 questions yourself (refId = null).",
  ]
    .filter(Boolean)
    .join("\n\n");

  const questions = await invokeJSON({
    task: "interview-questions",
    system: kind === "hr" ? hrInterviewPrompt() : technicalInterviewPrompt(),
    user,
    schema: questionsSchema,
  });

  // Drop refIds the model invented (only ids we actually sent are valid).
  const validIds = new Set(references.map((r) => r.qid));
  return {
    questions: questions.map((q) => ({ ...q, refId: validIds.has(q.refId) ? q.refId : null })),
    references,
  };
};

export default interviewAgent;
