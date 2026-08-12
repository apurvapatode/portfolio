/**
 * All site copy lives here. Everything below is drawn from Apurva's real
 * resume — projects, metrics and roles are genuine.
 *
 * Two things worth checking before launch:
 *   1. `email` uses the address from the resume (…01@gmail.com).
 *   2. Project `href`s point at live sites where one exists, otherwise '#'.
 *      Swap in real case-study URLs as you write them.
 */

export const PROFILE = {
  name: 'Apurva Patode',
  role: 'Freelance Frontend Developer',
  tagline: 'Next.js · TypeScript · AI-Assisted Delivery',
  email: 'apurvapatode01@gmail.com',
  phone: '+91 9370209492',
  location: 'Pune, India · Working remote',
  availability: 'Available for new clients',
}

export const SOCIALS = [
  { label: 'GitHub', href: 'https://github.com/apurvapatode' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/apurva-patode/' },
  { label: 'Scholarlify', href: 'https://scholarlify.com' },
]

export type Project = {
  id: string
  title: string
  client: string
  year: string
  discipline: string[]
  summary: string
  metric: { value: string; label: string }
  accent: string
  href: string
}

export const PROJECTS: Project[] = [
  {
    id: 'scholarlify',
    title: 'Scholarlify',
    client: 'EdTech Startup · Founding Team',
    year: '2024 — Present',
    discipline: ['React', 'Vite', 'JavaScript', 'FastAPI', 'SEO'],
    summary:
      'Scholarship platform for Indian students. I own the frontend end to end: the public React + Vite marketing site, and the Admin, Student and Partner dashboards covering onboarding, document verification and application tracking — around 70% of every frontend repo is mine. Also contribute to the FastAPI + PostgreSQL backend, and mentor interns through code review.',
    metric: { value: '5k+', label: 'active users served' },
    accent: '#d7ff3e',
    href: 'https://scholarlify.com',
  },
  {
    id: 'maponomy',
    title: 'Maponomy',
    client: 'Potters Tech · Frontend Developer',
    year: '2025 — Present',
    discipline: ['Next.js', 'TypeScript', 'Turborepo', 'Analytics UI'],
    summary:
      'Delivery-planning platform built by a distributed team as a Next.js + TypeScript monorepo. I lead the internal admin portal — Clients management, roles, routing and system-ops pages, and a combined stats dashboard — and build the analytics and reporting surface on the client portal. Cut page loads to single combo-endpoint requests and shipped route-level loading skeletons.',
    metric: { value: 'Admin', label: 'portal lead · team of 10' },
    accent: '#6d4aff',
    href: 'https://planner.maponomy.com/',
  },
  {
    id: 'portfolio',
    title: 'WebGL Experience Site',
    client: 'Personal Project',
    year: '2026',
    discipline: ['WebGL', 'GLSL', 'Vite', 'Motion'],
    summary:
      'A custom WebGL engine driving a raymarched fluid shader hero, plus an interaction layer of smooth scroll, custom cursor and reusable magnetic hover hooks. Built on a Tailwind v4 design-token system and shipped accessible — reduced-motion fallbacks, keyboard navigation, semantic markup.',
    metric: { value: '60fps', label: 'GPU-driven hero' },
    accent: '#ff4d2e',
    href: '#',
  },
  {
    id: 'technoworld',
    title: 'Figma → Production',
    client: 'Technoworld Solutions · Internship',
    year: '2022',
    discipline: ['Responsive', 'Cross-browser', 'CSS'],
    summary:
      'Converted Figma designs into pixel-accurate responsive pages and resolved cross-browser compatibility issues across the marketing surface.',
    metric: { value: 'Pixel', label: 'accurate handoff' },
    accent: '#4ac3ff',
    href: '#',
  },
]

export const SERVICES = [
  {
    title: 'Website fixes & small jobs',
    body: 'Something is broken, misaligned on mobile, or has been on the backlog for months. Send it over — most small fixes are quoted the same day and done inside a week, with no minimum engagement.',
    tags: ['Bug fixes', 'Responsive', 'Quick turnaround', 'No minimum'],
  },
  {
    title: 'Website rebuilds',
    body: 'Your site is slow, breaks on phones, or nobody left can safely change it. I rebuild it in Next.js or Vite with TypeScript and hand it back documented — so the next change is a task, not a rescue project.',
    tags: ['Next.js', 'Vite', 'TypeScript', 'Responsive'],
  },
  {
    title: 'Performance, SEO & accessibility',
    body: 'Slow pages lose visitors before they read a word. I profile what is actually costing you load time, fix it, and show you the Lighthouse numbers from before and after — so the improvement is something you can see, not something you take on trust.',
    tags: ['Core Web Vitals', 'SSR', 'WCAG', 'Lighthouse'],
  },
  {
    title: 'High-end interactive builds',
    body: 'WebGL hero sections, GLSL shader effects, and motion design for brand and portfolio sites. Built to survive a Lighthouse audit as well as a design review.',
    tags: ['WebGL', 'GLSL', 'Motion', 'Kinetic Type'],
  },
  {
    title: 'AI-assisted delivery',
    body: 'I run Claude Code in the build loop for scoping, refactors and typechecked releases. You get a shorter timeline and a lower quote — every line still gets reviewed by me before it ships, and the architecture calls stay human.',
    tags: ['Claude Code', 'RAG', 'Refactors', 'Typecheck'],
  },
]

export const PROCESS = [
  {
    phase: 'Scope',
    body: 'A working session on goals, constraints and what "done" means. You get a written scope with a fixed price before anything is built.',
  },
  {
    phase: 'Prototype',
    body: 'The riskiest screen first, clickable. We resolve the hard interaction questions while they are still cheap to change.',
  },
  {
    phase: 'Build',
    body: 'Weekly deploys to a staging URL. You watch it come together instead of waiting for a reveal at the end.',
  },
  {
    phase: 'Ship & support',
    body: 'Launch, a performance and accessibility audit, and a handover doc your team can act on. Thirty days of bug support included.',
  },
]

export const CAPABILITIES = [
  'Next.js', 'TypeScript', 'React', 'Vite', 'Tailwind v4', 'Redux',
  'WebGL / GLSL', 'REST APIs', 'FastAPI', 'PostgreSQL', 'Docker',
  'Claude Code', 'Accessibility', 'Performance', 'Figma',
]

export const STATS = [
  { value: '2+', label: 'Years shipping production' },
  { value: '5k+', label: 'Users on shipped platforms' },
  { value: '3', label: 'Teams shipped for' },
]

/**
 * Real client quotes only. This renders nowhere until the array is non-empty —
 * see App.tsx. Social proof is the strongest conversion lever on a freelance
 * site, but an invented quote attributed to a real company is a liability, not
 * a lever. Ask past clients for two lines on communication, reliability and
 * result; those are the three things prospects actually worry about.
 */
export type Testimonial = {
  quote: string
  name: string
  title: string
}

export const TESTIMONIALS: Testimonial[] = []

export const FAQS = [
  {
    q: 'What does it cost?',
    a: 'It depends on scope, so I quote per project rather than publishing a rate card. Tell me what you need and I will come back with a fixed price in USD — usually the same day for a small fix. No hourly meter, and no surprise invoice at the end.',
  },
  {
    q: 'How does AI-assisted delivery change things?',
    a: 'I run Claude Code in the build loop for scoping, refactors and typechecked releases. That means shorter timelines and lower cost for you — the review, architecture and quality bar stay mine.',
  },
  {
    q: 'How fast can you start?',
    a: 'Usually within two weeks. If a project is urgent, say so in the first message and I will tell you honestly whether I can hit your date.',
  },
  {
    q: 'Do you work with existing teams?',
    a: 'Often. I embed alongside in-house developers, hand over documented components, and review PRs so the work stays maintainable after I leave.',
  },
]
