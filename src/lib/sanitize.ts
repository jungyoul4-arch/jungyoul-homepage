import sanitizeHtml from "sanitize-html";

export function sanitizeContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img",
      "iframe",
      "h1",
      "h2",
      "h3",
      "figure",
      "figcaption",
      "br",
      "span",
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "alt", "style", "width", "height"],
      iframe: ["src", "style", "allow", "allowfullscreen"],
      div: ["style", "contenteditable"],
      span: ["style"],
      "*": ["class"],
    },
    allowedIframeHostnames: ["www.youtube.com", "player.vimeo.com"],
    allowedSchemes: ["http", "https", "mailto"],
  });
}
