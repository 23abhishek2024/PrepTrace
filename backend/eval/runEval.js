// ---------------------------------------------------------------------------
// PrepTrace LLM evaluation.
//
// Measures how reliable the AI features are, using fixed test cases
// (eval/cases.json):
//   1. Format validity   - % of LLM tasks valid on the first try / after a retry
//   2. Score consistency - same resume analyzed N times: spread of the ATS score
//   3. Ranking sanity    - strong resume > average > weak
//   4. Answer grading    - good answer scores higher than a bad answer
//   5. Injection         - injected resume / answers must not get inflated scores
//   6. RAG grounding     - % of interview questions based on retrieved bank questions
//
// Usage (from the backend folder):
//   npm run eval                 real run with GROQ_API_KEY (and MongoDB for RAG)
//   npm run eval -- --runs 5     more repetitions for the consistency check
//   npm run eval -- --mock       offline dry run with a fake LLM (checks the harness only)
// Results are printed and saved to eval/results/latest.json
// ---------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { resumeAgent } from "../agents/resume.agent.js";
import { feedbackAgent } from "../agents/feedback.agent.js";
import { interviewAgent } from "../agents/interview.agent.js";
import { llmStats, resetLLMStats } from "../utils/llmJson.js";
import { MODEL_NAME, setLLMForTesting } from "../config/llm.js";
import { setEmbedderForTesting } from "../rag/embedder.js";
import { questionEmbeddingText } from "../rag/retrieve.js";
import { createMockLLM, mockEmbed } from "./mockLLM.js";

dotenv.config();

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const MOCK = args.includes("--mock");
const RUNS = Number(args[args.indexOf("--runs") + 1]) || 3;
const DELAY_MS = MOCK ? 0 : Number(args[args.indexOf("--delay") + 1]) || 1500; // stay under API rate limits

const cases = JSON.parse(fs.readFileSync(path.join(here, "cases.json"), "utf8"));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const mean = (xs) => xs.reduce((s, x) => s + x, 0) / (xs.length || 1);
const stdDev = (xs) => Math.sqrt(mean(xs.map((x) => (x - mean(xs)) ** 2)));
const round1 = (x) => Math.round(x * 10) / 10;
const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);

// Run one task; on failure record it instead of stopping the whole eval.
const attempt = async (label, fn, failures) => {
  try {
    const result = await fn();
    await sleep(DELAY_MS);
    return result;
  } catch (error) {
    failures.push({ label, error: error.message });
    console.log(`  ✗ ${label}: ${error.message}`);
    await sleep(DELAY_MS);
    return null;
  }
};

const main = async () => {
  // Mock mode: fake LLM + fake embedder + in-memory question bank.
  let mockLoadBank;
  if (MOCK) {
    setLLMForTesting(createMockLLM());
    setEmbedderForTesting(mockEmbed);
    const bank = JSON.parse(fs.readFileSync(path.join(here, "..", "rag", "questionBank.json"), "utf8"));
    const vectors = await mockEmbed(bank.map(questionEmbeddingText));
    const withVectors = bank.map((q, i) => ({ ...q, embedding: vectors[i] }));
    mockLoadBank = async (type) => withVectors.filter((q) => q.type === type);
  } else if (!process.env.GROQ_API_KEY) {
    console.error("GROQ_API_KEY is not set. Add it to backend/.env, or run with --mock for a dry run.");
    process.exit(1);
  }

  // MongoDB is only needed for the RAG question bank.
  let ragAvailable = false;
  if (process.env.MONGODB_URL && !MOCK) {
    try {
      await mongoose.connect(process.env.MONGODB_URL, { serverSelectionTimeoutMS: 3000 });
      ragAvailable = true;
    } catch (error) {
      console.log(`MongoDB not reachable (${error.message}); RAG grounding will be skipped.`);
    }
  }
  if (!ragAvailable) mongoose.set("bufferCommands", false);

  resetLLMStats();
  const failures = [];
  const report = {
    date: new Date().toISOString(),
    model: MOCK ? "mock" : MODEL_NAME,
    runs: RUNS,
  };

  console.log(`\nPrepTrace eval | model: ${report.model} | runs per resume: ${RUNS}\n`);

  // ---- 1-3. Resume scoring: consistency + ranking -------------------------
  console.log("Resume scoring");
  const resumeScores = {};
  for (const resume of cases.resumes) {
    const scores = [];
    for (let run = 0; run < RUNS; run++) {
      const result = await attempt(`resume ${resume.id} #${run + 1}`, () => resumeAgent({ resumeText: resume.text }), failures);
      if (result) scores.push(result.score);
    }
    resumeScores[resume.id] = {
      label: resume.label,
      scores,
      mean: round1(mean(scores)),
      stdDev: round1(stdDev(scores)),
      range: scores.length ? Math.max(...scores) - Math.min(...scores) : null,
    };
    console.log(`  ${resume.label.padEnd(24)} scores ${JSON.stringify(scores)}  mean ${resumeScores[resume.id].mean}  sd ${resumeScores[resume.id].stdDev}`);
  }
  const order = cases.resumeOrder.map((id) => resumeScores[id]?.mean ?? NaN);
  const rankingCorrect = order.every((value, i) => i === 0 || order[i - 1] > value);
  report.resumeScoring = {
    perResume: resumeScores,
    averageStdDev: round1(mean(Object.values(resumeScores).map((r) => r.stdDev))),
    rankingCorrect,
  };
  console.log(`  ranking strong > average > weak: ${rankingCorrect ? "PASS" : "FAIL"}\n`);

  // ---- JD match ------------------------------------------------------------
  console.log("JD match");
  const jdResume = cases.resumes.find((r) => r.id === cases.jdCase.resumeId);
  const jdResult = await attempt("jd match", () => resumeAgent({ resumeText: jdResume.text, jobDescription: cases.jdCase.jobDescription }), failures);
  report.jdMatch = jdResult ? { score: jdResult.score, ...jdResult.jdMatch } : null;
  if (jdResult) console.log(`  coverage ${jdResult.jdMatch?.coverage}%  matched ${JSON.stringify(jdResult.jdMatch?.matched)}  missing ${JSON.stringify(jdResult.jdMatch?.missing)}\n`);

  // ---- 5a. Resume injection -------------------------------------------------
  console.log("Resume injection");
  const base = cases.resumes.find((r) => r.id === cases.resumeInjection.baseId);
  const injectedScores = [];
  let flaggedCount = 0;
  for (let run = 0; run < RUNS; run++) {
    const result = await attempt(`resume injection #${run + 1}`, () => resumeAgent({ resumeText: base.text + cases.resumeInjection.appendText }), failures);
    if (result) {
      injectedScores.push(result.score);
      if (result.injectionFlag) flaggedCount++;
    }
  }
  const baseMean = resumeScores[base.id]?.mean ?? NaN;
  const injectedMean = round1(mean(injectedScores));
  const resumeInjectionPass = injectedMean - baseMean <= cases.resumeInjection.maxIncrease;
  report.resumeInjection = { baseMean, injectedMean, increase: round1(injectedMean - baseMean), flagged: `${flaggedCount}/${injectedScores.length}`, pass: resumeInjectionPass };
  console.log(`  clean ${baseMean} -> injected ${injectedMean} (allowed +${cases.resumeInjection.maxIncrease}): ${resumeInjectionPass ? "PASS" : "FAIL"}, flagged ${flaggedCount}/${injectedScores.length}\n`);

  // ---- 4. Answer grading -----------------------------------------------------
  console.log("Answer grading (good vs bad)");
  const pairs = [];
  for (const pair of cases.feedbackPairs) {
    const good = await attempt(`good: ${pair.question}`, () => feedbackAgent({ question: pair.question, answer: pair.good, difficulty: pair.difficulty }), failures);
    const bad = await attempt(`bad: ${pair.question}`, () => feedbackAgent({ question: pair.question, answer: pair.bad, difficulty: pair.difficulty }), failures);
    if (good && bad) {
      pairs.push({ question: pair.question, good: good.score, bad: bad.score, correct: good.score > bad.score });
      console.log(`  ${good.score > bad.score ? "✓" : "✗"} good ${String(good.score).padStart(3)} | bad ${String(bad.score).padStart(3)} | ${pair.question.slice(0, 60)}`);
    }
  }
  report.answerGrading = {
    pairs,
    accuracy: pct(pairs.filter((p) => p.correct).length, pairs.length),
    averageGap: round1(mean(pairs.map((p) => p.good - p.bad))),
  };
  console.log(`  ordering accuracy ${report.answerGrading.accuracy}%  average gap ${report.answerGrading.averageGap}\n`);

  // ---- 5b. Answer injection --------------------------------------------------
  console.log("Answer injection");
  const injectionResults = [];
  for (const item of cases.injectionAnswers) {
    const result = await attempt(`injection: ${item.question}`, () => feedbackAgent({ question: item.question, answer: item.answer, difficulty: item.difficulty }), failures);
    if (result) {
      const pass = result.score <= item.maxScore;
      injectionResults.push({ question: item.question, score: result.score, flagged: result.injectionFlag, pass });
      console.log(`  ${pass ? "✓" : "✗"} score ${result.score} (max allowed ${item.maxScore}), flagged ${result.injectionFlag}`);
    }
  }
  report.answerInjection = { results: injectionResults, passRate: pct(injectionResults.filter((r) => r.pass).length, injectionResults.length) };
  console.log("");

  // ---- 6. Interview generation + RAG grounding -------------------------------
  const ragOn = ragAvailable || MOCK;
  console.log(`Interview questions${ragOn ? "" : " (RAG skipped: no MongoDB)"}`);
  let totalQuestions = 0;
  let groundedQuestions = 0;
  for (const item of cases.interviewCases) {
    const result = await attempt(`interview ${item.role}`, () => interviewAgent({ role: item.role, type: item.type, loadBank: mockLoadBank }), failures);
    if (result) {
      const grounded = result.questions.filter((q) => q.refId).length;
      totalQuestions += result.questions.length;
      groundedQuestions += grounded;
      console.log(`  ${item.role} (${item.type}): ${result.questions.length} questions, ${result.references.length} references, ${grounded} grounded`);
    }
  }
  report.interviewGeneration = {
    ragAvailable: ragOn,
    questions: totalQuestions,
    groundedRate: ragOn ? pct(groundedQuestions, totalQuestions) : null,
  };
  console.log("");

  // ---- 1. Format validity (across everything above) ---------------------------
  const tasks = llmStats.validFirstTry + llmStats.recoveredByRetry + llmStats.failed;
  report.formatValidity = {
    llmTasks: tasks,
    llmCalls: llmStats.calls,
    validFirstTryRate: pct(llmStats.validFirstTry, tasks),
    validAfterRetryRate: pct(llmStats.validFirstTry + llmStats.recoveredByRetry, tasks),
    failed: llmStats.failed,
  };
  report.failures = failures;

  console.log("Summary");
  console.log(`  valid JSON first try:      ${report.formatValidity.validFirstTryRate}% of ${tasks} LLM tasks`);
  console.log(`  valid after repair retry:  ${report.formatValidity.validAfterRetryRate}%`);
  console.log(`  ATS score spread (avg sd): ${report.resumeScoring.averageStdDev} points`);
  console.log(`  resume ranking:            ${rankingCorrect ? "PASS" : "FAIL"}`);
  console.log(`  answer grading accuracy:   ${report.answerGrading.accuracy}%`);
  console.log(`  resume injection:          ${resumeInjectionPass ? "PASS" : "FAIL"}`);
  console.log(`  answer injection:          ${report.answerInjection.passRate}% pass`);
  console.log(`  RAG-grounded questions:    ${ragOn ? `${report.interviewGeneration.groundedRate}%` : "skipped"}`);

  const outDir = path.join(here, "results");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, MOCK ? "mock.json" : "latest.json");
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
  console.log(`\nSaved ${path.relative(process.cwd(), outFile)}`);

  if (ragAvailable) await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error("Eval failed:", error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
