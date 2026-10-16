import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const EXAMPLES = resolve(dirname(fileURLToPath(import.meta.url)), "..", "examples");

test("example builds reach the kit only through paths publish.mjs can rewrite", () => {
  for (const name of readdirSync(EXAMPLES)) {
    for (const file of readdirSync(join(EXAMPLES, name)).filter((file) => file.endsWith(".mjs"))) {
      const text = readFileSync(join(EXAMPLES, name, file), "utf8");
      assert.doesNotMatch(text, /join\([^)]*["']\.\.["']/, `${name}/${file} builds a path out of its folder with join(…, ".."); write it as one quoted literal, e.g. new URL("../../kit/x.mjs", import.meta.url)`);
    }
  }
});
