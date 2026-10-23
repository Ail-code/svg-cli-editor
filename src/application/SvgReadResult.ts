import type { SvgDocument } from "../domain/SvgDocument.js";

export class SvgReadResult {
  public constructor(public readonly document: SvgDocument, public readonly warnings: readonly string[]) {}
}
