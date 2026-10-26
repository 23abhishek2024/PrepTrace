// Seed the interview question bank: embeds every question in
// rag/questionBank.json and upserts it into MongoDB.
//
// Usage (from the backend folder):  npm run seed:questions
// Safe to run again: questions are matched by qid and updated in place.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Question from "../models/question.model.js";
import { EMBEDDING_MODEL, embedTexts } from "../rag/embedder.js";
import { questionEmbeddingText } from "../rag/retrieve.js";

dotenv.config();

const BATCH_SIZE = 32;
const here = path.dirname(fileURLToPath(import.meta.url));
const bankPath = path.join(here, "..", "rag", "questionBank.json");

const main = async () => {
  const bank = JSON.parse(fs.readFileSync(bankPath, "utf8"));
  console.log(`Loaded ${bank.length} questions. Embedding with ${EMBEDDING_MODEL}...`);

  await mongoose.connect(process.env.MONGODB_URL);

  const started = Date.now();
  let written = 0;
  for (let i = 0; i < bank.length; i += BATCH_SIZE) {
    const batch = bank.slice(i, i + BATCH_SIZE);
    const vectors = await embedTexts(batch.map(questionEmbeddingText));

    await Question.bulkWrite(
      batch.map((item, j) => ({
        updateOne: {
          filter: { qid: item.qid },
          update: { $set: { ...item, embedding: vectors[j], embeddingModel: EMBEDDING_MODEL } },
          upsert: true,
        },
      }))
    );
    written += batch.length;
    console.log(`  ${written}/${bank.length}`);
  }

  // Remove questions that were deleted from the JSON file.
  const removed = await Question.deleteMany({ qid: { $nin: bank.map((item) => item.qid) } });

  console.log(
    `Done: ${written} questions upserted, ${removed.deletedCount} removed, ` +
      `${((Date.now() - started) / 1000).toFixed(1)}s.`
  );
  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error("Seeding failed:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
