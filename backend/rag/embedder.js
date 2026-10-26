import path from "path";
import { fileURLToPath } from "url";
import { env, pipeline } from "@huggingface/transformers";

// ---------------------------------------------------------------------------
// Local text embeddings with transformers.js (runs on the CPU, inside Node).
// Model: all-MiniLM-L6-v2 -> 384-dimensional sentence vectors.
// No API key and no per-request cost. The model (~23 MB, quantized) is
// downloaded once on first use and cached in backend/.model-cache.
// ---------------------------------------------------------------------------

export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "Xenova/all-MiniLM-L6-v2";

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
env.cacheDir = process.env.MODEL_CACHE_DIR || path.join(backendDir, ".model-cache");

let extractorPromise = null;
let testEmbedder = null;

const getExtractor = () => {
  if (!extractorPromise) {
    extractorPromise = pipeline("feature-extraction", EMBEDDING_MODEL, { dtype: "q8" }).catch(
      (error) => {
        extractorPromise = null; // allow a retry on the next call
        throw error;
      }
    );
  }
  return extractorPromise;
};

/**
 * Embed several texts. Vectors are mean-pooled and L2-normalized,
 * so cosine similarity is just a dot product.
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
export const embedTexts = async (texts) => {
  if (testEmbedder) return testEmbedder(texts);
  const extractor = await getExtractor();
  const output = await extractor(texts, { pooling: "mean", normalize: true });
  return output.tolist();
};

export const embedText = async (text) => (await embedTexts([text]))[0];

// Used by tests (no model download needed).
export const setEmbedderForTesting = (fn) => {
  testEmbedder = fn;
};
