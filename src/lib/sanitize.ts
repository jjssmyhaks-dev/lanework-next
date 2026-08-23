/**
 * HTML Sanitizer — DOMPurify wrapper for XSS protection.
 */

import DOMPurify from "dompurify";

/**
 * Sanitize HTML string — safe for rendering in React.
 */
export function sanitizeHTML(html: string): string {
  if (typeof window === "undefined") {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
      .replace(/on\w+="[^"]*"/gi, "")
      .replace(/on\w+='[^']*'/gi, "");
  }
  return (DOMPurify as any).sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "b", "i", "u", "em", "strong", "s", "del",
      "sub", "sup", "small", "mark", "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li", "dl", "dt", "dd", "a", "img",
      "pre", "code", "kbd", "table", "thead", "tbody", "tfoot", "tr", "th", "td",
      "div", "span", "blockquote", "hr",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "width", "height", "class"],
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: true,
  });
}

/**
 * Strip ALL HTML — returns plain text only.
 */
export function stripHTML(html: string): string {
  if (typeof window === "undefined") {
    return html.replace(/<[^>]*>/g, "").trim();
  }
  return (DOMPurify as any).sanitize(html, { ALLOWED_TAGS: [] });
}
