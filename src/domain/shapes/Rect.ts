import { Shape } from "../Shape.js";
import type { ShapeVisitor } from "../ShapeVisitor.js";

export class Rect extends Shape {
  public readonly tag = "rect";
  public constructor(id: string, x = 0, y = 0, width = 0, height = 0) {
    super(id, { x, y, width, height }, ["width", "height"]);
  }
  public override move(dx: number, dy: number): void { this.translate(["x"], ["y"], dx, dy); }
  public override clone(): Rect { return this.copyAttributesTo(new Rect(this.id)); }
  public override accept<T>(visitor: ShapeVisitor<T>): T { return visitor.visitRect(this); }
}
