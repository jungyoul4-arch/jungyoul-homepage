declare global {
  interface CloudflareEnv {
    DB: D1Database;
    JWT_SECRET: string;
    IMAGES_BUCKET: R2Bucket;
    LOGIN_RATE_LIMITER: RateLimiter;
    // 어드민 PDF→HTML 추출용 비전 LLM 키. 미설정 시 /api/admin/pdf-convert 가 503 반환.
    ANTHROPIC_API_KEY?: string;
  }
}

export {};
