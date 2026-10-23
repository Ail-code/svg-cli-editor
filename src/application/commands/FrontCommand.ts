import { EditCommand } from "../EditCommand.js";
import type { SvgDocument } from "../../domain/SvgDocument.js";

export class FrontCommand extends EditCommand {
  public constructor(private readonly id: string) { super(); }
  protected override apply(document: SvgDocument): string {
    document.reorder(this.id, true); return `${document.require(this.id).label} brought to front`;
  }
}
