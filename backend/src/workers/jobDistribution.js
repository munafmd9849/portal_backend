// /**
//  * Job Distribution Worker
//  * Processes job distribution to targeted students
//  * Replaces: addJobToRelevantStudents() from jobs.js
//  */

// import { Worker } from 'bullmq';
// import prisma from '../config/database.js';
// import redis, { isRedisAvailable } from '../config/redis.js';

// // Only create worker if Redis is available
// let worker = null;

// async function createWorker() {
//   const available = await isRedisAvailable();
//   if (!available) {
//     console.warn('⚠️ Redis not available, job distribution worker disabled');
//     return null;
//   }

//   return new Worker(
//     'job-distribution',
//     async (job) => {
//       const { jobId, jobData, targeting } = job.data;

//       console.log(`🎯 Starting job distribution for job ${jobId}`);

//       try {
//         // Build where clause for student filtering
//         const where = {};

//         // School filtering
//         if (targeting.targetSchools && targeting.targetSchools.length > 0) {
//           if (!targeting.targetSchools.includes('ALL')) {
//             where.school = { in: targeting.targetSchools };
//           }
//         }

//         // Center filtering
//         if (targeting.targetCenters && targeting.targetCenters.length > 0) {
//           if (!targeting.targetCenters.includes('ALL')) {
//             where.center = { in: targeting.targetCenters };
//           }
//         }

//         // Batch filtering
//         if (targeting.targetBatches && targeting.targetBatches.length > 0) {
//           if (!targeting.targetBatches.includes('ALL')) {
//             where.batch = { in: targeting.targetBatches };
//           }
//         }

//         // Get matching students
//         const students = await prisma.student.findMany({
//           where,
//           select: {
//             id: true,
//             userId: true,
//             fullName: true,
//             school: true,
//             center: true,
//             batch: true,
//           },
//         });

//         console.log(`📊 Found ${students.length} matching students`);

//         // Create job tracking entries in batches
//         const batchSize = 100;
//         let processed = 0;

//         for (let i = 0; i < students.length; i += batchSize) {
//           const batch = students.slice(i, i + batchSize);

//           const trackingData = batch.map(student => ({
//             studentId: student.id,
//             jobId,
//             isNew: true,
//             viewed: false,
//           }));

//           // Use createMany for better performance
//           await prisma.jobTracking.createMany({
//             data: trackingData,
//             skipDuplicates: true,
//           });

//           processed += batch.length;
//           console.log(`✅ Processed ${processed}/${students.length} students`);
//         }

//         console.log(`✅ Job ${jobId} distributed to ${students.length} students`);

//         return {
//           success: true,
//           studentsCount: students.length,
//           targeting,
//         };
//       } catch (error) {
//         console.error(`❌ Error distributing job ${jobId}:`, error);
//         throw error;
//       }
//     },
//     {
//       connection: redis,
//       concurrency: 5, // Process 5 jobs concurrently
//     }
//   );
// }

// // Initialize worker (will be null if Redis unavailable)
// createWorker().then(w => {
//   worker = w;
//   if (worker) {
//     worker.on('completed', (job) => {
//       console.log(`✅ Job distribution completed: ${job.id}`);
//     });

//     worker.on('failed', (job, err) => {
//       console.error(`❌ Job distribution failed: ${job?.id}`, err);
//     });
//   }
// });

// export default worker;


/**
 * Job Distribution Worker — FIXED VERSION
 * Processes job distribution to targeted students
 */

import { Worker } from "bullmq";
import prisma from "../config/database.js";
import redis from "../config/redis.js";

const worker = new Worker(
  "job-distribution",
  async (job) => {
    const { jobId, jobData, targeting } = job.data;

    console.log(`🎯 Starting job distribution for job ${jobId}`);

    try {
      // Build where clause for student filtering
      const where = {};

      if (targeting.targetSchools?.length > 0 &&
          !targeting.targetSchools.includes("ALL")) {
        where.school = { in: targeting.targetSchools };
      }

      if (targeting.targetCenters?.length > 0 &&
          !targeting.targetCenters.includes("ALL")) {
        where.center = { in: targeting.targetCenters };
      }

      if (targeting.targetBatches?.length > 0 &&
          !targeting.targetBatches.includes("ALL")) {
        where.batch = { in: targeting.targetBatches };
      }

      // Get matching students
      const students = await prisma.student.findMany({
        where,
        select: {
          id: true,
          userId: true,
          fullName: true,
          school: true,
          center: true,
          batch: true,
        },
      });

      console.log(`📊 Found ${students.length} matching students`);

      // Create job tracking entries in batches
      const batchSize = 100;
      let processed = 0;

      for (let i = 0; i < students.length; i += batchSize) {
        const batch = students.slice(i, i + batchSize);

        await prisma.jobTracking.createMany({
          data: batch.map((student) => ({
            studentId: student.id,
            jobId,
            isNew: true,
            viewed: false,
          })),
          skipDuplicates: true,
        });

        processed += batch.length;
        console.log(`✅ Processed ${processed}/${students.length}`);
      }

      console.log(
        `✅ Job ${jobId} distributed to ${students.length} students`
      );

      return {
        success: true,
        studentsCount: students.length,
        targeting,
      };
    } catch (error) {
      console.error(`❌ Error distributing job ${jobId}:`, error);
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 5,
  }
);

// Worker events
worker.on("completed", (job) =>
  console.log(`✅ Job distribution completed: ${job.id}`)
);

worker.on("failed", (job, err) =>
  console.error(`❌ Job distribution failed: ${job?.id}`, err)
);

export default worker;