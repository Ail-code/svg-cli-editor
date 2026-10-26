import { test } from "node:test";
import assert from "node:assert/strict";
import { Readable, Writable } from "node:stream";
import { CommandLexer } from "../src/cli/CommandLexer.js";
import { Repl } from "../src/cli/Repl.js";
import { TestHarness } from "./TestHarness.js";

test("lexer preserves hex colors, quoted empty strings, quotes, and literal in", async () => {
  const h = new TestHarness(); const lexer = new CommandLexer();
  assert.deepEqual(lexer.tokenize("  # comment"), []);
  assert.deepEqual(lexer.tokenize('set t text ""').map(token => token.value), ["set", "t", "text", ""]);
  await h.run("init"); await h.run("create rect r 0 0 10 20 #ffffff");
  await h.run(String.raw`create text t 1 2 "hello \"world\" in group"`);
  assert.equal(h.editor.document.require("r").attributes.get("fill"), "#ffffff");
  assert.equal(h.editor.document.require("t").textContent, 'hello "world" in group');
  await h.run('set t text ""'); assert.equal(h.editor.document.require("t").textContent, "");
  assert.deepEqual(await h.commands.execute('set t text "broken'), ["error: unterminated double quote"]);
});

test("help is available before a document; valid document-dependent commands are rejected", async () => {
  const h = new TestHarness(); assert.ok((await h.run("help")).includes("undo"));
  for (const line of ["tree", "show r", "create g g", "delete r", "move r 0 1", "scale r 2", "set r fill red", "group g r", "ungroup g", "addto g r", "front r", "back r", "save a.svg", "canvas", "undo", "redo"]) {
    assert.deepEqual(await h.commands.execute(line), ["error: no document. use 'init' or 'read' first"], line);
  }
});

test("individually optional dimensions use default or existing height", async () => {
  const h = new TestHarness(); await h.run("init 320");
  assert.equal(h.editor.document.width, 320); assert.equal(h.editor.document.height, 600);
  await h.run("canvas 640 480"); await h.run("canvas 1280");
  assert.equal(h.editor.document.width, 1280); assert.equal(h.editor.document.height, 480);
});

test("create supports all types and in; omitted paint remains omitted", async () => {
  const h = new TestHarness(); await h.run("init 400 300"); await h.run("create g scene");
  for (const line of ["create rect r 1 2 3 4 in scene", "create circle c 5 6 7 in scene", "create ellipse e 8 9 10 11 in scene", "create line l 1 2 3 4 in scene", 'create text t 12 13 "in" in scene']) await h.run(line);
  assert.equal(h.editor.document.size, 6);
  assert.deepEqual(h.editor.document.container("scene").children.map(shape => shape.id), ["r", "c", "e", "l", "t"]);
  for (const shape of h.editor.document.walk()) { assert.equal(shape.attributes.has("fill"), false); assert.equal(shape.attributes.has("stroke"), false); }
  assert.equal(h.editor.document.require("t").textContent, "in");
  await h.run("create g Scene"); assert.ok(h.editor.document.require("Scene"));
});

test("required errors are exact and leave the document unchanged", async () => {
  const h = new TestHarness(); await h.run("init"); await h.run("create g scene");
  await h.run("create g g1 in scene"); await h.run("create rect r1 0 0 10 20 in g1");
  const cases = new Map([
    ["create circle r1 1 2 3", "id already exists: r1"], ["move r9 0 1", "no such shape: r9"],
    ["create g new in node9", "no such container: node9"], ["create g new in r1", "not a container: r1"],
    ["create hexagon h", "unknown shape type: hexagon (is the plugin loaded?)"],
    ["create box n 1 2 3 4 title", "unknown shape type: box (is the plugin loaded?)"],
    ["group bad r1 g1", "cannot group a container into its own descendant: g1"],
    ["ungroup scene", "cannot ungroup top-level container: scene"], ["scale r1 0", "scale factor must be positive"],
    ["scale r1 -2", "scale factor must be positive"], ["set r1 label bad", "unknown attribute: label"],
    ["set r1 id renamed", "unknown attribute: id"],
  ]);
  const before = h.snapshot();
  for (const [line, error] of cases) { assert.deepEqual(await h.commands.execute(line), [`error: ${error}`], line); assert.equal(h.snapshot(), before); }
});

test("nested group, ungroup, addto and sibling z-order restore on undo", async () => {
  const h = new TestHarness();
  for (const line of ["init", "create g scene", "create rect a 0 0 1 1 in scene", "create circle b 0 0 1 in scene", "create text c 0 0 end in scene", "group node b a"]) await h.run(line);
  assert.deepEqual(h.editor.document.container("scene").children.map(shape => shape.id), ["node", "c"]);
  assert.deepEqual(h.editor.document.container("node").children.map(shape => shape.id), ["a", "b"]);
  let before = h.snapshot(); await h.run("ungroup node");
  assert.deepEqual(h.editor.document.container("scene").children.map(shape => shape.id), ["a", "b", "c"]);
  await h.run("undo"); assert.equal(h.snapshot(), before);
  before = h.snapshot(); await h.run("addto node c"); assert.equal(h.editor.document.container("scene").children.length, 1);
  await h.run("undo"); assert.equal(h.snapshot(), before);
  await h.run("front node"); assert.deepEqual(h.editor.document.container("scene").children.map(shape => shape.id), ["c", "node"]);
  await h.run("back node"); assert.equal(h.snapshot(), before);
  await h.run("undo"); assert.equal(h.editor.document.container("scene").children[1]!.id, "node");
});

test("ungroup preserves inherited paint, explicit overrides, sibling order and history", async () => {
  for (const keyword of ["inherit", "unset", "INHERIT", " UnSeT "]) {
    const h = new TestHarness();
    for (const line of [
      "init", "create g scene", "set scene fill blue", "set scene stroke yellow",
      "create rect before 0 0 1 1 in scene", "create g node in scene",
      "set node fill red", "set node stroke black", "set node stroke-width 3",
      `create rect inherited 0 0 10 10 "${keyword}" in node`, `set inherited stroke "${keyword}"`,
      "create rect explicit 0 0 10 10 green in node", "set explicit stroke none", "set explicit stroke-width 5",
      "create g nested in node", `set nested fill "${keyword}"`, `set nested stroke "${keyword}"`,
      "create rect leaf 0 0 10 10 in nested", "create rect reset 0 0 10 10 initial in node",
      "create rect after 0 0 1 1 in scene",
    ]) await h.run(line);
    const before = h.snapshot(); await h.run("ungroup node");
    assert.deepEqual(h.editor.document.container("scene").children.map(shape => shape.id), ["before", "inherited", "explicit", "nested", "reset", "after"]);
    for (const id of ["inherited", "nested"]) {
      const shape = h.editor.document.require(id);
      assert.equal(shape.attributes.get("fill"), "red", keyword);
      assert.equal(shape.attributes.get("stroke"), "black", keyword);
      assert.equal(shape.attributes.get("stroke-width"), "3");
    }
    const explicit = h.editor.document.require("explicit");
    assert.equal(explicit.attributes.get("fill"), "green");
    assert.equal(explicit.attributes.get("stroke"), "none");
    assert.equal(explicit.attributes.get("stroke-width"), "5");
    assert.equal(h.editor.document.require("reset").attributes.get("fill"), "initial");
    assert.equal(h.editor.document.require("leaf").attributes.has("fill"), false);
    const after = h.snapshot();
    assert.equal(h.codec.encode(h.codec.decode(after).document), after);
    await h.run("undo"); assert.equal(h.snapshot(), before);
    await h.run("redo"); assert.equal(h.snapshot(), after);
  }
});

test("queries do not consume undo; a new edit after undo clears redo", async () => {
  const h = new TestHarness(); await h.run("init"); await h.run("create rect r 10 20 30 40"); await h.run("move r 5 6");
  for (const line of ["tree", "tree r", "show r", "canvas", "help", "# ignored", ""]) await h.run(line);
  await h.run("undo"); assert.equal(h.editor.document.require("r").number("x"), 10);
  await h.run("set r fill blue"); assert.deepEqual(await h.commands.execute("redo"), ["error: nothing to redo"]);
});

test("successful IO barriers and failed init/read/save/resize preserve history correctly", async () => {
  const h = new TestHarness(); await h.run("init"); await h.run("create rect r 10 20 30 40");
  await h.run("save first.svg");
  for (const line of ["undo", "redo"]) assert.deepEqual(await h.commands.execute(line), ["error: undo not allowed after io command"]);
  await h.run("move r 1 2"); const before = h.snapshot();
  h.files.put("bad.svg", '<svg><rect id="dup"/><circle id="dup"/></svg>'); h.files.denyWrites();
  for (const line of ["init 0 100", "canvas 100 0", "read missing.svg", "read bad.svg", "save second.svg"]) {
    assert.match((await h.commands.execute(line))[0]!, /^error:/); assert.equal(h.snapshot(), before);
  }
  await h.run("undo"); assert.equal(h.editor.document.require("r").number("x"), 10);
  h.files.allowWrites(); await h.run("save"); assert.equal(await h.files.read("first.svg"), h.snapshot());
  await assert.rejects(h.files.read("second.svg"), /cannot read file/);
  await h.run("move r 2 0"); await h.run("canvas 640 480");
  assert.deepEqual(await h.commands.execute("undo"), ["error: undo not allowed after io command"]);
  await h.run("move r 1 0"); await h.run("undo"); assert.equal(h.editor.document.width, 640);
});

test("read emits warnings and save defaults to the loaded path", async () => {
  const h = new TestHarness(); h.files.put("other.svg", '<svg width="400" height="300"><rect width="10" height="20"/></svg>');
  assert.deepEqual(await h.run("read other.svg"), ["warning: assigned id rect1 to unnamed <rect>", "read other.svg (1 elements)"]);
  await h.run("move rect1 1 2"); await h.run("save");
  assert.match(await h.files.read("other.svg"), /x="1" y="2"/);
});

test("tree and show include geometry, hierarchy and text", async () => {
  const h = new TestHarness();
  for (const line of ["init", "create g markers", "create circle c1 100 100 20 red in markers", 'create text t1 20 40 "My Diagram"']) await h.run(line);
  assert.deepEqual(await h.run("tree"), ["svg (800x600)", "├── g#markers", "│   └── circle#c1  cx=100 cy=100 r=20  fill=red", '└── text#t1  (20,40) "My Diagram"']);
  assert.deepEqual(await h.run("tree c1"), ["circle#c1  cx=100 cy=100 r=20  fill=red"]);
  assert.deepEqual(await h.run("show c1"), ["circle#c1  parent=g#markers", "  cx=100", "  cy=100", "  r=20", "  fill=red"]);
});

test("a mixed edit sequence undoes and redoes every complete document state", async () => {
  const h = new TestHarness(); await h.run("init");
  const states = [h.snapshot()];
  const edits = ["create g scene", "create rect a 0.1 0.2 10 20 in scene", "create circle b 5 6 7 in scene", 'create text t 8 9 "开始" in scene',
    "group node b a", "move node 0.2 0.3", "scale node 1.1", "set node fill blue", "front node", "back node", "addto node t", "ungroup node", "delete b", "set t text done"];
  for (const edit of edits) { await h.run(edit); states.push(h.snapshot()); }
  for (let index = states.length - 2; index >= 0; index--) { await h.run("undo"); assert.equal(h.snapshot(), states[index]); }
  for (let index = 1; index < states.length; index++) { await h.run("redo"); assert.equal(h.snapshot(), states[index]); }
});

test("REPL sequentially consumes piped input and continues after an error", async () => {
  const h = new TestHarness(); let transcript = "";
  const input = Readable.from(['init 200 100\ncreate rect r 0 0 20 10\nmove missing 1 2\nmove r 3 4\ntree\n']);
  const output = new Writable({ write(chunk, _encoding, done) { transcript += chunk.toString(); done(); } });
  await new Repl(h.commands, input, output).run(false);
  assert.match(transcript, /error: no such shape: missing/); assert.match(transcript, /x=3 y=4 w=20 h=10/);
  assert.equal(transcript.includes("svg>"), false);
});
