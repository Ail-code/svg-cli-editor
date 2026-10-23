import { DOMParser, DOMImplementation, XMLSerializer } from "@xmldom/xmldom";
import type { Element as XmlElement, Document as XmlDocument } from "@xmldom/xmldom";
import { SvgDocument } from "../domain/SvgDocument.js";
import { Shape } from "../domain/Shape.js";
import { Group } from "../domain/shapes/Group.js";
import { Numbers } from "../domain/Numbers.js";
import { SvgError } from "../domain/SvgError.js";
import { ShapeFactory } from "../application/ShapeFactory.js";
import { SvgReadResult } from "../application/SvgReadResult.js";
import type { SvgCodec } from "../application/SvgCodec.js";

export class SvgXmlCodec implements SvgCodec {
  static readonly #namespace = "http://www.w3.org/2000/svg";
  public constructor(private readonly factory = new ShapeFactory()) {}

  public decode(source: string): SvgReadResult {
    try {
      const xml = new DOMParser({ onError: (_level, message) => { throw new SvgError(`invalid SVG: ${message}`); } })
        .parseFromString(source, "image/svg+xml");
      if (xml.doctype) throw new SvgError("unsupported SVG: DOCTYPE");
      const root = xml.documentElement;
      if (!root || root.localName !== "svg") throw new SvgError("invalid SVG: root must be <svg>");
      this.checkNamespace(root);
      const rootAttributes = new Set(["xmlns", "width", "height", "viewBox", "fill", "stroke", "stroke-width", "version", "id"]);
      for (let index = 0; index < root.attributes.length; index++) {
        const attribute = root.attributes.item(index)!;
        if (!rootAttributes.has(attribute.name) && attribute.prefix !== "xmlns") throw new SvgError(`unsupported SVG attribute: ${attribute.name}`);
      }
      const viewBox = root.getAttribute("viewBox")?.trim().split(/[\s,]+/).map(value => Numbers.parse(value, "viewBox"));
      if (viewBox && viewBox.length !== 4) throw new SvgError("invalid SVG: viewBox needs four numbers");
      const width = this.length(root.getAttribute("width") || String(viewBox?.[2] ?? 800), "canvas width");
      const height = this.length(root.getAttribute("height") || String(viewBox?.[3] ?? 600), "canvas height");
      if (viewBox && (viewBox[0] !== 0 || viewBox[1] !== 0 || viewBox[2] !== width || viewBox[3] !== height)) {
        throw new SvgError("unsupported SVG: viewBox must match canvas coordinates");
      }
      const document = new SvgDocument(width, height);
      const reserved = new Set<string>();
      this.reserveIds(root, reserved);
      const warnings: string[] = [];
      const counters = new Map<string, number>();
      for (const element of this.elements(root)) {
        const shape = this.readShape(element, reserved, counters, warnings);
        for (const attribute of ["fill", "stroke", "stroke-width"]) {
          if (root.hasAttribute(attribute) && !shape.attributes.has(attribute)) shape.set(attribute, root.getAttribute(attribute)!);
        }
        document.add(shape);
      }
      return new SvgReadResult(document, warnings);
    } catch (error) {
      if (error instanceof SvgError) throw error;
      throw new SvgError(`invalid SVG: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private checkNamespace(element: XmlElement): void {
    if (element.namespaceURI && element.namespaceURI !== SvgXmlCodec.#namespace) {
      throw new SvgError(`unsupported XML namespace: ${element.namespaceURI}`);
    }
  }

  private reserveIds(element: XmlElement, ids: Set<string>): void {
    for (const child of this.elements(element)) {
      const id = child.getAttribute("id");
      if (id) {
        if (ids.has(id)) throw new SvgError(`id already exists: ${id}`);
        ids.add(id);
      }
      this.reserveIds(child, ids);
    }
  }

  private readShape(element: XmlElement, reserved: Set<string>, counters: Map<string, number>, warnings: string[]): Shape {
    this.checkNamespace(element);
    const type = element.localName ?? element.tagName;
    let id = element.getAttribute("id") ?? "";
    if (!id) {
      let counter = counters.get(type) ?? 0;
      do { id = `${type}${++counter}`; } while (reserved.has(id));
      counters.set(type, counter); reserved.add(id);
      warnings.push(`warning: assigned id ${id} to unnamed <${type}>`);
    }
    const shape = this.factory.empty(type, id);
    for (let index = 0; index < element.attributes.length; index++) {
      const attribute = element.attributes.item(index)!;
      if (attribute.name === "id" || attribute.name === "xmlns" || attribute.prefix === "xmlns" || attribute.name === "data-kind") continue;
      if (attribute.name === "transform") throw new SvgError("unsupported SVG attribute: transform");
      shape.set(attribute.name, attribute.value);
    }
    if (shape.textContent !== undefined) shape.set("text", element.textContent ?? "");
    const children = this.elements(element);
    if (children.length && !(shape instanceof Group)) throw new SvgError(`unsupported child element in <${type}>`);
    if (shape instanceof Group) for (const child of children) shape.insert(this.readShape(child, reserved, counters, warnings));
    return shape;
  }

  private elements(element: XmlElement): XmlElement[] {
    const elements: XmlElement[] = [];
    for (let index = 0; index < element.childNodes.length; index++) {
      const node = element.childNodes.item(index)!;
      if (node.nodeType === 1) elements.push(node as XmlElement);
    }
    return elements;
  }

  private length(value: string, name: string): number { return Numbers.parse(value.trim().replace(/px$/, ""), name); }

  public encode(document: SvgDocument): string {
    const xml = new DOMImplementation().createDocument(SvgXmlCodec.#namespace, "svg", null);
    const root = xml.documentElement!;
    root.setAttribute("xmlns", SvgXmlCodec.#namespace);
    root.setAttribute("width", String(document.width)); root.setAttribute("height", String(document.height));
    root.setAttribute("viewBox", `0 0 ${document.width} ${document.height}`);
    for (const shape of document.children) this.appendShape(xml, root, shape, 1);
    if (document.children.length) root.appendChild(xml.createTextNode("\n"));
    return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(xml)}\n`;
  }

  private appendShape(xml: XmlDocument, parent: XmlElement, shape: Shape, depth: number): void {
    parent.appendChild(xml.createTextNode(`\n${"  ".repeat(depth)}`));
    const element = xml.createElementNS(SvgXmlCodec.#namespace, shape.tag);
    element.setAttribute("id", shape.id);
    for (const [key, value] of shape.attributes) element.setAttribute(key, value);
    if (shape.textContent !== undefined) element.appendChild(xml.createTextNode(shape.textContent));
    for (const child of shape.children) this.appendShape(xml, element, child, depth + 1);
    if (shape.children.length) element.appendChild(xml.createTextNode(`\n${"  ".repeat(depth)}`));
    parent.appendChild(element);
  }
}
