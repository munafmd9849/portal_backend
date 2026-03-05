/**
 * Test Redis connection
 * Run: node scripts/testRedisConnection.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Redis from 'ioredis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

async function testRedis() {
  console.log('🔍 Testing Redis connection...\n');
  console.log('REDIS_URL:', process.env.REDIS_URL ? 'Set' : 'Not set');
  console.log('REDIS_HOST:', process.env.REDIS_HOST || 'localhost');
  console.log('REDIS_PORT:', process.env.REDIS_PORT || '6379\n');

  const redis = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, connectTimeout: 5000 })
    : new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: 1,
        connectTimeout: 5000,
      });

  try {
    await redis.ping();
    console.log('✅ Redis PING: OK');

    const testKey = 'portal:health:test';
    await redis.set(testKey, 'ok', 'EX', 10);
    const val = await redis.get(testKey);
    console.log('✅ Redis SET/GET:', val === 'ok' ? 'OK' : 'Failed');
    await redis.del(testKey);

    const info = await redis.info('server');
    const version = info.match(/redis_version:([^\r\n]+)/)?.[1] || 'unknown';
    console.log('✅ Redis version:', version);

    console.log('\n✅ Redis is working fine!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Redis connection failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Tips:');
      console.error('   - Local: Start Redis with "redis-server" or Docker');
      console.error('   - Upstash: Use rediss:// (with TLS) in REDIS_URL\n');
    }
    process.exit(1);
  } finally {
    redis.disconnect();
  }
}

testRedis();
