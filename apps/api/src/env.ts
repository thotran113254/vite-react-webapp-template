import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// Load .env from root of monorepo
config({ path: resolve(__dirname, "../../../.env") });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

export const env = {
  // Required
  DATABASE_URL: requireEnv("DATABASE_URL"),
  JWT_ACCESS_SECRET: requireEnv("JWT_ACCESS_SECRET"),
  JWT_REFRESH_SECRET: requireEnv("JWT_REFRESH_SECRET"),

  // Optional with defaults
  API_PORT: parseInt(optionalEnv("API_PORT", "3001"), 10),
  API_PREFIX: optionalEnv("API_PREFIX", "/api/v1"),
  CORS_ORIGINS: optionalEnv("CORS_ORIGINS", "http://localhost:3002").split(","),
  JWT_ACCESS_EXPIRES_IN: optionalEnv("JWT_ACCESS_EXPIRES_IN", "15m"),
  JWT_REFRESH_EXPIRES_IN: optionalEnv("JWT_REFRESH_EXPIRES_IN", "7d"),

  // Redis (optional)
  REDIS_HOST: optionalEnv("REDIS_HOST", "localhost"),
  REDIS_PORT: parseInt(optionalEnv("REDIS_PORT", "6379"), 10),
  REDIS_PASSWORD: process.env["REDIS_PASSWORD"],

  // Rate limiting
  RATE_LIMIT_MAX: parseInt(optionalEnv("RATE_LIMIT_MAX", "100"), 10),
  RATE_LIMIT_WINDOW_MS: parseInt(optionalEnv("RATE_LIMIT_WINDOW_MS", "60000"), 10),

  // Gemini AI
  GEMINI_API_KEY: optionalEnv("GEMINI_API_KEY", ""),

  // Logging
  LOG_LEVEL: optionalEnv("LOG_LEVEL", "info"),

  // Node environment
  NODE_ENV: optionalEnv("NODE_ENV", "development"),
} as const;

export type Env = typeof env;
