import type { FileStore } from "../src/application/FileStore.js";
import { SvgError } from "../src/domain/SvgError.js";

export class MemoryFileStore implements FileStore {
  readonly #files = new Map<string, string>();
  #writable = true;
  public put(path: string, source: string): void { this.#files.set(path, source); }
  public denyWrites(): void { this.#writable = false; }
  public allowWrites(): void { this.#writable = true; }
  public async read(path: string): Promise<string> {
    const source = this.#files.get(path);
    if (source === undefined) throw new SvgError(`cannot read file: ${path}`);
    return source;
  }
  public async write(path: string, source: string): Promise<void> {
    if (!this.#writable) throw new SvgError(`cannot write file: ${path}`);
    this.#files.set(path, source);
  }
}
