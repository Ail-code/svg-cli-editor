import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";
import type { CommandDispatcher } from "./CommandDispatcher.js";

export class Repl {
  public constructor(private readonly commands: CommandDispatcher, private readonly input: Readable, private readonly output: Writable) {}
  public async run(interactive = false): Promise<void> {
    const reader = createInterface({ input: this.input, output: this.output, terminal: interactive, crlfDelay: Infinity });
    this.output.write("svg-editor 0.1 — type 'help' for commands\n");
    if (interactive) { reader.setPrompt("svg> "); reader.prompt(); }
    for await (const line of reader) {
      for (const result of await this.commands.execute(line)) this.output.write(`${result}\n`);
      if (interactive) reader.prompt();
    }
  }
}
