import { Numbers } from "./Numbers.js";
import { SvgError } from "./SvgError.js";
import type { ShapeVisitor } from "./ShapeVisitor.js";

export abstract class Shape {
  readonly #id: string;
  readonly #attributes = new Map<string, string>();
  readonly #geometryKeys: readonly string[];
  readonly #nonNegative: ReadonlySet<string>;
  public abstract readonly tag: string;

  protected constructor(id: string, geometry: Readonly<Record<string, number>>, nonNegative: readonly string[] = []) {
    if (!id || /[\s\u0000-\u001f]/u.test(id)) throw new SvgError(`invalid id: ${id}`);
    this.#id = id;
    this.#geometryKeys = Object.keys(geometry);
    this.#nonNegative = new Set(nonNegative);
    for (const [key, value] of Object.entries(geometry)) this.set(key, String(value));
  }

  public get id(): string { return this.#id; }
  public get label(): string { return `${this.tag}#${this.id}`; }
  public get attributes(): ReadonlyMap<string, string> { return new Map(this.#attributes); }
  public get creationAttributes(): readonly string[] { return [...this.#geometryKeys]; }
  public get optionalPaint(): string | undefined { return "fill"; }
  public get children(): readonly Shape[] { return []; }
  public get textContent(): string | undefined { return undefined; }

  public number(attribute: string): number {
    const value = this.#attributes.get(attribute);
    if (value === undefined) throw new SvgError(`unknown attribute: ${attribute}`);
    return Numbers.parse(value, attribute);
  }

  public set(attribute: string, value: string): void {
    if (this.#geometryKeys.includes(attribute) || attribute === "stroke-width") {
      const numeric = Numbers.parse(value, attribute);
      if (this.#nonNegative.has(attribute) || attribute === "stroke-width") Numbers.nonNegative(numeric, attribute);
      this.#attributes.set(attribute, String(numeric));
      return;
    }
    if (attribute === "fill" || attribute === "stroke") {
      this.#attributes.set(attribute, value);
      return;
    }
    throw new SvgError(`unknown attribute: ${attribute}`);
  }

  public abstract move(dx: number, dy: number): void;
  public abstract clone(): Shape;
  public abstract accept<T>(visitor: ShapeVisitor<T>): T;

  public scale(factor: number): void {
    Numbers.positive(factor, "scale factor");
    const values = this.#geometryKeys.map(key => [key, Numbers.finite(this.number(key) * factor, key)] as const);
    for (const [key, value] of values) this.set(key, String(value));
  }

  public *walk(): IterableIterator<Shape> {
    yield this;
    for (const child of this.children) yield* child.walk();
  }

  protected translate(horizontal: readonly string[], vertical: readonly string[], dx: number, dy: number): void {
    Numbers.finite(dx, "dx");
    Numbers.finite(dy, "dy");
    const updates = [
      ...horizontal.map(key => [key, Numbers.finite(this.number(key) + dx, key)] as const),
      ...vertical.map(key => [key, Numbers.finite(this.number(key) + dy, key)] as const),
    ];
    for (const [key, value] of updates) this.set(key, String(value));
  }

  protected copyAttributesTo<T extends Shape>(copy: T): T {
    for (const [key, value] of this.#attributes) copy.set(key, value);
    return copy;
  }
}
