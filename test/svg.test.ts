import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SvgXmlCodec } from "../src/infrastructure/SvgXmlCodec.js";
import { NodeFileStore } from "../src/infrastructure/NodeFileStore.js";
import { ShapeFactory } from "../src/application/ShapeFactory.js";
import { SvgDocument } from "../src/domain/SvgDocument.js";
import { Group } from "../src/domain/shapes/Group.js";

test("all six shapes round-trip, including escaped attributes and Unicode text", () => {
  const factory = new ShapeFactory(); const codec = new SvgXmlCodec(factory); const document = new SvgDocument(400.5, 300);
  const group = new Group("scene");
  group.insert(factory.create("rect", "r", ["1.5", "2", "30", "40", "#eee"]));
  group.insert(factory.create("circle", "c", ["5", "6", "7"]));
  group.insert(factory.create("ellipse", "e", ["8", "9", "10", "11"]));
  group.insert(factory.create("line", "l", ["1", "2", "3", "4", "black"]));
  group.insert(factory.create("text", "t", ["10", "20", '开始 <完成> & "检查"']));
  group.set("fill", 'url("a&b")'); document.add(group);
  const xml = codec.encode(document); const read = codec.decode(xml);
  assert.match(xml, /&lt;完成&gt; &amp;/); assert.match(xml, /&quot;/);
  assert.equal(read.document.require("t").textContent, '开始 <完成> & "检查"');
  assert.equal(codec.encode(read.document), xml); assert.deepEqual(read.warnings, []);
  assert.equal(read.document.size, 6);
});

test("missing IDs avoid explicit IDs later in the input, including nested groups", () => {
  const result = new SvgXmlCodec().decode('<svg width="400" height="300"><rect/><g><rect id="rect1"/><rect/></g></svg>');
  assert.deepEqual([...result.document.walk()].map(shape => shape.id), ["rect2", "g1", "rect1", "rect3"]);
  assert.deepEqual(result.warnings, [
    "warning: assigned id rect2 to unnamed <rect>", "warning: assigned id g1 to unnamed <g>",
    "warning: assigned id rect3 to unnamed <rect>",
  ]);
});

test("malformed XML, duplicate IDs and unsupported SVG fail explicitly", () => {
  const codec = new SvgXmlCodec();
  for (const source of ['<svg><rect></svg>', '<svg><rect id="a"/><g id="a"/></svg>', '<svg><path id="p"/></svg>',
    '<svg><g id="g" transform="translate(1,2)"/></svg>', '<svg viewBox="10 0 800 600"/>',
    '<svg transform="scale(2)"/>', '<!DOCTYPE svg><svg/>', '<svg><text id="t"><tspan>a</tspan></text></svg>']) {
    assert.throws(() => codec.decode(source), /SVG|id already exists|unknown shape type|unsupported child/);
  }
});

test("root style, px dimensions, namespace prefixes, and data-kind fallback", () => {
  const result = new SvgXmlCodec().decode('<s:svg xmlns:s="http://www.w3.org/2000/svg" width="400px" height="200px" fill="red"><s:g id="box" data-kind="box"><s:rect id="r" width="10" height="20"/></s:g></s:svg>');
  assert.equal(result.document.width, 400); assert.equal(result.document.require("box").attributes.get("fill"), "red");
  assert.ok(result.document.require("box") instanceof Group);
  assert.equal(result.document.require("r").attributes.has("fill"), false);
});

test("root paint survives explicit inheritance and repeated SVG round trips", () => {
  const codec = new SvgXmlCodec();
  for (const keyword of ["inherit", "unset", "INHERIT", " UnSeT "]) {
    const result = codec.decode(`<svg fill="red" stroke="black" stroke-width="3">
      <rect id="r" width="10" height="20" fill="${keyword}" stroke="${keyword}"/>
      <g id="g" fill="${keyword}" stroke="${keyword}"><rect id="leaf" width="10" height="20"/></g>
      <rect id="override" width="10" height="20" fill="green" stroke="none" stroke-width="7"/>
      <rect id="reset" width="10" height="20" fill="initial" stroke="initial"/>
    </svg>`);
    for (const id of ["r", "g"]) {
      const shape = result.document.require(id);
      assert.equal(shape.attributes.get("fill"), "red", keyword);
      assert.equal(shape.attributes.get("stroke"), "black", keyword);
      assert.equal(shape.attributes.get("stroke-width"), "3");
    }
    assert.equal(result.document.require("leaf").attributes.has("fill"), false);
    const override = result.document.require("override");
    assert.equal(override.attributes.get("fill"), "green");
    assert.equal(override.attributes.get("stroke"), "none");
    assert.equal(override.attributes.get("stroke-width"), "7");
    assert.equal(result.document.require("reset").attributes.get("fill"), "initial");
    assert.equal(result.document.require("reset").attributes.get("stroke"), "initial");
    const saved = codec.encode(result.document);
    assert.equal(codec.encode(codec.decode(saved).document), saved);
    assert.deepEqual(result.warnings, []);
  }
});

test("filesystem writes replace atomically; missing paths use required errors", async () => {
  const directory = await mkdtemp(join(tmpdir(), "svg-cli-")); const files = new NodeFileStore();
  try {
    const path = join(directory, "a.svg");
    await files.write(path, "first"); await files.write(path, "second");
    assert.equal(await files.read(path), "second"); assert.equal(await readFile(path, "utf8"), "second");
    await assert.rejects(files.read(join(directory, "missing.svg")), /cannot read file:/);
    await assert.rejects(files.write(join(directory, "missing", "a.svg"), "bad"), /cannot write file:/);
    assert.deepEqual(await readdir(directory), ["a.svg"]);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
