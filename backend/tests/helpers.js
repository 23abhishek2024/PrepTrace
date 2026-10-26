// Test helpers: a scripted fake LLM and a tiny deterministic embedder.
import { setLLMForTesting } from "../config/llm.js";
import { setEmbedderForTesting } from "../rag/embedder.js";

// Returns the given replies in order; records the messages it received.
export const useFakeLLM = (replies) => {
  const fake = {
    calls: [],
    invoke: async (messages) => {
      fake.calls.push(messages);
      const next = replies[Math.min(fake.calls.length - 1, replies.length - 1)];
      const content = typeof next === "function" ? next(messages) : next;
      return { content: typeof content === "string" ? content : JSON.stringify(content) };
    },
  };
  setLLMForTesting(fake);
  return fake;
};

// Bag-of-words hashing embedder: similar wording -> similar vectors.
export const fakeEmbed = (texts) =>
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

export const useFakeEmbedder = () => setEmbedderForTesting(async (texts) => fakeEmbed(texts));

export const messageText = (messages) => messages.map((m) => m.content).join("\n");

export const sampleRubric = (overrides = {}) => ({
  keywords: { score: 6, evidence: "Lists React, Node.js, MongoDB" },
  impact: { score: 4, evidence: "Few quantified results" },
  skills: { score: 7, evidence: "Skills used across 3 projects" },
  relevance: { score: 6, evidence: "Two full-stack projects" },
  structure: { score: 8, evidence: "Clear sections, contact details present" },
  ...overrides,
});

export const sampleAnalysis = (overrides = {}) => ({
  name: "Test User",
  email: "test@example.com",
  phone: "",
  summary: "Full-stack developer.",
  skills: ["React", "Node.js", "MongoDB"],
  projects: [{ title: "ChatApp", description: "Real-time chat with Socket.IO" }],
  education: ["B.Tech — IIT"],
  experience: [],
  strengths: ["Projects"],
  weaknesses: ["Few metrics"],
  missingSkills: ["Docker"],
  suggestedRole: "Full Stack Developer",
  recommendations: ["Add metrics to project bullets."],
  rubric: sampleRubric(),
  jdRequiredSkills: [],
  ...overrides,
});

export const sixQuestions = (refIds = []) =>
  ["easy", "easy", "medium", "hard", "medium", "hard"].map((difficulty, i) => ({
    question: `Question number ${i + 1} about the role?`,
    difficulty,
    timer: 90,
    refId: refIds[i] ?? null,
  }));
