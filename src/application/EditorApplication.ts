import { SvgDocument } from "../domain/SvgDocument.js";
import { SvgError } from "../domain/SvgError.js";
import { EditorState } from "./EditorState.js";
import { CommandHistory } from "./CommandHistory.js";
import type { EditCommand } from "./EditCommand.js";
import type { FileStore } from "./FileStore.js";
import type { SvgCodec } from "./SvgCodec.js";

export class EditorApplication {
  readonly #state = new EditorState();
  readonly #history = new CommandHistory();
  public constructor(private readonly files: FileStore, private readonly codec: SvgCodec) {}
  public get document(): SvgDocument { return this.#state.document; }
  public init(width = 800, height = 600): string[] {
    const document = new SvgDocument(width, height);
    this.#state.open(document); this.#history.barrier();
    return [`canvas ${width}x${height} created`];
  }
  public async read(path: string): Promise<string[]> {
    const xml = await this.files.read(path);
    const result = this.codec.decode(xml);
    this.#state.open(result.document, path); this.#history.barrier();
    return [...result.warnings, `read ${path} (${result.document.size} elements)`];
  }
  public async save(path?: string): Promise<string[]> {
    const document = this.document;
    const destination = path ?? this.#state.path;
    if (!destination) throw new SvgError("no file path. use 'save <file.svg>'");
    await this.files.write(destination, this.codec.encode(document));
    this.#state.saved(destination); this.#history.barrier();
    return [`saved to ${destination} (${document.size} elements)`];
  }
  public canvas(width?: number, height?: number): string[] {
    const document = this.document;
    if (width === undefined && height === undefined) return [`canvas ${document.width}x${document.height}`];
    if (width === undefined) throw new SvgError("usage: canvas [w] [h]");
    const newHeight = height ?? document.height;
    document.resize(width, newHeight); this.#history.barrier();
    return [`canvas resized to ${width}x${newHeight}`];
  }
  public execute(command: EditCommand): string[] { return [this.#history.execute(command, this.#state)]; }
  public undo(): string[] { this.document; return [this.#history.undo(this.#state)]; }
  public redo(): string[] { this.document; return [this.#history.redo(this.#state)]; }
}
