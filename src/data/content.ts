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

/**
 * Public Figma file with the written case studies. Verified reachable and
 * publicly shared — Figma's oEmbed returns real metadata ("Proof of Work —
 * Case Studies") and a live thumbnail, so the share link is genuinely open and
 * not just working for a logged-in author.
 */
export const CASE_STUDIES_URL =
  'https://www.figma.com/design/XOXzSuF0FoFLMTEdxcz0e9/Proof-of-Work--Case-Studies?node-id=0-1'

export const SOCIALS = [
  { label: 'GitHub', href: 'https://github.com/apurvapatode' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/apurva-patode/' },
  { label: 'Scholarlify', href: 'https://scholarlify.com' },
  { label: 'Maponomy', href: 'https://planner.maponomy.com/' },
  { label: 'Case studies', href: CASE_STUDIES_URL },
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
    year: 'April 2024 — Present',
    discipline: ['React', 'Vite', 'JavaScript', 'FastAPI', 'SEO'],
    summary:
      'A scholarship platform serving 5,000+ Indian students, and I am the frontend team — the public React + Vite site plus three separate dashboards for admins, students and partners, covering onboarding, document verification and application tracking. Around 70% of every frontend repo is mine, written to be handed over: I also review the interns\' PRs against it. When the backend blocked me I built the FastAPI endpoints myself rather than wait.',
    metric: { value: '5k+', label: 'active users served' },
    accent: '#d7ff3e',
    href: 'https://scholarlify.com',
  },
  {
    id: 'maponomy',
    title: 'Maponomy',
    client: 'Potters Tech · Frontend Developer',
    year: 'April 2026 — Present',
    discipline: ['Next.js', 'TypeScript', 'Turborepo', 'Analytics UI'],
    summary:
      'A distributed team of ten building a delivery-planning platform as a Next.js + TypeScript monorepo, and I was handed the internal admin portal to lead — client management, roles, routing, system-ops and a combined stats dashboard — plus the analytics surface customers actually see. Pages that fired a request per widget now make one combo call, behind route-level skeletons, so the portal stopped feeling slow under real data rather than only in a demo.',
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
      'The site you are on. A hand-written WebGL engine runs the raymarched fluid behind the hero — no three.js — under a layer of smooth scroll, custom cursor and magnetic hover. The point is that it holds 60fps and still passes an audit: reduced-motion users get a static frame, every control is keyboard-reachable, and the markup is semantic underneath the effects. Open the shader editor in the hero corner and change the source live if you want to check.',
    metric: { value: '60fps', label: 'GPU-driven hero' },
    accent: '#ff4d2e',
    href: 'https://github.com/apurvapatode/portfolio',
  },
  {
    id: 'case-studies',
    title: 'Figma → Production',
    client: 'Written case studies',
    year: '2022',
    discipline: ['Responsive', 'Cross-browser', 'CSS'],
    summary:
      'Written case studies on turning Figma files into production pages — the handoff problems that actually cost time, the responsive and cross-browser fixes they needed, and what I would do differently now. Open it if you want to see how I think through a build before you brief me on one.',
    metric: { value: 'Read', label: 'the written case studies' },
    accent: '#4ac3ff',
    href: CASE_STUDIES_URL,
  },
]

export type Service = {
  title: string
  body: string
  tags: string[]
  /**
   * Turnaround, not price. Pricing stays out of the public copy on purpose —
   * the work is worth more than a low anchor implies, and scope varies too
   * much to quote blind. But "how fast" is the question that actually blocks
   * an enquiry, and answering it costs no anchor.
   */
  turnaround: string
  /** Prefills the enquiry form's work-type select via the #contact deep link. */
  cta: string
}

/**
 * Ordered by ascending scope — a same-week fix through to a full interactive
 * build — so the list reads as a ladder the reader can place themselves on,
 * rather than an undifferentiated menu. Keep it at four: the grid is two
 * columns, and a fifth card strands an orphan in a half-width row.
 */
export const SERVICES: Service[] = [
  {
    title: 'Website fixes & small jobs',
    body: 'Something is broken, misaligned on mobile, or has sat on the backlog for months because it is too small to staff. Send it over. Most fixes are quoted the same day, there is no minimum, and if it turns out to be a ten-minute job I will tell you that instead of scoping it into a project.',
    tags: ['Bug fixes', 'Responsive', 'Quick turnaround', 'No minimum'],
    turnaround: 'Quoted same day · done in a week',
    cta: 'A fix or small change',
  },
  {
    title: 'Rebuilds, performance & SEO',
    body: 'Your site is slow, breaks on phones, or nobody left on the team can safely change it. I rebuild it in Next.js or Vite with TypeScript and fix what is genuinely costing you load time — not whatever is easiest to point at. You get the Lighthouse numbers from before and after, so the improvement is something you can see rather than take on trust, and a documented handover so the next person to touch it does not have to be me.',
    tags: ['Next.js', 'TypeScript', 'Core Web Vitals', 'WCAG', 'Lighthouse'],
    turnaround: 'Typically 3—6 weeks',
    cta: 'A full site build or rebuild',
  },
  {
    title: 'High-end interactive builds',
    body: 'WebGL hero sections, GLSL shader effects and motion design for brand and portfolio sites. Work like this usually arrives slow, unusable on a phone and invisible to a screen reader — that is the tradeoff I build against, not the one I accept. It has to survive a Lighthouse audit as well as a design review. This site is the working example, and the shader editor in the hero is open if you want to inspect it.',
    tags: ['WebGL', 'GLSL', 'Motion', 'Kinetic Type'],
    turnaround: 'Scoped per project',
    cta: 'A full site build or rebuild',
  },
  {
    title: 'Ongoing support',
    body: 'For teams without a frontend person: changes, fixes and dependency upkeep handled as they come up, so the small things stop queueing until they become a rescue project. Monthly retainer or a block of hours you draw down, cancellable either way — if a quiet month means you did not need me, that is the arrangement working, not something you should be billed for.',
    tags: ['Retainer', 'Maintenance', 'Dependency upkeep', 'On call'],
    turnaround: 'Monthly retainer or hourly',
    cta: 'Ongoing support',
  },
]

export const PROCESS = [
  {
    phase: 'Scope',
    body: 'A working session on goals, constraints and what "done" actually means, then a written scope with a fixed price before anything is built. If the scope later changes, that is a conversation and a new number — not a line item you discover on the invoice.',
  },
  {
    phase: 'Prototype',
    body: 'The riskiest screen first, clickable and in your hands. The hard interaction questions get settled while they are still cheap to change, which is the difference between a redesign in week two and a rebuild in week six.',
  },
  {
    phase: 'Build',
    body: 'Weekly deploys to a staging URL you can open whenever you like. You watch it come together and can redirect early, instead of waiting for a reveal at the end and hoping it matches what you had in mind.',
  },
  {
    phase: 'Ship & support',
    body: 'Launch, a performance and accessibility audit against real numbers, and a handover doc written for whoever maintains it next. Thirty days of bug support included — if something I built breaks in that window, fixing it is not a new engagement.',
  },
]

export const CAPABILITIES = [
  'Next.js', 'TypeScript', 'React', 'Vite', 'Tailwind v4', 'Redux',
  'WebGL / GLSL', 'REST APIs', 'FastAPI', 'PostgreSQL', 'Docker',
  'Claude Code', 'Accessibility', 'Performance', 'Figma',
]

/**
 * Ordered strongest first. Reach and responsibility are the numbers that answer
 * "can this person be trusted with my project"; tenure is the weakest of the
 * three and reads as a hedge when it leads, so it goes last and is framed as
 * production shipping rather than time served.
 */
export const STATS = [
  { value: '5k+', label: 'Users on platforms I build for' },
  { value: '10', label: 'Person team — I lead the admin portal' },
  { value: '2+', label: 'Years shipping to production' },
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
    a: 'I run Claude Code in the build loop for scoping, refactors and typechecked releases, which is why timelines and costs come in lower than they would otherwise. What it does not mean is generated code shipped unread. Every line goes out under my review, the architecture decisions are mine, and I am the one on the hook when something breaks at 2am.',
  },
  {
    q: 'How fast can you start?',
    a: 'Usually within two weeks. If a project is urgent, say so in the first message and I will tell you honestly whether I can hit your date.',
  },
  {
    q: 'Do you work with existing teams?',
    a: 'Often — it is most of what I do. I embed alongside in-house developers, match the conventions already in the repo rather than importing my own, hand over documented components and review PRs. The aim is that nothing breaks when I leave and nobody has to reverse-engineer my decisions.',
  },
  {
    q: 'Why you and not an agency?',
    a: 'You get the person doing the work, not an account manager relaying to a team you never meet. Nothing is lost in translation and there is no markup on top of it. The honest tradeoff: I am one person, so I take on fewer projects at once — if I am booked past your date, I will say so upfront rather than stretch the timeline to hold the work.',
  },
  {
    q: 'What if I already have designs?',
    a: 'Ideal. Send the Figma file and I will build to it, flagging anything that will not survive contact with real content or a small screen before I start rather than after. If you do not have designs, that is workable too — but say so early, because it changes the scope and the price.',
  },
]
