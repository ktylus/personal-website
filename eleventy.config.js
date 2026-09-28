export default function (config) {
  config.setNunjucksEnvironmentOptions({ autoescape: true });
  config.addPassthroughCopy({ "src/assets": "assets", "src/files": "files" });
  config.addPassthroughCopy({ "node_modules/mermaid/dist/mermaid.min.js": "assets/vendor/mermaid.min.js" });
  config.amendLibrary("md", markdown => {
    const defaultFence = markdown.renderer.rules.fence;
    markdown.renderer.rules.fence = (tokens, index, options, env, self) => {
      const token = tokens[index];
      if (token.info.trim() === "mermaid") {
        return `<pre class="mermaid">${markdown.utils.escapeHtml(token.content)}</pre>\n`;
      }
      return defaultFence(tokens, index, options, env, self);
    };
    // Give headings slug ids so in-page links to markdown sections resolve.
    const slugify = config.getFilter("slugify");
    markdown.renderer.rules.heading_open = (tokens, index, options, env, self) => {
      tokens[index].attrSet("id", slugify(tokens[index + 1].content));
      return self.renderToken(tokens, index, options);
    };
  });
  config.addFilter("readableDate", value => new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC"
  }).format(new Date(value)));
  config.addFilter("numericDate", value => {
    const date = new Date(value);
    return [date.getUTCDate(), date.getUTCMonth() + 1, date.getUTCFullYear()]
      .map((part, index) => index < 2 ? String(part).padStart(2, "0") : part)
      .join(".");
  });
  config.addFilter("year", value => new Date(value).getUTCFullYear());
  config.addCollection("projects", api => api.getFilteredByGlob("src/projects/*.md")
    .filter(item => !item.data.draft).sort((a, b) => (a.data.order ?? 99) - (b.data.order ?? 99)));
  config.addCollection("writing", api => api.getFilteredByGlob("src/writing/*.md")
    .filter(item => !item.data.draft).sort((a, b) => b.date - a.date));
  return { dir: { input: "src", output: "_site" }, markdownTemplateEngine: false, htmlTemplateEngine: "njk" };
}
