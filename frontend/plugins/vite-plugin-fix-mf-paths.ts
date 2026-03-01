import type { Plugin } from "vite";

/**
 * Workaround for @module-federation/vite on Windows.
 * The plugin injects a <script> whose src is a raw filesystem path
 * (e.g. /Users/.../node_modules/__mf__virtual/...) instead of a
 * dev-server-relative URL. This plugin rewrites it to a path Vite
 * can actually serve: /node_modules/__mf__virtual/...
 */
export function fixMfDevPaths(): Plugin {
  return {
    name: "fix-mf-dev-paths",
    apply: "serve",
    transformIndexHtml(html) {
      return html.replace(
        /src="([^"]*__mf__virtual[^"]*)"/g,
        (_match, srcPath: string) => {
          const normalized = srcPath.replace(/\\/g, "/");
          const idx = normalized.indexOf("node_modules/__mf__virtual");
          if (idx !== -1) {
            return `src="/${normalized.slice(idx)}"`;
          }
          return _match;
        },
      );
    },
  };
}
