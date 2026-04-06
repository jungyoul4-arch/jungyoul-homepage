declare global {
  interface CloudflareEnv {
    DB: D1Database;
    JWT_SECRET: string;
    IMAGES_BUCKET: R2Bucket;
    LOGIN_RATE_LIMITER: RateLimiter;
  }
}

export {};
