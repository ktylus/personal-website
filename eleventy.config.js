export default function (config) {
  config.setNunjucksEnvironmentOptions({ autoescape: true });
  config.addPassthroughCopy({ "src/assets": "assets", "src/files": "files" });
  config.addFilter("readableDate", value => new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC"
  }).format(new Date(value)));
  config.addFilter("year", value => new Date(value).getUTCFullYear());
  config.addCollection("projects", api => api.getFilteredByGlob("src/projects/*.md")
    .filter(item => !item.data.draft).sort((a, b) => (a.data.order ?? 99) - (b.data.order ?? 99)));
  config.addCollection("writing", api => api.getFilteredByGlob("src/writing/*.md")
    .filter(item => !item.data.draft).sort((a, b) => b.date - a.date));
  return { dir: { input: "src", output: "_site" }, markdownTemplateEngine: false, htmlTemplateEngine: "njk" };
}
