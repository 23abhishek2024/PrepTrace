import Question from "../models/question.model.js";
import { itemToString } from "../schemas/llm.schemas.js";
import { EMBEDDING_MODEL, embedText } from "./embedder.js";

// ---------------------------------------------------------------------------
// Retrieval for interview question generation (the "R" in RAG).
//
// 1. Build a query from the target role, interview type and resume skills.
// 2. Embed it with the same model used for the question bank.
// 3. Rank bank questions by cosine similarity (brute force in Node).
// 4. Keep the top k, with at most 2 per topic so the set stays varied.
//
// Why brute force instead of a vector database? The bank has ~170 vectors
// of 384 dimensions: scoring all of them takes well under a millisecond.
// At tens of thousands of vectors this would move to an ANN index
// (MongoDB Atlas Vector Search or pgvector with HNSW).
// ---------------------------------------------------------------------------

const BANK_TTL_MS = 10 * 60 * 1000;
const MAX_PER_TOPIC = 2;
const bankCache = new Map(); // type -> { loadedAt, items }

export const cosineSimilarity = (a, b) => {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

// Text used to embed a bank question (also used by the seed script).
export const questionEmbeddingText = (item) =>
  `Topic: ${item.topic}. Roles: ${(item.roles || []).join(", ")}. Question: ${item.question}`;

export const buildRetrievalQuery = ({ role, type, resume }) => {
  const parts = [`${type === "hr" ? "HR / behavioral" : "Technical"} interview for the role: ${role}.`];
  if (resume) {
    const skills = (resume.skills || []).map(itemToString).slice(0, 12);
    const projects = (resume.projects || []).map(itemToString).slice(0, 3);
    if (skills.length) parts.push(`Candidate skills: ${skills.join(", ")}.`);
    if (projects.length) parts.push(`Candidate projects: ${projects.join("; ")}.`);
  }
  return parts.join(" ");
};

/**
 * Rank items by similarity to the query vector and pick a varied top-k.
 * @returns {{ qid, question, topic, difficulty, similarity }[]}
 */
export const rankQuestions = (queryVector, items, k) => {
  const ranked = items
    .map((item) => ({ ...item, similarity: cosineSimilarity(queryVector, item.embedding) }))
    .sort((a, b) => b.similarity - a.similarity);

  const picked = [];
  const perTopic = new Map();
  for (const item of ranked) {
    const count = perTopic.get(item.topic) || 0;
    if (count >= MAX_PER_TOPIC) continue;
    perTopic.set(item.topic, count + 1);
    picked.push({
      qid: item.qid,
      question: item.question,
      topic: item.topic,
      difficulty: item.difficulty,
      similarity: Number(item.similarity.toFixed(4)),
    });
    if (picked.length === k) break;
  }
  return picked;
};

const loadBankFromMongo = async (type) => {
  const cached = bankCache.get(type);
  if (cached && Date.now() - cached.loadedAt < BANK_TTL_MS) return cached.items;

  const items = await Question.find({ type, embeddingModel: EMBEDDING_MODEL })
    .select("+embedding qid question topic difficulty")
    .lean();
  bankCache.set(type, { loadedAt: Date.now(), items });
  return items;
};

/**
 * Retrieve reference questions for the interview generator.
 * Never throws: if the bank is empty or the embedder fails, it returns []
 * and the interview is generated without references.
 */
export const retrieveQuestions = async ({ role, type, resume = null, k = 8, loadBank = loadBankFromMongo }) => {
  try {
    const items = await loadBank(type);
    if (!items.length) {
      console.warn("[rag] question bank is empty for", type, "- run `npm run seed:questions`");
      return [];
    }
    const queryVector = await embedText(buildRetrievalQuery({ role, type, resume }));
    return rankQuestions(queryVector, items, k);
  } catch (error) {
    console.warn("[rag] retrieval skipped:", error.message);
    return [];
  }
};

export default retrieveQuestions;
