import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { buildSite } from '../scripts/build.mjs';

test('deployment versions HTML assets and the entire module graph together', async () => {
  const output = await mkdtemp(join(tmpdir(), 'letter-relay-build-'));
  try {
    const version = await buildSite(output);
    const html = await readFile(join(output, 'index.html'), 'utf8');
    assert.ok(html.includes(`./app.js?v=${version}`));
    assert.ok(html.includes(`./styles.css?v=${version}`));
    assert.ok(html.includes(`./pool.css?v=${version}`));
    assert.ok(html.includes(`name="application-version" content="${version}"`));
    for (const name of (await readdir(output)).filter(n => n.endsWith('.js'))) {
      const js = await readFile(join(output, name), 'utf8');
      for (const [, path] of js.matchAll(/from\s+['"](\.\/[^'"]+)['"]/g)) {
        assert.ok(path.endsWith(`?v=${version}`), `${name}: unversioned import ${path}`);
        await readFile(join(output, path.split('?')[0]));
      }
    }
    assert.ok(!(await readFile(join(output, 'app.js'), 'utf8')).includes('slot-line'));
    await readFile(join(output, 'assets/fonts/nunito-latin.woff2'));
    await readFile(join(output, 'assets/platypus-pool.png'));
    assert.equal(await buildSite(output), version, 'Identical source produces the same version');
  } finally {
    assert.equal(dirname(resolve(output)), resolve(tmpdir()));
    assert.ok(basename(output).startsWith('letter-relay-build-'));
    await rm(output, { recursive: true, force: true });
  }
});
