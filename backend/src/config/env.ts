import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env vars
const rootDir = process.cwd();
const envPath = path.join(rootDir, '.env');
const envExamplePath = path.join(rootDir, '.env.example');

if (fs.existsSync(envExamplePath)) {
  dotenv.config({ path: envExamplePath });
}
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true });
}

let databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl && fs.existsSync(envExamplePath)) {
  const exampleContent = fs.readFileSync(envExamplePath, 'utf-8');
  const match = exampleContent.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);
  if (match && match[1]) {
    databaseUrl = match[1].trim();
    process.env.DATABASE_URL = databaseUrl;
  }
}

const envSchema = z.object({
  GEMINI_API_KEY: z.string().optional(),
  APP_URL: z.string().optional().default('http://localhost:3000'),
  DATABASE_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.warn('⚠️ Environment validation errors:', parsed.error.format());
}

export const env = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  APP_URL: process.env.APP_URL || 'http://localhost:3000',
  DATABASE_URL: databaseUrl || process.env.DATABASE_URL,
};
