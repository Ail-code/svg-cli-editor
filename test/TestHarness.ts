import assert from "node:assert/strict";
import { EditorApplication } from "../src/application/EditorApplication.js";
import { ShapeFactory } from "../src/application/ShapeFactory.js";
import { SvgXmlCodec } from "../src/infrastructure/SvgXmlCodec.js";
import { CommandDispatcher } from "../src/cli/CommandDispatcher.js";
import { MemoryFileStore } from "./MemoryFileStore.js";

export class TestHarness {
  public readonly files = new MemoryFileStore();
  public readonly factory = new ShapeFactory();
  public readonly codec = new SvgXmlCodec(this.factory);
  public readonly editor = new EditorApplication(this.files, this.codec);
  public readonly commands = new CommandDispatcher(this.editor, this.factory);
  public async run(line: string): Promise<string[]> {
    const lines = await this.commands.execute(line);
    assert.equal(lines.some(output => output.startsWith("error:")), false, `${line}\n${lines.join("\n")}`);
    return lines;
  }
  public snapshot(): string { return this.codec.encode(this.editor.document); }
}
