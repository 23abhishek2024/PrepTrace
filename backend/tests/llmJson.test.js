import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { invokeJSON, LLMOutputError, llmStats, parseJSONLoose, resetLLMStats } from "../utils/llmJson.js";
import { useFakeLLM, messageText } from "./helpers.js";

const schema = z.object({ score: z.number().min(0).max(100) });

test("parseJSONLoose handles fences and surrounding text", () => {
  assert.deepEqual(parseJSONLoose('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(parseJSONLoose('Here you go: {"a":2} hope this helps'), { a: 2 });
  assert.deepEqual(parseJSONLoose("[1,2,3]"), [1, 2, 3]);
  assert.throws(() => parseJSONLoose("no json here"));
});

test("valid first reply is returned without retry", async () => {
  resetLLMStats();
  const fake = useFakeLLM([{ score: 80 }]);
  const data = await invokeJSON({ task: "t", system: "s", user: "u", schema });
  assert.deepEqual(data, { score: 80 });
  assert.equal(fake.calls.length, 1);
  assert.equal(llmStats.validFirstTry, 1);
});

test("invalid reply triggers one repair retry that includes the error", async () => {
  resetLLMStats();
  const fake = useFakeLLM([{ score: 150 }, { score: 90 }]);
  const data = await invokeJSON({ task: "t", system: "s", user: "u", schema });
  assert.deepEqual(data, { score: 90 });
  assert.equal(fake.calls.length, 2);
  const repair = messageText(fake.calls[1]);
  assert.match(repair, /could not be used/);
  assert.match(repair, /score/);
  assert.equal(llmStats.recoveredByRetry, 1);
});

test("broken JSON twice throws LLMOutputError", async () => {
  resetLLMStats();
  useFakeLLM(["not json", "still not json"]);
  await assert.rejects(
    invokeJSON({ task: "t", system: "s", user: "u", schema }),
    (error) => error instanceof LLMOutputError
  );
  assert.equal(llmStats.failed, 1);
});
