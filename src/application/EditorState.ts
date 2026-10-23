import { SvgDocument } from "../domain/SvgDocument.js";
import { SvgError } from "../domain/SvgError.js";

export class EditorState {
  #document: SvgDocument | undefined;
  #path: string | undefined;
  public get document(): SvgDocument {
    if (!this.#document) throw new SvgError("no document. use 'init' or 'read' first");
    return this.#document;
  }
  public get path(): string | undefined { return this.#path; }
  public open(document: SvgDocument, path?: string): void { this.#document = document; this.#path = path; }
  public restore(document: SvgDocument): void { this.#document = document.clone(); }
  public saved(path: string): void { this.#path = path; }
}
