import { Shape } from "../Shape.js";
import { Numbers } from "../Numbers.js";
import { SvgError } from "../SvgError.js";
import type { ShapeContainer } from "../ShapeContainer.js";
import type { ShapeVisitor } from "../ShapeVisitor.js";

export class Group extends Shape implements ShapeContainer {
  public readonly tag = "g";
  readonly #children: Shape[] = [];
  public constructor(id: string) { super(id, {}); }
  public override get optionalPaint(): undefined { return undefined; }
  public override get children(): readonly Shape[] { return [...this.#children]; }

  public insert(shape: Shape, index = this.#children.length): void {
    if ([...shape.walk()].includes(this)) throw new SvgError(`cannot group a container into its own descendant: ${shape.id}`);
    if (this.#children.includes(shape)) throw new SvgError(`shape already in container: ${shape.id}`);
    this.#children.splice(index, 0, shape);
  }

  public remove(shape: Shape): void {
    const index = this.#children.indexOf(shape);
    if (index < 0) throw new SvgError(`no such shape: ${shape.id}`);
    this.#children.splice(index, 1);
  }

  public override move(dx: number, dy: number): void {
    Numbers.finite(dx, "dx"); Numbers.finite(dy, "dy");
    for (const child of this.#children) child.move(dx, dy);
  }
  public override scale(factor: number): void {
    Numbers.positive(factor, "scale factor");
    for (const child of this.#children) child.scale(factor);
  }
  public override clone(): Group {
    const copy = this.copyAttributesTo(new Group(this.id));
    for (const child of this.#children) copy.insert(child.clone());
    return copy;
  }
  public override accept<T>(visitor: ShapeVisitor<T>): T { return visitor.visitGroup(this); }
}
