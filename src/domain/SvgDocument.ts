import { Numbers } from "./Numbers.js";
import { Shape } from "./Shape.js";
import { ShapeLocation } from "./ShapeLocation.js";
import { SvgError } from "./SvgError.js";
import { Group } from "./shapes/Group.js";
import type { ShapeContainer } from "./ShapeContainer.js";

export class SvgDocument implements ShapeContainer {
  #width: number;
  #height: number;
  readonly #children: Shape[] = [];
  public constructor(width = 800, height = 600) {
    this.#width = Numbers.positive(width, "canvas width");
    this.#height = Numbers.positive(height, "canvas height");
  }
  public get width(): number { return this.#width; }
  public get height(): number { return this.#height; }
  public get children(): readonly Shape[] { return [...this.#children]; }
  public get size(): number { return [...this.walk()].length; }
  public resize(width: number, height: number): void {
    Numbers.positive(width, "canvas width"); Numbers.positive(height, "canvas height");
    this.#width = width; this.#height = height;
  }
  public *walk(): IterableIterator<Shape> {
    for (const child of this.#children) yield* child.walk();
  }
  public find(id: string): Shape | undefined { return [...this.walk()].find(shape => shape.id === id); }
  public require(id: string): Shape {
    const shape = this.find(id);
    if (!shape) throw new SvgError(`no such shape: ${id}`);
    return shape;
  }
  public container(id: string): Group {
    const shape = this.find(id);
    if (!shape) throw new SvgError(`no such container: ${id}`);
    if (!(shape instanceof Group)) throw new SvgError(`not a container: ${id}`);
    return shape;
  }
  public locate(id: string, parent: ShapeContainer = this): ShapeLocation {
    const children = parent.children;
    for (let index = 0; index < children.length; index++) {
      const shape = children[index]!;
      if (shape.id === id) return new ShapeLocation(shape, parent, index);
      if (shape instanceof Group && [...shape.walk()].some(child => child.id === id)) return this.locate(id, shape);
    }
    throw new SvgError(`no such shape: ${id}`);
  }
  public insert(shape: Shape, index = this.#children.length): void { this.#children.splice(index, 0, shape); }
  public remove(shape: Shape): void {
    const index = this.#children.indexOf(shape);
    if (index < 0) throw new SvgError(`no such shape: ${shape.id}`);
    this.#children.splice(index, 1);
  }
  public add(shape: Shape, parent: ShapeContainer = this): void {
    const ids = new Set([...this.walk()].map(item => item.id));
    for (const item of shape.walk()) {
      if (ids.has(item.id)) throw new SvgError(`id already exists: ${item.id}`);
      ids.add(item.id);
    }
    parent.insert(shape);
  }
  public delete(id: string): ShapeLocation {
    const location = this.locate(id);
    location.parent.remove(location.shape);
    return location;
  }
  public group(id: string, selectedIds: readonly string[]): Group {
    if (this.find(id)) throw new SvgError(`id already exists: ${id}`);
    if (!selectedIds.length) throw new SvgError("group requires at least one shape");
    if (new Set(selectedIds).size !== selectedIds.length) throw new SvgError("duplicate shape in group");
    const selected = selectedIds.map(selectedId => this.require(selectedId));
    for (const shape of selected) {
      if (shape.children.length && selected.some(other => other !== shape && [...shape.walk()].includes(other))) {
        throw new SvgError(`cannot group a container into its own descendant: ${shape.id}`);
      }
    }
    // Use original document traversal order, even when arguments are reversed or parents differ.
    const ordered = [...this.walk()].filter(shape => selected.includes(shape));
    const locations = ordered.map(shape => this.locate(shape.id));
    const first = locations[0]!;
    const sameParent = locations.every(location => location.parent === first.parent);
    const parent = sameParent ? first.parent : this;
    const index = sameParent ? first.index : this.#children.length;
    const group = new Group(id);
    for (const location of locations) { location.parent.remove(location.shape); group.insert(location.shape); }
    parent.insert(group, index);
    return group;
  }
  public ungroup(id: string): void {
    const shape = this.require(id);
    if (!(shape instanceof Group)) throw new SvgError(`not a container: ${id}`);
    const location = this.locate(id);
    if (location.parent === this) throw new SvgError(`cannot ungroup top-level container: ${id}`);
    for (const [key, value] of shape.attributes) {
      for (const child of shape.children) if (!child.attributes.has(key)) child.set(key, value);
    }
    location.parent.remove(shape);
    for (const [offset, child] of shape.children.entries()) {
      shape.remove(child); location.parent.insert(child, location.index + offset);
    }
  }
  public addTo(groupId: string, id: string): void {
    const group = this.container(groupId);
    const location = this.locate(id);
    if ([...location.shape.walk()].includes(group)) throw new SvgError(`cannot group a container into its own descendant: ${id}`);
    location.parent.remove(location.shape); group.insert(location.shape);
  }
  public reorder(id: string, front: boolean): void {
    const location = this.locate(id);
    location.parent.remove(location.shape);
    location.parent.insert(location.shape, front ? location.parent.children.length : 0);
  }
  public clone(): SvgDocument {
    const copy = new SvgDocument(this.#width, this.#height);
    for (const child of this.#children) copy.insert(child.clone());
    return copy;
  }
}
