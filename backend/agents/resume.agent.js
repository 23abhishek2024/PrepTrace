import invokeJSON from "../utils/llmJson.js";
import resumePrompt from "../prompts/resumePrompt.js";
import { resumeAnalysisSchema } from "../schemas/llm.schemas.js";
import { computeATSScore, computeKeywordCoverage } from "../utils/atsScore.js";
import { detectInjection, INJECTION_WARNING, LIMITS, wrapUntrusted } from "../utils/promptGuard.js";

// A job description shorter than this is treated as "not provided".
const MIN_JD_LENGTH = 50;

export const resumeAgent = async ({ resumeText, jobDescription = "" }) => {
  const hasJobDescription = String(jobDescription || "").trim().length >= MIN_JD_LENGTH;
  const injectionFlag =
    detectInjection(resumeText) || (hasJobDescription && detectInjection(jobDescription));

  if (injectionFlag) {
    console.warn("[resume-analysis] instruction-like text detected in resume/JD");
  }

  const user = [
    "Analyze this resume.",
    wrapUntrusted("resume", resumeText, LIMITS.resume),
    hasJobDescription
      ? `Job description to match against:\n${wrapUntrusted(
          "job_description",
          jobDescription,
          LIMITS.jobDescription
        )}`
      : "No job description was provided.",
    injectionFlag ? INJECTION_WARNING : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const analysis = await invokeJSON({
    task: "resume-analysis",
    system: resumePrompt({ hasJobDescription }),
    user,
    schema: resumeAnalysisSchema,
  });

  // Keyword coverage against the JD is computed in code, not by the LLM:
  // required skills (with "A | B" alternatives) and nice-to-have skills separately.
  let jdMatch = null;
  if (hasJobDescription) {
    const required = computeKeywordCoverage(resumeText, analysis.jdRequiredSkills);
    const preferred = computeKeywordCoverage(resumeText, analysis.jdPreferredSkills);
    const hasPreferred = preferred.matched.length + preferred.missing.length > 0;
    jdMatch = {
      ...required,
      preferredMatched: preferred.matched,
      preferredMissing: preferred.missing,
      preferredCoverage: hasPreferred ? preferred.coverage : null,
    };
  }

  const { score, breakdown } = computeATSScore(analysis.rubric, jdMatch);

  // With a JD: missing REQUIRED skills first, then missing nice-to-have, then the rest.
  const missingSkills = jdMatch
    ? [...new Set([...jdMatch.missing, ...jdMatch.preferredMissing, ...analysis.missingSkills])].slice(0, 15)
    : analysis.missingSkills;

  // eslint-disable-next-line no-unused-vars
  const { rubric, jdRequiredSkills, jdPreferredSkills, ...details } = analysis;

  return {
    ...details,
    missingSkills,
    score,
    scoreBreakdown: breakdown,
    jdMatch: jdMatch
      ? {
          matched: jdMatch.matched,
          missing: jdMatch.missing,
          coverage: Math.round(jdMatch.coverage * 100),
          preferredMatched: jdMatch.preferredMatched,
          preferredMissing: jdMatch.preferredMissing,
          preferredCoverage:
            jdMatch.preferredCoverage == null ? null : Math.round(jdMatch.preferredCoverage * 100),
        }
      : null,
    injectionFlag,
  };
};

export default resumeAgent;
