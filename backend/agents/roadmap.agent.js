import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import llm from "../config/llm.js";
import roadmapPrompt from "../prompts/roadmapPrompt.js";

export const roadmapAgent = async ({
  role,
  targetPackage,
  useResume = false,
  resume = null,
}) => {
  try {
    const resumeData =
      useResume && resume
        ? {
            skills: resume.skills,
            missingSkills: resume.missingSkills,
            projects: resume.projects,
            experience: resume.experience,
            score: resume.score,
            suggestedRole: resume.suggestedRole,
            recommendations: resume.recommendations,
          }
        : null;

    const response = await llm.invoke([
      new SystemMessage(roadmapPrompt),
      new HumanMessage(`
Target Role:
${role}

Target Package:
${targetPackage}

Resume:
${JSON.stringify(resumeData, null, 2)}
`),
    ]);

    let cleaned = response.content.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```/, "").replace(/```$/, "").trim();
    }

    const roadmap = JSON.parse(cleaned);

    const capitalize = (value = "") =>
      value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

    roadmap.level = capitalize(roadmap.level || "Intermediate");

    roadmap.modules = (roadmap.modules || []).map((module) => ({
      ...module,
      difficulty: capitalize(module.difficulty || "Medium"),
    }));

    return roadmap;
  } catch (error) {
    console.error("Roadmap Agent Error:", error);
    throw new Error("Failed to generate learning roadmap: " + error.message);
  }
};

export default roadmapAgent;
