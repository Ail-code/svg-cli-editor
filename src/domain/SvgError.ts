export class SvgError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SvgError";
  }
}
