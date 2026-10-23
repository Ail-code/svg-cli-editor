import { Shape } from "../Shape.js";
import type { ShapeVisitor } from "../ShapeVisitor.js";

export class Text extends Shape {
  public readonly tag = "text";
  #content: string;
  public constructor(id: string, x = 0, y = 0, content = "") {
    super(id, { x, y });
    this.#content = content;
  }
  public override get creationAttributes(): readonly string[] { return ["x", "y", "text"]; }
  public override get optionalPaint(): undefined { return undefined; }
  public override get textContent(): string { return this.#content; }
  public override set(attribute: string, value: string): void {
    if (attribute === "text") { this.#content = value; return; }
    super.set(attribute, value);
  }
  public override move(dx: number, dy: number): void { this.translate(["x"], ["y"], dx, dy); }
  public override clone(): Text { return this.copyAttributesTo(new Text(this.id, 0, 0, this.#content)); }
  public override accept<T>(visitor: ShapeVisitor<T>): T { return visitor.visitText(this); }
}
