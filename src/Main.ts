import { stdin, stdout } from "node:process";
import { EditorApplication } from "./application/EditorApplication.js";
import { ShapeFactory } from "./application/ShapeFactory.js";
import { NodeFileStore } from "./infrastructure/NodeFileStore.js";
import { SvgXmlCodec } from "./infrastructure/SvgXmlCodec.js";
import { CommandDispatcher } from "./cli/CommandDispatcher.js";
import { Repl } from "./cli/Repl.js";

export class Main {
  public static async run(): Promise<void> {
    const factory = new ShapeFactory();
    const editor = new EditorApplication(new NodeFileStore(), new SvgXmlCodec(factory));
    const repl = new Repl(new CommandDispatcher(editor, factory), stdin, stdout);
    await repl.run(Boolean(stdin.isTTY && stdout.isTTY));
  }
}

await Main.run();
