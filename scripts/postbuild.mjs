// Post-build script: generate routes-manifest.json for Vercel static export compatibility
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'out');

const manifest = {
  version: 3,
  basePath: '',
  pages404: true,
  trailingSlash: false,
  redirects: [],
  rewrites: [],
  headers: [],
  dynamicRoutes: [],
  staticRoutes: [
    { page: '/', regex: '^/(?:/)?$', routeKeys: {}, namedRegex: '^/(?:/)?$' },
  ],
  dataRoutes: [],
  rsc: { header: 'RSC', varyHeader: 'RSC, Next-Router-State-Tree, Next-Router-Prefetch' },
};

writeFileSync(join(outDir, 'routes-manifest.json'), JSON.stringify(manifest, null, 2));
console.log('✓ Generated routes-manifest.json for Vercel compatibility');
