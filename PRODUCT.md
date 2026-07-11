# Product

## Register

product

## Platform

web

## Users

- **Students** at PWIOI (Physics Wallah Institute of Innovation) preparing for placements: browsing jobs, tracking applications, building resumes, taking assessments, and attending mock interviews.
- **Recruiters** posting jobs, screening candidates, and managing hiring pipelines.
- **Admins / Super Admins** managing student directories, job approvals, assessments, analytics, and campus operations across schools, centers, and batches.

Primary context is task-focused: users log in to complete placement workflows, not to browse marketing content.

## Product Purpose

PWIOI Placement Portal is a full-stack placement management system connecting students, recruiters, and campus administrators. It supports job discovery and applications, interview scheduling, endorsements, assessments, mock interviews, notifications, calendar integration, and analytics.

Success means students can confidently apply and track placements, recruiters can efficiently source candidates, and admins can operate campus-wide placement programs with clear visibility.

## Brand Personality

**Trustworthy, capable, campus-warm**

The product should feel institutional and dependable (students trust it with careers) while remaining approachable for young adults. Dashboards prioritize clarity and density; the public landing page can carry more expressive brand energy without compromising usability.

## Anti-references

- Generic SaaS landing-page clichés (purple gradients, glassmorphism, floating 3D blobs)
- Over-decorated admin dashboards with gratuitous motion or neon accents
- Inconsistent component vocabulary across student, recruiter, and admin surfaces
- AI-slop UI: mismatched form controls, display fonts in data tables, invented affordances for standard tasks

## Design Principles

1. **Task-first clarity** — Every screen should help the user finish a placement-related job quickly.
2. **Earned familiarity** — Use standard patterns (tables, side nav, forms, status badges) that users already know from tools like Notion, Linear, and Stripe.
3. **Institutional trust** — Professional tone, consistent states, and reliable feedback on actions (apply, approve, schedule).
4. **Warm but restrained** — Cream/gold accents on auth and landing; dashboards stay clean with semantic color for status only.
5. **Accessible by default** — WCAG AA contrast, visible focus states, and reduced-motion support.

## Accessibility & Inclusion

- Target **WCAG 2.1 AA** for text contrast and interactive states.
- Support `prefers-reduced-motion` for animations on landing and dashboard surfaces.
- Form errors, empty states, and loading states must be explicit and readable.
- Dense admin tables should remain keyboard-navigable and screen-reader friendly.
