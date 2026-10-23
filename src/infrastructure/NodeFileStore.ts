import { readFile, writeFile, rename, rm } from "node:fs/promises";
import { dirname, basename, join } from "node:path";
import { randomUUID } from "node:crypto";
import { SvgError } from "../domain/SvgError.js";
import type { FileStore } from "../application/FileStore.js";

export class NodeFileStore implements FileStore {
  public async read(path: string): Promise<string> {
    try { return await readFile(path, "utf8"); }
    catch { throw new SvgError(`cannot read file: ${path}`); }
  }
  public async write(path: string, content: string): Promise<void> {
    const temporary = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
    try {
      await writeFile(temporary, content, { flag: "wx" });
      await rename(temporary, path);
    } catch {
      await rm(temporary, { force: true }).catch(() => undefined);
      throw new SvgError(`cannot write file: ${path}`);
    }
  }
}
