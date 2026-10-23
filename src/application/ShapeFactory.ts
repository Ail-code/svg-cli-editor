import { Shape } from "../domain/Shape.js";
import { SvgError } from "../domain/SvgError.js";
import { Rect } from "../domain/shapes/Rect.js";
import { Circle } from "../domain/shapes/Circle.js";
import { Ellipse } from "../domain/shapes/Ellipse.js";
import { Line } from "../domain/shapes/Line.js";
import { Text } from "../domain/shapes/Text.js";
import { Group } from "../domain/shapes/Group.js";

export class ShapeFactory {
  readonly #types = new Map<string, new (id: string) => Shape>([
    ["rect", Rect], ["circle", Circle], ["ellipse", Ellipse],
    ["line", Line], ["text", Text], ["g", Group],
  ]);

  public empty(type: string, id: string): Shape {
    const Constructor = this.#types.get(type);
    if (!Constructor) throw new SvgError(`unknown shape type: ${type} (is the plugin loaded?)`);
    return new Constructor(id);
  }

  public create(type: string, id: string, parameters: readonly string[]): Shape {
    const shape = this.empty(type, id);
    const keys = shape.creationAttributes;
    const maximum = keys.length + (shape.optionalPaint ? 1 : 0);
    if (parameters.length < keys.length || parameters.length > maximum) {
      throw new SvgError(`invalid parameters for ${type}; use 'help' for syntax`);
    }
    keys.forEach((key, index) => shape.set(key, parameters[index]!));
    if (parameters.length > keys.length && shape.optionalPaint) shape.set(shape.optionalPaint, parameters[keys.length]!);
    return shape;
  }
}
