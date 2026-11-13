#!/usr/bin/env node
/**
 * T0104: export committed JSON Schema artifacts from the Zod source (ADR-005).
 * Committed + CI-synced: `pnpm --filter @sus/schemas export` regenerates,
 * `test:sync` fails when the committed file drifts from the source.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { z } = require('zod');
// tsx-free approach: import the compiled dist
const dist = join(process.cwd(), 'dist', 'index.js');
const { SUS_SCHEMA_REGISTRY } = await import(dist);

const outDir = join(process.cwd(), 'json-schema');
mkdirSync(outDir, { recursive: true });

for (const sus of SUS_SCHEMA_REGISTRY) {
  const json = z.toJSONSchema(sus.schema, { io: 'input' });
  json.$id = sus.$id;
  json['x-sus-version'] = sus.version;
  const file = join(outDir, `${sus.$id}.v${sus.version}.schema.json`);
  writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
  console.log(`wrote ${file}`);
}
