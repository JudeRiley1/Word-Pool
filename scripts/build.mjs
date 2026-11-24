import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const files = ['index.html', 'styles.css', 'app.js', 'engine.js', 'sharing.js', 'progression.js', 'effects.js', 'tutorial.js', 'puzzles.js', 'favicon.svg', '.nojekyll'];

export async function buildSite(output = resolve(root, 'public')) {
  const sources = await Promise.all(files.map(async name => (await readFile(resolve(root, name), 'utf8')).replace(/\r\n/g, '\n')));
  const version = createHash('sha256').update(sources.join('\0')).digest('hex').slice(0, 12);
  await mkdir(output, { recursive: true });
  for (const [index, name] of files.entries()) {
    let content = sources[index];
    if (name.endsWith('.js')) {
      // Every import in the graph uses the same release, including shared modules.
      content = content.replace(/(from\s+['"])(\.\/[^'"]+\.js)(['"])/g, `$1$2?v=${version}$3`);
    } else if (name === 'index.html') {
      content = content.replace(/((?:src|href)=["'])(\.\/(?:app\.js|styles\.css|favicon\.svg))(["'])/g, `$1$2?v=${version}$3`);
      content = content.replace('</head>', `  <meta name="application-version" content="${version}">\n</head>`);
    }
    await writeFile(resolve(output, name), content);
  }
  await cp(resolve(root, 'assets'), resolve(output, 'assets'), { recursive: true });
  return version;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Built Letter Relay release ${await buildSite()}`);
}
