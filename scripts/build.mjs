import { rm } from "node:fs/promises";
import Eleventy from "@11ty/eleventy";

// Clean generated output so previously published drafts cannot remain online.
const output = new URL("../_site/", import.meta.url);
await rm(output, { recursive: true, force: true });
await new Eleventy().write();
