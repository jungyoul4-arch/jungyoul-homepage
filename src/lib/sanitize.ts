import sanitizeHtml from "sanitize-html";

export function sanitizeContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img",
      "iframe",
      "h1",
      "h2",
      "h3",
      "h4",
      "figure",
      "figcaption",
      "br",
      "span",
      "video",
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "alt", "style", "width", "height"],
      iframe: ["src", "style", "allow", "allowfullscreen"],
      div: ["style", "contenteditable"],
      span: ["style"],
      "*": ["class"],
    },
    allowedStyles: {
      "*": {
        "position": [/^relative$|^absolute$/],
        "top": [/^-?\d+/],
        "left": [/^-?\d+/],
        "width": [/^\d+/],
        "height": [/^\d+/],
        "max-width": [/^\d+/],
        "padding-bottom": [/^\d+/],
        "overflow": [/^hidden$/],
        "margin": [/^-?\d+/],
        "border": [/^0$|^none$/],
        "border-radius": [/^\d+/],
        "color": [/^#[0-9a-fA-F]{3,8}$|^rgb/],
        "font-size": [/^\d+/],
        "font-weight": [/^\d+$|^bold$|^normal$/],
        "text-align": [/^left$|^center$|^right$|^justify$/],
        "column-count": [/^\d+$/],
        "column-gap": [/^\d+/],
      },
    },
    allowedIframeHostnames: ["www.youtube.com", "player.vimeo.com"],
    allowedSchemes: ["http", "https", "mailto"],
  });
}
