import { EditCommand } from "../EditCommand.js";
import type { SvgDocument } from "../../domain/SvgDocument.js";

export class SetCommand extends EditCommand {
  public constructor(private readonly id: string, private readonly attribute: string, private readonly value: string) { super(); }
  protected override apply(document: SvgDocument): string {
    const shape = document.require(this.id); shape.set(this.attribute, this.value);
    return `${shape.label} updated: ${this.attribute}=${JSON.stringify(this.value)}`;
  }
}
