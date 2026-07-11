/**
 * Seed sample CMS sections + success stories for local development.
 * Usage: node scripts/seedPhase1Content.js
 */

import prisma from '../src/config/database.js';

async function main() {
  const existingCms = await prisma.cmsSection.count();
  if (existingCms === 0) {
    await prisma.cmsSection.createMany({
      data: [
        {
          pageSlug: 'landing',
          sectionKey: 'HERO',
          title: 'Launch your career with confidence',
          subtitle: 'Placement-ready training, mock interviews, and top recruiters — all in one portal.',
          ctaLabel: 'Get Started',
          ctaUrl: '#login',
          sortOrder: 0,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          meta: JSON.stringify({ secondaryCtaLabel: 'Explore Opportunities', secondaryCtaUrl: '#partners' }),
        },
        {
          pageSlug: 'landing',
          sectionKey: 'STATS',
          title: 'Placement Highlights',
          sortOrder: 1,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          meta: JSON.stringify({
            stats: [
              { label: 'Highest Package', value: '₹45 LPA' },
              { label: 'Students Placed', value: '2,500+' },
              { label: 'Hiring Partners', value: '180+' },
            ],
          }),
        },
        {
          pageSlug: 'landing',
          sectionKey: 'FAQ',
          title: 'How do I apply to jobs?',
          body: 'Complete your profile, upload a resume, then apply from Explore Jobs. Eligibility is checked automatically.',
          sortOrder: 10,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          meta: JSON.stringify({ category: 'Students' }),
        },
        {
          pageSlug: 'landing',
          sectionKey: 'FOOTER',
          title: 'PWIOI Placement Portal',
          body: 'Empowering students with career-ready skills and industry connections.',
          sortOrder: 99,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          meta: JSON.stringify({
            email: 'placements@pwioi.com',
            phone: '+91-00000-00000',
          }),
        },
      ],
    });
    await prisma.cmsVersion.create({
      data: {
        pageSlug: 'landing',
        version: 1,
        label: 'Initial seed publish',
        snapshot: '[]',
      },
    });
    console.log('✅ Seeded CMS sections');
  } else {
    console.log('ℹ️  CMS sections already present, skipping');
  }

  const existingStories = await prisma.successStory.count();
  if (existingStories === 0) {
    await prisma.successStory.createMany({
      data: [
        {
          type: 'STUDENT_SUCCESS',
          title: 'From campus to product engineering',
          description: 'Secured an SDE role after intensive mock interviews and coding assessments.',
          studentName: 'Aarav Mehta',
          company: 'NovaTech',
          jobRole: 'SDE-1',
          packageCtc: '18 LPA',
          campus: 'Bangalore',
          batch: '2025',
          branch: 'CSE',
          tags: JSON.stringify(['SDE', 'Product']),
          status: 'PUBLISHED',
          featured: true,
          sortOrder: 0,
          publishedAt: new Date(),
        },
        {
          type: 'COMPANY_HIRING',
          title: 'How BrightLabs hired 12 interns in one drive',
          description: 'A structured screening + assessment pipeline delivered high-signal candidates.',
          company: 'BrightLabs',
          jobRole: 'Software Intern',
          tags: JSON.stringify(['Internship', 'Hiring']),
          status: 'PUBLISHED',
          featured: true,
          sortOrder: 1,
          publishedAt: new Date(),
        },
        {
          type: 'ALUMNI',
          title: 'Alumni spotlight: scaling growth at FinEdge',
          description: 'An alumni journey from placement cell volunteer to growth lead.',
          studentName: 'Isha Kapoor',
          company: 'FinEdge',
          jobRole: 'Growth Lead',
          packageCtc: '24 LPA',
          tags: JSON.stringify(['Alumni']),
          status: 'PUBLISHED',
          featured: false,
          sortOrder: 2,
          publishedAt: new Date(),
        },
      ],
    });
    console.log('✅ Seeded success stories');
  } else {
    console.log('ℹ️  Success stories already present, skipping');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
