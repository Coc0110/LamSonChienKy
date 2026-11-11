import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  if ((specifier.startsWith('.') || specifier.startsWith('/')) && context.parentURL && !/\.[a-z]+$/i.test(specifier)) {
    const base = new URL(specifier, context.parentURL);
    for (const suffix of ['.ts', '.tsx', '/index.ts']) {
      const candidate = new URL(base.href + suffix);
      const p = fileURLToPath(candidate);
      if (existsSync(p) && statSync(p).isFile()) return nextResolve(candidate.href, context);
    }
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.json')) {
    return nextLoad(url, { ...context, format: 'json', importAttributes: { type: 'json' } });
  }
  return nextLoad(url, context);
}
