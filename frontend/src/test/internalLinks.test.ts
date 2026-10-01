import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = resolve(__dirname, '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

function routePatterns() {
  const app = readFileSync(join(SRC, 'App.tsx'), 'utf8');
  return [...app.matchAll(/path="([^"]+)"/g)].map(([, path]) => {
    const pattern = path
      .replace(/\/\*$/, '(/.*)?')
      .replace(/:[^/]+/g, '[^/]+');
    return new RegExp(`^${pattern}$`);
  });
}

describe('internal links', () => {
  it('every static link and navigate() target matches a route', () => {
    const routes = routePatterns();
    const broken: string[] = [];

    for (const file of sourceFiles(SRC)) {
      const source = readFileSync(file, 'utf8');
      const targets = [
        ...source.matchAll(/\b(?:to|href)=["'](\/[^"'#]*)["']/g),
        ...source.matchAll(/navigate\(\s*['"](\/[^'"]*)['"]/g),
      ].map(([, target]) => target.split('?')[0]);

      for (const target of targets) {
        if (!routes.some((route) => route.test(target))) {
          broken.push(`${file.replace(SRC, 'src')}: ${target}`);
        }
      }
    }

    expect(broken).toEqual([]);
  });

  it('has no placeholder "#" links', () => {
    const placeholders = sourceFiles(SRC).filter((file) => /href=["']#["']/.test(readFileSync(file, 'utf8')));
    expect(placeholders).toEqual([]);
  });
});
