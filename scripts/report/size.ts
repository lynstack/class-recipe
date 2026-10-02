import { constants, gzipSync } from "node:zlib";
import { rolldown } from "rolldown";

/** The size, in bytes, of the code an app ships for some imports. */
interface Size {
  readonly minified: number;
  readonly gzipped: number;
}

const ENTRY = "entry";
const RESOLVED_ENTRY = "\0entry";

/**
 * Bundles `code`, a module that re-exports what an app imports, minifies it,
 * and returns its size before and after gzip.
 */
async function measureSize(code: string): Promise<Size> {
  const bundle = await rolldown({
    input: ENTRY,
    logLevel: "silent",
    plugins: [
      {
        load: (id: string): string | undefined =>
          id === RESOLVED_ENTRY ? code : undefined,
        name: "entry",
        resolveId: (id: string): string | undefined =>
          id === ENTRY ? RESOLVED_ENTRY : undefined,
      },
    ],
  });
  try {
    const { output } = await bundle.generate({ minify: true });
    let source = "";
    for (const file of output) {
      if (file.type === "chunk") {
        source += file.code;
      }
    }
    const minified = Buffer.from(source);
    return {
      gzipped: gzipSync(minified, { level: constants.Z_BEST_COMPRESSION })
        .length,
      minified: minified.length,
    };
  } finally {
    await bundle.close();
  }
}

export { measureSize };
export type { Size };
