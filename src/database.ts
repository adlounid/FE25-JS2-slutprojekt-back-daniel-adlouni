import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Database } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../data/db.json');

export async function readDB(): Promise<Database> {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
}

export async function writeDB(data: Database): Promise<void> {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}