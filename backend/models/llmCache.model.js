import mongoose from "mongoose";

// Cached LLM results. `key` is a sha256 hash of the task, prompt version,
// model name and inputs, so identical requests reuse the stored result.
const llmCacheSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  task: {
    type: String,
    required: true,
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  hits: {
    type: Number,
    default: 0,
  },
  // Groups entries built from the same resume, so deleting a resume
  // also deletes its cached AI results.
  tag: {
    type: String,
    default: null,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    // TTL index: MongoDB deletes the entry automatically after 7 days.
    expires: 60 * 60 * 24 * 7,
  },
});

const LLMCache = mongoose.model("LLMCache", llmCacheSchema);
export default LLMCache;
