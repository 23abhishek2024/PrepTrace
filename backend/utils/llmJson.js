import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getLLM } from "../config/llm.js";

// ---------------------------------------------------------------------------
// One place for every LLM call that must return JSON:
//   1. send system + user messages
//   2. parse the reply (tolerates ```json fences and extra text)
//   3. validate it with a Zod schema
//   4. if it fails, send the exact errors back and ask for a corrected reply (once)
//   5. if it still fails, throw LLMOutputError (the controller returns a clean 502)
// ---------------------------------------------------------------------------

export class LLMOutputError extends Error {
  constructor(message, { task, issues } = {}) {
    super(message);
    this.name = "LLMOutputError";
    this.task = task;
    this.issues = issues;
  }
}

// Counters used by the eval script (format-validity rate).
export const llmStats = {
  calls: 0, // every model.invoke(), including repair retries
  validFirstTry: 0,
  recoveredByRetry: 0,
  failed: 0,
  totalLatencyMs: 0,
};

export const resetLLMStats = () => {
  for (const key of Object.keys(llmStats)) llmStats[key] = 0;
};

// Plain text of a LangChain message (content can be a string or a list of parts).
const replyText = (response) => {
  const content = response?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    let text = "";
    for (const part of content) {
      if (typeof part === "string") text += part;
      else if (part && typeof part.text === "string") text += part.text;
    }
    return text;
  }
  return "";
};

/**
 * Parse JSON from an LLM reply.
 * Handles: clean JSON, ```json fenced JSON, and JSON with text before/after it.
 */
export const parseJSONLoose = (text) => {
  if (typeof text !== "string" || !text.trim()) {
    throw new SyntaxError("Empty reply");
  }

  let cleaned = text.trim();

  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) cleaned = fence[1].trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    // try the outermost {...} or [...] below
  }

  const start = cleaned.search(/[[{]/);
  const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  if (start !== -1 && end > start) {
    return JSON.parse(cleaned.slice(start, end + 1));
  }

  throw new SyntaxError("No JSON found in the reply");
};

// Zod issues -> short lines the model can act on, e.g. "- score: Too big: expected number to be <=100"
const describeIssues = (issues) => {
  const lines = [];
  for (const issue of issues.slice(0, 8)) {
    const where = issue.path.length ? issue.path.map(String).join(".") : "(root)";
    lines.push(`- ${where}: ${issue.message}`);
  }
  return lines.join("\n");
};

/**
 * Call the LLM and return schema-validated data.
 * @param {object} options
 * @param {string} options.task    name used for logs, stats and model choice
 * @param {string} options.system  rules / instructions (trusted)
 * @param {string} options.user    the request, with user data wrapped as untrusted
 * @param {import("zod").ZodType} options.schema
 * @param {number} [options.maxAttempts=2]  first try + one repair retry
 */
export const invokeJSON = async ({ task, system, user, schema, maxAttempts = 2 }) => {
  const model = getLLM(task);
  const messages = [new SystemMessage(system), new HumanMessage(user)];
  const startedAt = Date.now();
  let issues = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    llmStats.calls++;
    const response = await model.invoke(messages);
    const raw = replyText(response);

    let parsed;
    let parseOk = true;
    try {
      parsed = parseJSONLoose(raw);
    } catch (error) {
      parseOk = false;
      issues = `- The reply was not valid JSON (${error.message}).`;
    }

    if (parseOk) {
      const result = schema.safeParse(parsed);
      if (result.success) {
        const latencyMs = Date.now() - startedAt;
        llmStats.totalLatencyMs += latencyMs;
        if (attempt === 1) llmStats.validFirstTry++;
        else llmStats.recoveredByRetry++;
        console.log(`[llm] ${task}: valid on attempt ${attempt} (${latencyMs} ms)`);
        return result.data;
      }
      issues = describeIssues(result.error.issues);
    }

    console.warn(`[llm] ${task}: invalid output on attempt ${attempt}/${maxAttempts}\n${issues}`);

    // Repair turn: show the model its own reply and the exact problems.
    messages.push(new AIMessage(raw.slice(0, 6000) || "(empty reply)"));
    messages.push(
      new HumanMessage(
        `Your previous reply could not be used:\n${issues}\n\n` +
          "Fix these problems and return ONLY the corrected JSON in the same format. No markdown, no explanation."
      )
    );
  }

  llmStats.failed++;
  llmStats.totalLatencyMs += Date.now() - startedAt;
  throw new LLMOutputError(`The AI returned an invalid response (${task}). Please try again.`, {
    task,
    issues,
  });
};

export default invokeJSON;
