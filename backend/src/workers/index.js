// /**
//  * Worker Process Entry Point
//  * Runs BullMQ workers for background job processing
//  * Run separately: npm run worker
//  * Note: Requires Redis to be running
//  */

// import dotenv from 'dotenv';

// dotenv.config();

// // Import workers (they will check Redis availability)
// import jobDistributionWorker from './jobDistribution.js';
// import emailWorker from './emailWorker.js';

// console.log('👷 Workers started');
// console.log('📦 Job distribution worker:', jobDistributionWorker ? 'Running' : 'Disabled (Redis not available)');
// console.log('📧 Email notification worker:', emailWorker ? 'Running' : 'Disabled (Redis not available)');

/**
 * Worker Process Entry Point
 */

import dotenv from "dotenv";
import { createClient } from "redis";

dotenv.config();

async function startWorkers() {
  console.log("🔌 Connecting to Redis...");

  const redis = createClient({
    url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  });

  redis.on("error", (err) => console.error("❌ Redis error:", err));

  await redis.connect();

  console.log("✅ Redis connected");
  console.log("👷 Starting workers...");

  // 🔥 Import AFTER Redis is ready
  const jobDistributionWorker = (await import("./jobDistribution.js")).default;
  const emailWorker = (await import("./emailWorker.js")).default;

  console.log(
    "📦 Job distribution worker:",
    jobDistributionWorker ? "Running" : "Disabled"
  );
  console.log(
    "📧 Email notification worker:",
    emailWorker ? "Running" : "Disabled"
  );
}

startWorkers().catch(console.error);