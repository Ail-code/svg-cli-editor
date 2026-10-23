import { SvgDocument } from "../domain/SvgDocument.js";
import { SvgError } from "../domain/SvgError.js";
import type { EditorState } from "./EditorState.js";

export abstract class EditCommand {
  #before: SvgDocument | undefined;
  #after: SvgDocument | undefined;
  #summary = "";

  public execute(state: EditorState): string {
    const before = state.document.clone();
    try {
      const summary = this.apply(state.document);
      this.#after = state.document.clone();
      this.#before = before;
      this.#summary = summary;
      return summary;
    } catch (error) {
      state.restore(before);
      throw error;
    }
  }
  public undo(state: EditorState): string {
    if (!this.#before) throw new SvgError("command has not been executed");
    state.restore(this.#before);
    return `undone: ${this.#summary}`;
  }
  public redo(state: EditorState): string {
    if (!this.#after) throw new SvgError("command has not been executed");
    state.restore(this.#after);
    return `redone: ${this.#summary}`;
  }
  protected abstract apply(document: SvgDocument): string;
}
