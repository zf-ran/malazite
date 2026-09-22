import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import path from 'node:path';

import * as schema from './schema.js';
import { config } from '../config.js';

const sqlite = new Database(
	path.resolve(config.root, config.database.filename),
);
export const db = drizzle({ client: sqlite, schema });
