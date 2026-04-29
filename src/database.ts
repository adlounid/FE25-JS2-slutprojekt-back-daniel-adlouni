
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Database } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DB_PATH
    ? path.resolve(process.cwd(), process.env.DB_PATH)
    : path.resolve(__dirname, '..', 'Data', 'db.json');

export async function readDB(): Promise<Database> {
    const file = await fs.readFile(dbPath, 'utf-8');
    return JSON.parse(file) as Database;
}

export async function writeDB(data: Database): Promise<void> {
    await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf-8');
}
