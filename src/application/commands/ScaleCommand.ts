import { EditCommand } from "../EditCommand.js";
import type { SvgDocument } from "../../domain/SvgDocument.js";

export class ScaleCommand extends EditCommand {
  public constructor(private readonly id: string, private readonly factor: number) { super(); }
  protected override apply(document: SvgDocument): string {
    const shape = document.require(this.id); shape.scale(this.factor);
    return `${shape.label} scaled by ${this.factor}`;
  }
}
