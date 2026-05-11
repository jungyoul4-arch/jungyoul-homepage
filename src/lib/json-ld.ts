export function renderJsonLd(schema: unknown): { __html: string } {
  return { __html: JSON.stringify(schema).replace(/</g, "\\u003c") };
}
