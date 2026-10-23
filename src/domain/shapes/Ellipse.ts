import { Shape } from "../Shape.js";
import type { ShapeVisitor } from "../ShapeVisitor.js";

export class Ellipse extends Shape {
  public readonly tag = "ellipse";
  public constructor(id: string, cx = 0, cy = 0, rx = 0, ry = 0) {
    super(id, { cx, cy, rx, ry }, ["rx", "ry"]);
  }
  public override move(dx: number, dy: number): void { this.translate(["cx"], ["cy"], dx, dy); }
  public override clone(): Ellipse { return this.copyAttributesTo(new Ellipse(this.id)); }
  public override accept<T>(visitor: ShapeVisitor<T>): T { return visitor.visitEllipse(this); }
}
