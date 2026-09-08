// Drafts are omitted both from listings and from generated files.
export default {
  permalink: data => data.draft ? false : data.permalink,
  eleventyExcludeFromCollections: data => Boolean(data.draft)
};
