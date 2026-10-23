import { test } from "node:test";
import assert from "node:assert/strict";
import { EditorState } from "../src/application/EditorState.js";
import { CommandHistory } from "../src/application/CommandHistory.js";
import { MoveCommand } from "../src/application/commands/MoveCommand.js";
import { ScaleCommand } from "../src/application/commands/ScaleCommand.js";
import { SetCommand } from "../src/application/commands/SetCommand.js";
import { DeleteCommand } from "../src/application/commands/DeleteCommand.js";
import { SvgDocument } from "../src/domain/SvgDocument.js";
import { Group } from "../src/domain/shapes/Group.js";
import { Rect } from "../src/domain/shapes/Rect.js";

test("undo restores exact floating point values; failures preserve redo", () => {
  const state = new EditorState(); const history = new CommandHistory(); const document = new SvgDocument();
  document.add(new Rect("r", 0.1, 0.2, 10, 20)); state.open(document);
  history.execute(new MoveCommand("r", 0.2, 0.3), state);
  history.undo(state);
  assert.equal(state.document.require("r").number("x"), 0.1);
  assert.throws(() => history.execute(new SetCommand("r", "id", "bad"), state), /unknown attribute/);
  history.redo(state);
  assert.equal(state.document.require("r").number("x"), 0.1 + 0.2);
  history.undo(state); history.execute(new MoveCommand("r", 1, 0), state);
  assert.throws(() => history.redo(state), /nothing to redo/);
});

test("overflow partway through a composite rolls back every child", () => {
  const state = new EditorState(); const history = new CommandHistory(); const document = new SvgDocument();
  const group = new Group("g"); group.insert(new Rect("a", 1, 2, 3, 4)); group.insert(new Rect("b", 1e308));
  document.add(group); state.open(document);
  assert.throws(() => history.execute(new ScaleCommand("g", 2), state), /must be finite/);
  assert.equal(state.document.require("a").number("x"), 1);
  assert.equal(state.document.require("b").number("x"), 1e308);
  assert.throws(() => history.undo(state), /nothing to undo/);
});

test("deleting a subtree is one undo unit and restores order", () => {
  const state = new EditorState(); const history = new CommandHistory(); const document = new SvgDocument();
  const group = new Group("g"); group.insert(new Rect("r"));
  document.add(new Rect("before")); document.add(group); document.add(new Rect("after")); state.open(document);
  history.execute(new DeleteCommand("g"), state); assert.equal(state.document.find("r"), undefined);
  history.undo(state);
  assert.deepEqual(state.document.children.map(shape => shape.id), ["before", "g", "after"]);
  assert.equal(state.document.locate("r").parent, state.document.require("g"));
});

test("IO barrier persists through failed edits and resets after a successful edit", () => {
  const state = new EditorState(); const history = new CommandHistory(); const document = new SvgDocument();
  document.add(new Rect("r")); state.open(document); history.barrier();
  assert.throws(() => history.undo(state), /undo not allowed after io command/);
  assert.throws(() => history.execute(new ScaleCommand("r", 0), state), /must be positive/);
  assert.throws(() => history.redo(state), /undo not allowed after io command/);
  history.execute(new MoveCommand("r", 1, 0), state); history.undo(state);
  assert.equal(state.document.require("r").number("x"), 0);
});
