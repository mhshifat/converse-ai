import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Use DIRECT_URL for migrations (Neon direct connection); app runtime uses DATABASE_URL (pooled) from env.
    url: env('DIRECT_URL') ?? env('DATABASE_URL'),
  },
});
