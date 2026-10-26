import mongoose from "mongoose";

// Interview question bank used for retrieval (RAG).
// Filled by `npm run seed:questions` from rag/questionBank.json.
const questionSchema = new mongoose.Schema(
  {
    qid: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ["technical", "hr"],
      required: true,
      index: true,
    },
    topic: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true,
    },
    roles: {
      type: [String],
      default: [],
    },
    question: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number],
      required: true,
      select: false, // large; only loaded when retrieval needs it
    },
    embeddingModel: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Question = mongoose.model("Question", questionSchema);
export default Question;
