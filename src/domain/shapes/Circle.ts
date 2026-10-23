import { Shape } from "../Shape.js";
import type { ShapeVisitor } from "../ShapeVisitor.js";

export class Circle extends Shape {
  public readonly tag = "circle";
  public constructor(id: string, cx = 0, cy = 0, r = 0) {
    super(id, { cx, cy, r }, ["r"]);
  }
  public override move(dx: number, dy: number): void { this.translate(["cx"], ["cy"], dx, dy); }
  public override clone(): Circle { return this.copyAttributesTo(new Circle(this.id)); }
  public override accept<T>(visitor: ShapeVisitor<T>): T { return visitor.visitCircle(this); }
}
