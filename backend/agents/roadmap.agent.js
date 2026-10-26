import invokeJSON from "../utils/llmJson.js";
import roadmapPrompt from "../prompts/roadmapPrompt.js";
import { itemToString, roadmapSchema } from "../schemas/llm.schemas.js";
import { cleanShortField, UNTRUSTED_DATA_RULE, wrapUntrusted } from "../utils/promptGuard.js";

const list = (values, max) => (values || []).map(itemToString).filter(Boolean).slice(0, max);

export const roadmapAgent = async ({ role, targetPackage, resume = null }) => {
  const resumeData = resume
    ? {
        skills: list(resume.skills, 30),
        missingSkills: list(resume.missingSkills, 15),
        projects: list(resume.projects, 6),
        experience: list(resume.experience, 5),
        score: resume.score,
        suggestedRole: itemToString(resume.suggestedRole),
        recommendations: list(resume.recommendations, 8),
      }
    : null;

  const user = [
    `Target Role: ${cleanShortField(role, 100)}`,
    `Target Package: ${cleanShortField(targetPackage, 50)}`,
    resumeData
      ? `Resume:\n${wrapUntrusted("resume_profile", JSON.stringify(resumeData, null, 2), 8000)}`
      : "Resume: not provided",
  ].join("\n\n");

  // Level and difficulty capitalization is normalized by the schema.
  return invokeJSON({
    task: "roadmap",
    system: `${roadmapPrompt}\n\n${UNTRUSTED_DATA_RULE}`,
    user,
    schema: roadmapSchema,
  });
};

export default roadmapAgent;
