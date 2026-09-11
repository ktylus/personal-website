import assert from "node:assert/strict";
import { readFile, readdir, access, writeFile, unlink } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "_site");
const build = () => execFileSync(process.execPath, ["scripts/build.mjs"], { cwd: root, stdio: "inherit" });
const exists = async file => access(file).then(() => true, () => false);
const fixture = path.join(root, "src/writing/content-check-fixture.md");
assert.equal(await exists(fixture), false, "Refusing to overwrite an existing article");
try {
  await writeFile(fixture, '---\ntitle: Content check fixture\ndescription: Publishing check\ndate: 2026-09-07\ndraft: false\n---\n\n## Markdown heading\n\nA **formatted** paragraph.\n');
  build();
  const publishedPath = path.join(output, "writing/content-check-fixture/index.html");
  assert.match(await readFile(publishedPath, "utf8"), /<strong>formatted<\/strong>/);
  assert.match(await readFile(path.join(output, "index.html"), "utf8"), /Content check fixture/);
  const homepage = await readFile(path.join(output, "index.html"), "utf8");
  assert.match(homepage, /href="https:\/\/github\.com\/ktylus\/chess_opening_assistant"[^>]*>GitHub/);
  assert.match(homepage, /href="https:\/\/chess\.kamiltylus\.com"[^>]*>Live app/);
  const project = await readFile(path.join(output, "projects/chess-opening-assistant/index.html"), "utf8");
  assert.match(project, /Published: 11\.09\.2026/);
  assert.doesNotMatch(project, /Last updated: 11\.09\.2026/);
  assert.match(project, /<pre class="mermaid">flowchart TD/);
  assert.match(project, /src="\/assets\/vendor\/mermaid\.min\.js"/);
  assert.equal(await exists(path.join(output, "assets/vendor/mermaid.min.js")), true);
  await writeFile(fixture, (await readFile(fixture, "utf8")).replace("draft: false", "draft: true"));
  build();
  assert.equal(await exists(publishedPath), false, "Unpublished article must be removed from output");
  assert.doesNotMatch(await readFile(path.join(output, "index.html"), "utf8"), /Content check fixture/);
} finally {
  await unlink(fixture);
  build();
}

async function checkLinks(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await checkLinks(file);
    else if (entry.name.endsWith(".html")) {
      const html = await readFile(file, "utf8");
      assert.doesNotMatch(html, /aria-disabled="true"/, "Placeholder links must not be published");
      for (const [, href] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
        if (/^(?:https?:|mailto:|data:)/.test(href)) continue;
        const [pathname, fragment] = href.split("#");
        let target = pathname ? path.resolve(pathname.startsWith("/") ? output : path.dirname(file), `.${pathname.startsWith("/") ? pathname : `/${pathname}`}`) : file;
        if (pathname.endsWith("/")) target = path.join(target, "index.html");
        assert.ok(await exists(target), `Missing local destination: ${href} in ${file}`);
        if (fragment) assert.ok((await readFile(target, "utf8")).includes(`id="${fragment}"`), `Missing anchor: ${href}`);
      }
    }
  }
}
await checkLinks(output);
console.log("Passed: Markdown publishing, draft removal, homepage listings, and all generated local links.");
