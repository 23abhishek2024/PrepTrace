import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import llm from "../config/llm.js";

export const resumeAgent = async (resumeText) => {
  const response = await llm.invoke([
    new SystemMessage(`
You are an Expert ATS Resume Analyzer.

Analyze the given resume thoroughly.

Extract and evaluate the following information:
- Full Name
- Email
- Phone Number
- Professional Summary
- Technical Skills
- Projects
- Education
- Experience
- Strengths
- Weaknesses
- Missing Skills
- Suggested Job Role
- ATS Score (0-100)
- Recommendations

IMPORTANT RULES:
1. Return ONLY valid JSON.
2. Do not use markdown backticks or formatting outside the JSON.
3. Do not explain anything.
4. Every field must exist in the output.

Response Format:
{
  "name": "",
  "email": "",
  "phone": "",
  "summary": "",
  "skills": [],
  "projects": [],
  "education": [],
  "experience": [],
  "strengths": [],
  "weaknesses": [],
  "missingSkills": [],
  "suggestedRole": "",
  "score": 0,
  "recommendations": []
}
`),
    new HumanMessage(resumeText),
  ]);

  return response.content;
};
