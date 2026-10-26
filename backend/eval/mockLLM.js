// Fake LLM for `npm run eval -- --mock`: lets you run the whole eval harness
// offline (no API key, no cost). Its scores come from simple heuristics, so
// mock results only prove the harness works; they say nothing about model quality.

const TECH = [
  "javascript", "typescript", "python", "java", "sql", "react", "node", "express", "postgresql",
  "mongodb", "redis", "docker", "kubernetes", "aws", "git", "jest", "rest", "kafka", "ci/cd",
  "system design", "socket.io", "fastapi", "pgvector", "nginx", "mysql",
];

const between = (text, tag) => {
  const match = text.match(new RegExp(`<untrusted_${tag}>([\\s\\S]*?)</untrusted_${tag}>`));
  return match ? match[1] : "";
};
const techIn = (text) => TECH.filter((t) => text.toLowerCase().includes(t));
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const criterion = (score, evidence) => ({ score: clamp(Math.round(score), 0, 10), evidence });

const resumeReply = (user) => {
  const resume = between(user, "resume");
  const jd = between(user, "job_description");
  const numbers = (resume.match(/\d+(\.\d+)?%?/g) || []).length;
  const tech = techIn(resume);
  return {
    name: resume.split(/[|\n]/)[0].trim(),
    email: (resume.match(/\S+@\S+/) || [""])[0],
    phone: "",
    summary: "Mock summary of the candidate.",
    skills: tech,
    projects: [],
    education: [],
    experience: [],
    strengths: ["mock strength"],
    weaknesses: ["mock weakness"],
    missingSkills: [],
    suggestedRole: "Software Engineer",
    recommendations: ["mock recommendation"],
    rubric: {
      keywords: criterion(tech.length / 1.5, "mock"),
      impact: criterion(numbers / 3, "mock"),
      skills: criterion(tech.length / 1.8, "mock"),
      relevance: criterion(2 + tech.length / 2.5, "mock"),
      structure: criterion(resume.length > 600 ? 8 : 4, "mock"),
    },
    jdRequiredSkills: jd ? techIn(jd) : [],
  };
};

const feedbackReply = (user) => {
  const answer = between(user, "answer");
  const words = answer.split(/\s+/).filter(Boolean).length;
  const injected = /ignore|perfect score|give me 100/i.test(answer);
  const score = injected ? 5 : clamp(Math.round(words * 1.1), 5, 92);
  const fields = ["score", "correctness", "clarity", "relevance", "detail", "efficiency", "communication", "problemSolving", "creativity"];
  return {
    ...Object.fromEntries(fields.map((f) => [f, score])),
    feedback: "Mock feedback.",
    improvements: ["Mock improvement one.", "Mock improvement two.", "Mock improvement three."],
  };
};

const questionsReply = (user) => {
  const refIds = [...user.matchAll(/^\[([a-z]+-\d{3})\]/gm)].map((m) => m[1]);
  return ["easy", "easy", "medium", "hard", "medium", "hard"].map((difficulty, i) => ({
    question: `Mock question ${i + 1}?`,
    difficulty,
    timer: 120,
    refId: refIds[i] && i < 4 ? refIds[i] : null,
  }));
};

export const createMockLLM = () => ({
  invoke: async (messages) => {
    const system = String(messages[0]?.content || "");
    const user = String(messages[1]?.content || "");
    let reply;
    if (system.includes("ATS")) reply = resumeReply(user);
    else if (system.includes("Evaluation Criteria")) reply = feedbackReply(user);
    else reply = questionsReply(user);
    return { content: JSON.stringify(reply) };
  },
});

// Bag-of-words hashing "embedder" for mock mode (no model download).
export const mockEmbed = async (texts) =>
  texts.map((text) => {
    const vector = new Array(512).fill(0);
    for (const word of String(text).toLowerCase().match(/[a-z0-9+#]+/g) || []) {
      let h = 0;
      for (const ch of word) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      vector[h % 512] += 1;
    }
    const norm = Math.sqrt(vector.reduce((s, x) => s + x * x, 0)) || 1;
    return vector.map((x) => x / norm);
  });
