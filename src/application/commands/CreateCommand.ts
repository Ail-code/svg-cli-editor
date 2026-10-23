import { ShapeFactory } from "../ShapeFactory.js";
import { EditCommand } from "../EditCommand.js";
import type { SvgDocument } from "../../domain/SvgDocument.js";

export class CreateCommand extends EditCommand {
  public constructor(private readonly factory: ShapeFactory, private readonly type: string, private readonly id: string,
    private readonly parameters: readonly string[], private readonly containerId?: string) { super(); }
  protected override apply(document: SvgDocument): string {
    const parent = this.containerId === undefined ? document : document.container(this.containerId);
    const shape = this.factory.create(this.type, this.id, this.parameters);
    document.add(shape, parent);
    return `${shape.label} created${this.containerId === undefined ? "" : ` in g#${this.containerId}`}`;
  }
}
