import { SvgError } from "../domain/SvgError.js";
import type { EditorState } from "./EditorState.js";
import type { EditCommand } from "./EditCommand.js";

export class CommandHistory {
  readonly #undo: EditCommand[] = [];
  readonly #redo: EditCommand[] = [];
  #blocked = false;

  public execute(command: EditCommand, state: EditorState): string {
    const summary = command.execute(state);
    this.#undo.push(command); this.#redo.length = 0; this.#blocked = false;
    return summary;
  }
  public barrier(): void {
    this.#undo.length = 0; this.#redo.length = 0; this.#blocked = true;
  }
  public undo(state: EditorState): string {
    this.checkBarrier();
    const command = this.#undo.at(-1);
    if (!command) throw new SvgError("nothing to undo");
    const result = command.undo(state);
    this.#undo.pop(); this.#redo.push(command);
    return result;
  }
  public redo(state: EditorState): string {
    this.checkBarrier();
    const command = this.#redo.at(-1);
    if (!command) throw new SvgError("nothing to redo");
    const result = command.redo(state);
    this.#redo.pop(); this.#undo.push(command);
    return result;
  }
  private checkBarrier(): void {
    if (this.#blocked) throw new SvgError("undo not allowed after io command");
  }
}
