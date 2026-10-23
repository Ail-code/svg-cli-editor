import { Shape } from "../Shape.js";
import type { ShapeVisitor } from "../ShapeVisitor.js";

export class Line extends Shape {
  public readonly tag = "line";
  public constructor(id: string, x1 = 0, y1 = 0, x2 = 0, y2 = 0) {
    super(id, { x1, y1, x2, y2 });
  }
  public override get optionalPaint(): string { return "stroke"; }
  public override move(dx: number, dy: number): void { this.translate(["x1", "x2"], ["y1", "y2"], dx, dy); }
  public override clone(): Line { return this.copyAttributesTo(new Line(this.id)); }
  public override accept<T>(visitor: ShapeVisitor<T>): T { return visitor.visitLine(this); }
}
