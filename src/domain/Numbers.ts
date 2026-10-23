import { SvgError } from "./SvgError.js";

export class Numbers {
  public static parse(value: string, name: string): number {
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value)) {
      throw new SvgError(`invalid number for ${name}: ${value}`);
    }
    return this.finite(Number(value), name);
  }

  public static finite(value: number, name: string): number {
    if (!Number.isFinite(value)) throw new SvgError(`${name} must be finite`);
    return Object.is(value, -0) ? 0 : value;
  }

  public static positive(value: number, name: string): number {
    this.finite(value, name);
    if (value <= 0) throw new SvgError(`${name} must be positive`);
    return value;
  }

  public static nonNegative(value: number, name: string): number {
    this.finite(value, name);
    if (value < 0) throw new SvgError(`${name} must be non-negative`);
    return value;
  }
}
