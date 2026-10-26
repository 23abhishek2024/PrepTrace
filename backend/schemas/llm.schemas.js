import { z } from "zod";

// ---------------------------------------------------------------------------
// Zod schemas for every LLM output.
// Rule of thumb:
//   - harmless format differences are normalized ("Easy" -> "easy", 20 -> "20")
//   - wrong content is rejected (score 140, 5 questions instead of 6), which
//     triggers one repair retry in invokeJSON with the exact error
// ---------------------------------------------------------------------------

// Turn one list item into a readable string.
// LLMs sometimes return objects where we expect strings; without this the UI
// and prompts show "[object Object]".
export const itemToString = (item) => {
  if (item == null) return "";
  if (typeof item === "string") return item.trim();
  if (typeof item === "number" || typeof item === "boolean") return String(item);
  if (Array.isArray(item)) return item.map(itemToString).filter(Boolean).join(", ");

  if (typeof item === "object") {
    const title = item.title || item.name || item.role || item.degree || item.skill || "";
    const detail =
      item.description || item.summary || item.details || item.company || item.institution || "";
    const parts = [title, detail].map((part) => itemToString(part)).filter(Boolean);
    if (parts.length) return parts.join(" — ");

    return Object.values(item)
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean)
      .join(" — ");
  }
  return "";
};

const capitalize = (value) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

// string; null/undefined -> ""
const text = (max = 2000) =>
  z.preprocess((value) => (value == null ? "" : itemToString(value)), z.string().max(max));

// list of strings; objects converted with itemToString, empty items dropped
const stringList = (maxItems = 30, maxLen = 300) =>
  z.preprocess(
    (value) => (value == null ? [] : value),
    z.array(z.unknown()).transform((items) =>
      items
        .map(itemToString)
        .filter(Boolean)
        .map((s) => (s.length > maxLen ? `${s.slice(0, maxLen - 3)}...` : s))
        .slice(0, maxItems)
    )
  );

// number in [min, max]; out of range is an ERROR (no silent clamping of scores)
const scoreIn = (min, max) => z.coerce.number().min(min).max(max);

// number clamped into [min, max] (used for timers, where clamping is safe)
const clampedInt = (min, max) =>
  z.coerce.number().transform((n) => Math.min(max, Math.max(min, Math.round(n))));

// ---------------------------------------------------------------------------
// Interview questions
// ---------------------------------------------------------------------------

export const questionSchema = z.object({
  question: z.string().trim().min(10).max(1500),
  difficulty: z.string().trim().toLowerCase().pipe(z.enum(["easy", "medium", "hard"])),
  timer: clampedInt(60, 1800),
  // qid of the bank question it was based on (RAG), or null
  refId: z.preprocess(
    (value) => (typeof value === "string" && value.trim() ? value.trim() : null),
    z.string().nullable()
  ),
});

export const questionsSchema = z.preprocess(
  // accept {"questions": [...]} as well as a bare array
  (value) => (value && !Array.isArray(value) && Array.isArray(value.questions) ? value.questions : value),
  z.array(questionSchema).length(6, "Return exactly 6 questions")
);

// ---------------------------------------------------------------------------
// Answer feedback
// ---------------------------------------------------------------------------

const score100 = scoreIn(0, 100).transform(Math.round);

export const feedbackSchema = z.object({
  score: score100,
  correctness: score100,
  clarity: score100,
  relevance: score100,
  detail: score100,
  efficiency: score100,
  communication: score100,
  problemSolving: score100,
  creativity: score100,
  feedback: z.string().trim().min(1).max(600),
  improvements: stringList(5, 120)
    .pipe(z.array(z.string()).min(1, "Give 3 short improvements"))
    .transform((list) => list.slice(0, 3)),
});

// ---------------------------------------------------------------------------
// Interview summary
// ---------------------------------------------------------------------------

export const summarySchema = z.object({
  overallScore: score100,
  summary: z.string().trim().min(1).max(2000),
  strengths: stringList(6, 150),
  weaknesses: stringList(6, 150),
  recommendations: stringList(6, 200),
});

// ---------------------------------------------------------------------------
// ATS resume analysis (the final score is computed in utils/atsScore.js)
// ---------------------------------------------------------------------------

const criterionSchema = z.object({
  score: scoreIn(0, 10).transform((n) => Math.round(n * 10) / 10),
  evidence: text(400),
});

export const resumeAnalysisSchema = z.object({
  name: text(120),
  email: text(200),
  phone: text(40),
  summary: text(1500),
  skills: stringList(60, 80),
  projects: stringList(10, 300),
  education: stringList(10, 300),
  experience: stringList(10, 300),
  strengths: stringList(8, 150),
  weaknesses: stringList(8, 150),
  missingSkills: stringList(15, 60),
  suggestedRole: text(120),
  recommendations: stringList(8, 200),
  rubric: z.object({
    keywords: criterionSchema,
    impact: criterionSchema,
    skills: criterionSchema,
    relevance: criterionSchema,
    structure: criterionSchema,
  }),
  // filled only when a job description was given.
  // Required items may be alternatives: "C# | Java | Python" = any one of them.
  jdRequiredSkills: stringList(25, 100),
  // nice-to-have skills ("a plus", "would also like", "actively exploring")
  jdPreferredSkills: stringList(15, 60),
});

// ---------------------------------------------------------------------------
// Roadmap
// ---------------------------------------------------------------------------

const capitalEnum = (values) => z.string().trim().transform(capitalize).pipe(z.enum(values));

export const roadmapSchema = z.object({
  title: z.string().trim().min(1).max(200),
  targetPackage: z.coerce.string().trim().min(1).max(60),
  duration: z.coerce.string().trim().min(1).max(60),
  level: capitalEnum(["Beginner", "Intermediate", "Advanced"]),
  modules: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(200),
        duration: z.coerce.string().trim().min(1).max(60),
        difficulty: capitalEnum(["Easy", "Medium", "Hard"]),
        description: z.string().trim().min(1).max(1000),
      })
    )
    .min(3)
    .max(20),
});

// ---------------------------------------------------------------------------
// Learning resource links: best effort. Bad items are dropped, never an error.
// Only http(s) links are kept (blocks javascript: and data: URLs).
// ---------------------------------------------------------------------------

const isHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (error) {
    return false;
  }
};

export const resourceDocsSchema = z.preprocess(
  (value) => (Array.isArray(value) ? value : []),
  z.array(z.unknown()).transform((items) => {
    const valid = [];
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const title = typeof item.title === "string" ? item.title.trim() : "";
      const article = typeof item.article === "string" ? item.article.trim() : "";
      if (title && isHttpUrl(article)) valid.push({ title, article });
    }
    return valid;
  })
);
