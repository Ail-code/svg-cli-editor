import type { Shape } from "./Shape.js";

export interface ShapeContainer {
  readonly children: readonly Shape[];
  insert(shape: Shape, index?: number): void;
  remove(shape: Shape): void;
}
