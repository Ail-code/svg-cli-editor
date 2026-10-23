import { EditCommand } from "../EditCommand.js";
import type { SvgDocument } from "../../domain/SvgDocument.js";

export class AddToCommand extends EditCommand {
  public constructor(private readonly groupId: string, private readonly id: string) { super(); }
  protected override apply(document: SvgDocument): string {
    const shape = document.require(this.id); document.addTo(this.groupId, this.id);
    return `${shape.label} added to g#${this.groupId}`;
  }
}
