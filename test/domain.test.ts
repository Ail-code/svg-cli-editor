import { test } from "node:test";
import assert from "node:assert/strict";
import { SvgDocument } from "../src/domain/SvgDocument.js";
import { Group } from "../src/domain/shapes/Group.js";
import { Rect } from "../src/domain/shapes/Rect.js";
import { ShapeFactory } from "../src/application/ShapeFactory.js";

test("nested composites move and scale all geometry once", () => {
  const document = new SvgDocument();
  const outer = new Group("outer"); const inner = new Group("inner");
  const rectangle = new Rect("r", 10, 20, 100, 50);
  inner.insert(rectangle); outer.insert(inner); document.add(outer);
  outer.move(5, -10); outer.scale(2);
  assert.deepEqual(Object.fromEntries(rectangle.attributes), { x: "30", y: "20", width: "200", height: "100" });
  const snapshot = document.clone(); rectangle.move(7, 8);
  assert.equal(snapshot.require("r").number("x"), 30);
});

test("global IDs, factory boundary and property validation", () => {
  const document = new SvgDocument(); const factory = new ShapeFactory();
  document.add(factory.create("rect", "r", ["0", "0", "10", "20"]));
  assert.throws(() => document.add(new Group("r")), /id already exists: r/);
  assert.throws(() => factory.create("box", "b", []), /unknown shape type: box/);
  assert.throws(() => document.require("r").set("id", "other"), /unknown attribute: id/);
  assert.throws(() => document.require("r").scale(0), /scale factor must be positive/);
  assert.throws(() => document.require("r").set("width", "NaN"), /invalid number/);
});

test("group respects existing sibling order and rejects ancestors", () => {
  const document = new SvgDocument();
  document.add(new Rect("a")); document.add(new Rect("b")); document.add(new Rect("c"));
  const group = document.group("g", ["c", "a"]);
  assert.deepEqual(group.children.map(shape => shape.id), ["a", "c"]);
  assert.deepEqual(document.children.map(shape => shape.id), ["g", "b"]);
  assert.throws(() => document.group("bad", ["a", "g"]), /own descendant: g/);
  assert.throws(() => document.addTo("g", "g"), /own descendant/);
  assert.throws(() => document.ungroup("g"), /cannot ungroup top-level container: g/);
});
