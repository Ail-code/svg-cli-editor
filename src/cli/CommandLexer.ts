import { SvgError } from "../domain/SvgError.js";
import { Token } from "./Token.js";

export class CommandLexer {
  public tokenize(line: string): Token[] {
    if (line.trimStart().startsWith("#")) return [];
    const tokens: Token[] = [];
    let value = ""; let inQuotes = false; let active = false; let quoted = false;
    for (let index = 0; index < line.length; index++) {
      const character = line[index]!;
      if (inQuotes && character === "\\" && (line[index + 1] === '"' || line[index + 1] === "\\")) {
        value += line[++index]!; continue;
      }
      if (character === '"') { inQuotes = !inQuotes; active = true; quoted = true; continue; }
      if (!inQuotes && /\s/u.test(character)) {
        if (active) { tokens.push(new Token(value, quoted)); value = ""; active = false; quoted = false; }
        continue;
      }
      value += character; active = true;
    }
    if (inQuotes) throw new SvgError("unterminated double quote");
    if (active) tokens.push(new Token(value, quoted));
    return tokens;
  }
}
