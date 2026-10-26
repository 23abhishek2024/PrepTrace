import crypto from "crypto";
import LLMCache from "../models/llmCache.model.js";
import { MODEL_NAME } from "../config/llm.js";

// Bump a version when its prompt changes, so old cached results are not reused.
export const PROMPT_VERSIONS = {
  "resume-analysis": "v3", // v3: required vs nice-to-have JD skills, any-of alternatives
  roadmap: "v2",
};

export const cacheStats = { hits: 0, misses: 0, errors: 0 };

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

export const buildCacheKey = (task, inputs) =>
  sha256(JSON.stringify([task, PROMPT_VERSIONS[task] || "v1", MODEL_NAME, inputs]));

// Tag for every cache entry built from one resume, so they can all be deleted
// together when the user deletes their resume.
export const resumeCacheTag = (resumeText) => `resume:${sha256(String(resumeText || ""))}`;

// Default store = MongoDB. Tests can pass an in-memory store with the same methods.
const mongoStore = {
  get: async (key) => {
    const entry = await LLMCache.findOneAndUpdate({ key }, { $inc: { hits: 1 } }, { new: true }).lean();
    return entry ? entry.value : null;
  },
  set: async (key, task, value, tag = null) => {
    await LLMCache.updateOne(
      { key },
      { $setOnInsert: { key, task, value, tag, createdAt: new Date() } },
      { upsert: true }
    );
  },
};

/**
 * Return the cached result for (task, inputs), or run `compute` and cache it.
 * The cache must never break a request: if MongoDB fails, we log and compute.
 *
 * @param {object} [options]
 * @param {string} [options.tag]  groups entries for deletion (e.g. resumeCacheTag(resumeText))
 * @returns {Promise<{ value: any, cached: boolean }>}
 */
export const withCache = async (task, inputs, compute, store = mongoStore, options = {}) => {
  const key = buildCacheKey(task, inputs);

  try {
    const hit = await store.get(key);
    if (hit != null) {
      cacheStats.hits++;
      return { value: hit, cached: true };
    }
  } catch (error) {
    cacheStats.errors++;
    console.warn(`[cache] read failed for ${task}: ${error.message}`);
  }

  cacheStats.misses++;
  const value = await compute();

  try {
    await store.set(key, task, value, options.tag || null);
  } catch (error) {
    cacheStats.errors++;
    console.warn(`[cache] write failed for ${task}: ${error.message}`);
  }

  return { value, cached: false };
};

/**
 * Delete every cached AI result built from this resume:
 *   - entries tagged with the resume (resume analysis with any JD, roadmaps)
 *   - plus the exact analysis keys, for entries cached before tags existed
 * @returns {Promise<number>} number of cache entries removed
 */
export const deleteResumeCache = async (resumeText, jobDescription = "") => {
  const keys = [...new Set(["", jobDescription])].map((jd) =>
    buildCacheKey("resume-analysis", { resumeText, jobDescription: jd })
  );
  const result = await LLMCache.deleteMany({
    $or: [{ tag: resumeCacheTag(resumeText) }, { key: { $in: keys } }],
  });
  return result.deletedCount || 0;
};

export default withCache;
