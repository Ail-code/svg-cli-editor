import { EditCommand } from "../EditCommand.js";
import type { SvgDocument } from "../../domain/SvgDocument.js";

export class UngroupCommand extends EditCommand {
  public constructor(private readonly id: string) { super(); }
  protected override apply(document: SvgDocument): string { document.ungroup(this.id); return `g#${this.id} ungrouped`; }
}
