import type { Plugin } from "vite";

interface RemoteConfig {
  type?: string;
  name: string;
  entry: string;
  entryGlobalName?: string;
  shareScope?: string;
}

/**
 * Workaround for @module-federation/vite lazy-import timing bug.
 *
 * The MF plugin writes .__mf__temp/{name}/localSharedImportMap.js at
 * configResolved time with `usedRemotes = []` because remote imports
 * behind React.lazy() haven't been discovered yet. The file is only
 * rewritten when shared-module count changes — never when new remotes
 * are added — so the runtime's init() receives an empty remote list,
 * causing RUNTIME-004 for every lazy-loaded remote.
 *
 * This plugin intercepts the module at transform time and injects the
 * full remote list from the federation config, regardless of discovery
 * order.
 */
export function patchMfRemotes(
  remotes: Record<string, RemoteConfig>,
): Plugin {
  const remotesCode = Object.values(remotes)
    .map(
      (r) => `{
          entryGlobalName: ${JSON.stringify(r.entryGlobalName ?? r.name)},
          name: ${JSON.stringify(r.name)},
          type: ${JSON.stringify(r.type ?? "module")},
          entry: ${JSON.stringify(r.entry)},
          shareScope: ${JSON.stringify(r.shareScope ?? "default")},
        }`,
    )
    .join(",\n");

  return {
    name: "patch-mf-remotes",
    apply: "serve",
    enforce: "post",
    transform(code, id) {
      if (!id.includes("localSharedImportMap")) return;

      const emptyRemotes = /const usedRemotes\s*=\s*\[\s*\]/;
      if (!emptyRemotes.test(code)) return;

      return code.replace(
        emptyRemotes,
        `const usedRemotes = [\n${remotesCode}\n      ]`,
      );
    },
  };
}
