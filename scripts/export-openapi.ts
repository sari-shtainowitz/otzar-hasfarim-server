/** כותב את תיעוד ה־API לקובץ docs/openapi.json. הרצה: npm run openapi:export */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { openApiDocument } from '../src/docs/openapi';

const outDir = join(__dirname, '..', 'docs');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'openapi.json'), JSON.stringify(openApiDocument, null, 2) + '\n', 'utf8');
console.log('✅ docs/openapi.json נוצר');
