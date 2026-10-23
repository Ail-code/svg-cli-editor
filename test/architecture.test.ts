import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, basename, relative, resolve } from "node:path";

test("source imports obey the documented module dependency directions", () => {
  const root = resolve("src");
  const files: string[] = [];
  const visit = (directory: string): void => {
    for (const item of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, item.name);
      if (item.isDirectory()) visit(path); else if (item.name.endsWith(".ts")) files.push(path);
    }
  };
  visit(root);
  const allowed: Readonly<Record<string, readonly string[]>> = {
    domain: ["domain"], application: ["application", "domain"],
    cli: ["cli", "application", "domain"], infrastructure: ["infrastructure", "application", "domain"],
  };
  for (const file of files) {
    const module = relative(root, file).split("/")[0]!;
    if (module === "Main.ts") continue;
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/\bfrom\s+["']([^"']+)["']/g)) {
      const dependency = match[1]!;
      if (!dependency.startsWith(".")) {
        assert.ok(module === "infrastructure" || (module === "cli" && dependency.startsWith("node:")), `${file}: external dependency ${dependency}`);
      } else {
        const target = relative(root, resolve(file, "..", dependency)).split("/")[0]!;
        assert.ok(allowed[module]?.includes(target), `${file} → ${dependency}`);
      }
    }
  }
});

test("every source file declares at most one class and its filename matches", () => {
  const visit = (directory: string): void => {
    for (const item of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, item.name);
      if (item.isDirectory()) { visit(path); continue; }
      if (!path.endsWith(".ts")) continue;
      const names = [...readFileSync(path, "utf8").matchAll(/^export\s+(?:abstract\s+)?class\s+(\w+)/gm)].map(match => match[1]);
      assert.ok(names.length <= 1, `${path}: multiple classes`);
      if (names.length) assert.equal(basename(path, ".ts"), names[0]);
    }
  };
  visit(resolve("src"));
});
