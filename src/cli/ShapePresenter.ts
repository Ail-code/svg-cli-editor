import type { ShapeVisitor } from "../domain/ShapeVisitor.js";
import type { Rect } from "../domain/shapes/Rect.js";
import type { Circle } from "../domain/shapes/Circle.js";
import type { Ellipse } from "../domain/shapes/Ellipse.js";
import type { Line } from "../domain/shapes/Line.js";
import type { Text } from "../domain/shapes/Text.js";
import type { Group } from "../domain/shapes/Group.js";

export class ShapePresenter implements ShapeVisitor<string> {
  public visitRect(shape: Rect): string { return `x=${shape.number("x")} y=${shape.number("y")} w=${shape.number("width")} h=${shape.number("height")}`; }
  public visitCircle(shape: Circle): string { return `cx=${shape.number("cx")} cy=${shape.number("cy")} r=${shape.number("r")}`; }
  public visitEllipse(shape: Ellipse): string { return `cx=${shape.number("cx")} cy=${shape.number("cy")} rx=${shape.number("rx")} ry=${shape.number("ry")}`; }
  public visitLine(shape: Line): string { return `(${shape.number("x1")},${shape.number("y1")}) -> (${shape.number("x2")},${shape.number("y2")})`; }
  public visitText(shape: Text): string { return `(${shape.number("x")},${shape.number("y")}) ${JSON.stringify(shape.textContent)}`; }
  public visitGroup(_shape: Group): string { return ""; }
}
