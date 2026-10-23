import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { TestHarness } from "./TestHarness.js";

test("assignment transcript replays with only its two intentional errors", async () => {
  const h = new TestHarness();
  h.files.put("examples/other.svg", await readFile(new URL("../examples/other.svg", import.meta.url), "utf8"));
  const source = await readFile(new URL("../examples/basic.txt", import.meta.url), "utf8");
  const outputs: string[] = [];
  for (const line of source.split(/\r?\n/)) outputs.push(...await h.commands.execute(line));
  assert.deepEqual(outputs.filter(line => line.startsWith("error:")), [
    "error: cannot group a container into its own descendant: markers", "error: undo not allowed after io command",
  ]);
  assert.ok(outputs.includes("saved to examples/demo.svg (5 elements)"));
  assert.ok(outputs.includes("warning: assigned id rect1 to unnamed <rect>"));
  assert.equal(h.editor.document.size, 7); assert.equal(h.editor.document.width, 400);
  const saved = h.codec.decode(await h.files.read("examples/demo.svg")).document;
  assert.equal(saved.require("title").textContent, "My Diagram");
  assert.equal(saved.require("c1").number("cx"), 130);
  assert.deepEqual(saved.container("markers").children.map(shape => shape.id), ["c1", "box"]);
});

test("assignment flowchart replays, saves eight elements and preserves nested movement", async () => {
  const h = new TestHarness(); const source = await readFile(new URL("../examples/flowchart.txt", import.meta.url), "utf8");
  for (const line of source.split(/\r?\n/)) await h.run(line);
  assert.equal(h.editor.document.size, 8);
  assert.equal(h.editor.document.require("process").number("y"), 100);
  assert.equal(h.editor.document.require("process-label").number("y"), 135);
  assert.equal(h.editor.document.require("process-label").textContent, "处理数据 v2");
  assert.equal(await h.files.read("examples/flowchart.svg"), h.snapshot());
});
