declare global {
  interface CloudflareEnv {
    DB: D1Database;
    JWT_SECRET: string;
  }
}

export {};
