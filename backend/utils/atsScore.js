// ---------------------------------------------------------------------------
// ATS score = computed in CODE from a rubric, not written directly by the LLM.
//
// The LLM rates 5 criteria from 0-10 and gives one line of evidence for each.
// This file turns that into a weighted 0-100 score, so the score is:
//   - explainable (a breakdown with evidence per criterion)
//   - stable (fixed weights; the model never invents the final number)
// When a job description is given, the "keywords" criterion is not taken from
// the LLM at all: it is the % of JD skills actually found in the resume text,
// checked deterministically below.
//   - required skills count for 80%, nice-to-have skills for 20%
//   - "C# | Java | Python" means the JD accepts ANY ONE of them
// ---------------------------------------------------------------------------

export const RUBRIC = [
  { key: "keywords", label: "Keywords", weight: 0.3 },
  { key: "impact", label: "Impact & metrics", weight: 0.25 },
  { key: "skills", label: "Skills depth", weight: 0.2 },
  { key: "relevance", label: "Experience & projects", weight: 0.15 },
  { key: "structure", label: "Structure & readability", weight: 0.1 },
];

// Below this many JD skills, coverage is too noisy: use the LLM keyword rating instead.
const MIN_JD_SKILLS = 3;

// Keyword score with a JD: required skills matter most, nice-to-have skills add a little.
const REQUIRED_WEIGHT = 0.8;

// Common alternative spellings: skill -> other names that count as the same skill.
const ALIASES = {
  postgresql: ["postgres", "psql"],
  sql: ["postgresql", "mysql", "sqlite", "mssql", "t-sql", "pl/sql"], // a SQL database counts as SQL
  kubernetes: ["k8s"],
  "rest api": ["restful", "rest apis", "restful api", "restful apis"],
  mongodb: ["mongo"],
  "ci/cd": ["cicd", "ci cd", "continuous integration"],
  javascript: ["ecmascript"],
  typescript: ["ts"],
  "machine learning": ["ml"],
  "artificial intelligence": ["ai"],
  aws: ["amazon web services"],
  gcp: ["google cloud"],
  "c++": ["cpp"],
  golang: ["go"],
  go: ["golang"],
  "large language models": ["llm", "llms"],
  "natural language processing": ["nlp"],
  "github actions": ["gh actions"],
};

const normalize = (value) => String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Word-boundary match that also respects symbols used in skill names (c++, c#, .js).
// "java" must not match inside "javascript"; "go" must not match inside "google".
const containsTerm = (text, term) => {
  if (!term) return false;
  const pattern = new RegExp(`(^|[^a-z0-9+#])${escapeRegex(term)}($|[^a-z0-9+#])`);
  return pattern.test(text);
};

// All spellings that should count as this skill.
const skillVariants = (skill) => {
  const base = normalize(skill);
  const variants = new Set([base]);

  // Node.js / NodeJS / Node JS -> node ; React.js -> react
  const withoutJs = base.replace(/(\.|\s)?js$/, "").trim();
  if (withoutJs && withoutJs !== base) variants.add(withoutJs);

  // punctuation and spacing variants: "node.js" -> "node js", "nodejs"
  variants.add(base.replace(/[.\-_]+/g, " ").replace(/\s+/g, " ").trim());
  variants.add(base.replace(/[.\-_\s]+/g, ""));

  // singular / plural of the last word: "rest apis" <-> "rest api"
  for (const v of [...variants]) {
    if (v.length > 3 && v.endsWith("s") && !v.endsWith("ss")) variants.add(v.slice(0, -1));
    else if (v.length > 2) variants.add(`${v}s`);
  }

  // aliases, looked up by any variant
  for (const v of [...variants]) {
    for (const alias of ALIASES[v] || []) variants.add(alias);
  }

  variants.delete("");
  return [...variants];
};

/**
 * Which JD skills appear in the resume? Pure code: same input, same output.
 * @returns {{ matched: string[], missing: string[], coverage: number }}  coverage is 0..1
 */
export const computeKeywordCoverage = (resumeText, skills) => {
  const text = normalize(resumeText);
  const seen = new Set();
  const matched = [];
  const missing = [];

  for (const skill of skills || []) {
    const key = normalize(skill);
    if (!key || seen.has(key)) continue;
    seen.add(key);

    // "C# | Java | Python": the JD accepts any one of these
    const alternatives = String(skill)
      .split("|")
      .map((alt) => alt.trim())
      .filter(Boolean);

    const found = alternatives.find((alt) =>
      skillVariants(alt).some((variant) => containsTerm(text, variant))
    );

    if (found) matched.push(found); // show the alternative the resume actually has
    else missing.push(alternatives.join(" / "));
  }

  const total = matched.length + missing.length;
  return { matched, missing, coverage: total ? matched.length / total : 0 };
};

const clamp10 = (value) => Math.min(10, Math.max(0, Number(value) || 0));
const round1 = (value) => Math.round(value * 10) / 10;

/**
 * Weighted ATS score from the LLM rubric (and JD keyword coverage when available).
 * @param {object} rubric   { keywords: {score, evidence}, impact: {...}, ... }  scores 0-10
 * @param {object|null} jdMatch  { matched, missing, coverage } for REQUIRED skills, optionally
 *                               { preferredMatched, preferredMissing, preferredCoverage } for nice-to-have
 * @returns {{ score: number, breakdown: object[] }}  score is 0-100
 */
export const computeATSScore = (rubric, jdMatch = null) => {
  const jdSkillCount = jdMatch ? jdMatch.matched.length + jdMatch.missing.length : 0;
  const useCoverage = jdSkillCount >= MIN_JD_SKILLS;

  const preferredCount = jdMatch
    ? (jdMatch.preferredMatched?.length || 0) + (jdMatch.preferredMissing?.length || 0)
    : 0;
  const usePreferred = preferredCount > 0 && typeof jdMatch?.preferredCoverage === "number";

  const breakdown = RUBRIC.map(({ key, label, weight }) => {
    if (key === "keywords" && useCoverage) {
      // required skills only, or 80% required + 20% nice-to-have
      const coverage = usePreferred
        ? REQUIRED_WEIGHT * jdMatch.coverage + (1 - REQUIRED_WEIGHT) * jdMatch.preferredCoverage
        : jdMatch.coverage;

      let evidence = `${jdMatch.matched.length} of ${jdSkillCount} required job-description skills found in the resume`;
      if (usePreferred) {
        evidence += `, plus ${jdMatch.preferredMatched.length} of ${preferredCount} nice-to-have skills`;
      }

      return {
        key,
        label,
        weight,
        score: round1(coverage * 10),
        source: "computed",
        evidence: `${evidence}.`,
      };
    }
    return {
      key,
      label,
      weight,
      score: clamp10(rubric?.[key]?.score),
      source: "llm",
      evidence: rubric?.[key]?.evidence || "",
    };
  });

  // weighted average on a 0-10 scale -> 0-100 (epsilon avoids 48.4999... rounding down)
  const total = breakdown.reduce((sum, item) => sum + item.weight * item.score, 0);
  return { score: Math.round(total * 10 + 1e-9), breakdown };
};
