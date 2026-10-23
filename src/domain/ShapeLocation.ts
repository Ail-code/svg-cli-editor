import type { Shape } from "./Shape.js";
import type { ShapeContainer } from "./ShapeContainer.js";

export class ShapeLocation {
  public constructor(
    public readonly shape: Shape,
    public readonly parent: ShapeContainer,
    public readonly index: number,
  ) {}
}
