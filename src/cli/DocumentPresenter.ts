import type { SvgDocument } from "../domain/SvgDocument.js";
import type { Shape } from "../domain/Shape.js";
import { Group } from "../domain/shapes/Group.js";
import { ShapePresenter } from "./ShapePresenter.js";

export class DocumentPresenter {
  readonly #shapes = new ShapePresenter();
  public tree(document: SvgDocument, id?: string): string[] {
    const root = id === undefined ? undefined : document.require(id);
    const lines = [root ? this.summary(root) : `svg (${document.width}x${document.height})`];
    this.appendChildren(root ? root.children : document.children, "", lines);
    return lines;
  }
  private appendChildren(children: readonly Shape[], prefix: string, lines: string[]): void {
    children.forEach((shape, index) => {
      const last = index === children.length - 1;
      lines.push(`${prefix}${last ? "└── " : "├── "}${this.summary(shape)}`);
      this.appendChildren(shape.children, `${prefix}${last ? "    " : "│   "}`, lines);
    });
  }
  public show(document: SvgDocument, id: string): string[] {
    const location = document.locate(id);
    const parent = location.parent instanceof Group ? location.parent.label : "svg";
    const lines = [`${location.shape.label}  parent=${parent}`];
    for (const [key, value] of location.shape.attributes) lines.push(`  ${key}=${value}`);
    if (location.shape.textContent !== undefined) lines.push(`  text=${JSON.stringify(location.shape.textContent)}`);
    return lines;
  }
  private summary(shape: Shape): string {
    const geometry = shape.accept(this.#shapes);
    const styles = ["fill", "stroke", "stroke-width"]
      .filter(key => shape.attributes.has(key)).map(key => `${key}=${shape.attributes.get(key)}`).join(" ");
    return [shape.label, geometry, styles].filter(Boolean).join("  ");
  }
}
