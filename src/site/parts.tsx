import { motion, useMotionValueEvent, useScroll, useSpring, useTransform } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Project, Snapshot } from '../content/schema';
import { platformLabel, projectLinks, statusLabel } from '../rooms';
import type { Route } from '../routes';
import { Portrait } from '../avatar/Portrait';
import { Count } from './Counters';
import { Wordmark } from '../brand/Wordmark';
import { ACCENTS, HEADLINE, HEADLINE_LOOP, accentFor, headlineText, stackOrder } from './data';
import { Barcode } from './fx/Barcode';
import { DoodleArrow, DoodleWave, Starburst } from './fx/Doodles';
import { Shapes } from './fx/Shapes';
import { Stamp } from './fx/Stamp';
import { WordLoop } from './fx/WordLoop';
import { useMotionOn, useWide } from './motion/context';
import { coverAmount, coverProgress, currentSection } from './motion/helpers';
import { STACK_STEP, canStack, stickyTopFor } from './motion/viewport';
import { Magnetic } from './motion/Magnetic';
import { scrollToTop } from './motion/SmoothScroll';
import { SplitText } from './motion/SplitText';
import { Reveal } from './Reveal';
import { WorkStage } from './WorkStage';

export type LinkFn = (path: string) => string;

const NAV = [
  ['/projects/', 'Projects'],
  ['/crew/', 'Crew'],
  ['/launchpad/', 'Launchpad'],
  ['/about/', 'About'],
  ['/contact/', 'Contact'],
] as const;

const section = (route: Route) =>
  route.name === 'projects' || route.name === 'project'
    ? '/projects/'
    : route.name === 'crew' || route.name === 'member' || route.name === 'certificate'
      ? '/crew/'
      : route.name === 'launchpad'
        ? '/launchpad/'
        : route.name === 'about'
          ? '/about/'
          : route.name === 'contact'
            ? '/contact/'
            : null;

/** The masthead: the wordmark, the issue line and the sections. It tucks away as you scroll down and returns
 * the moment you scroll up. A solid block slides under the link you point at and rests on the current page. */
export function Header({ route, link }: { route: Route; link: LinkFn }) {
  const here = section(route);
  const on = useMotionOn();
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [solid, setSolid] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setSolid(y > 12);
    if (on) setHidden(y > 160 && y > prev);
    if (y < 160 || y < prev) setHidden(false);
  });
  const pill = hover ?? here;
  return (
    <header className={`s-header ${hidden ? 'is-hidden' : ''} ${solid ? 'is-solid' : ''}`}>
      <div className="s-dock">
        <a className="s-brand" href={link('/')} aria-label="Alpha Studios, home">
          <Wordmark />
        </a>
        <p className="s-issue mono" aria-hidden="true">
          Issue 01 · Made at twenty · Nov 2026
        </p>
        <nav aria-label="Main" className="s-nav" onPointerLeave={() => setHover(null)}>
          <ul>
            {NAV.map(([path, label], i) => (
              <li key={path} className={`a-${accentFor(i)}`} onPointerEnter={() => setHover(path)}>
                {pill === path &&
                  (on ? (
                    <motion.span
                      layoutId="nav-pill"
                      className="s-nav-pill"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  ) : (
                    <span className="s-nav-pill" />
                  ))}
                <a href={link(path)} aria-current={here === path ? 'page' : undefined}>
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="s-dock-end">
          <MenuButton link={link} here={here} />
        </div>
      </div>
      <ProgressLine />
    </header>
  );
}

/** A thin line under the header that fills as you read down the page. */
function ProgressLine() {
  const { scrollYProgress } = useScroll();
  const x = useSpring(scrollYProgress, { stiffness: 220, damping: 40 });
  const on = useMotionOn();
  return (
    <motion.span
      className="s-progress"
      aria-hidden="true"
      style={on ? { scaleX: x } : { scaleX: 0 }}
    />
  );
}

/** The phone menu: a button that opens a full-screen overlay. Escape closes it and focus stays inside while open. */
function MenuButton({ link, here }: { link: LinkFn; here: string | null }) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    root.style.overflow = 'hidden';
    const items = () => [...(panel.current?.querySelectorAll<HTMLElement>('a,button') ?? [])];
    items()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'Tab') {
        const list = items();
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const button = opener.current;
    return () => {
      document.removeEventListener('keydown', onKey);
      root.style.overflow = '';
      button?.focus();
    };
  }, [open]);
  const links = [
    ...NAV.filter(([path]) => path !== '/contact/'),
    ['/contact/', 'Say hello'] as const,
  ];
  return (
    <>
      <button
        ref={opener}
        type="button"
        className="s-menu-btn"
        aria-expanded={open}
        aria-controls="s-menu"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="visually-hidden">{open ? 'Close menu' : 'Open menu'}</span>
        <i aria-hidden="true" />
        <i aria-hidden="true" />
      </button>
      {open &&
        createPortal(
          <div
            id="s-menu"
            ref={panel}
            className="s-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <ul>
              {links.map(([path, label], i) => (
                <li
                  key={path}
                  className={`a-${accentFor(i)}`}
                  style={{ '--i': i } as React.CSSProperties}
                >
                  <a
                    href={link(path)}
                    aria-current={here === path ? 'page' : undefined}
                    onClick={() => setOpen(false)}
                  >
                    <span className="mono" aria-hidden="true">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}

export function Footer({ link }: { link: LinkFn }) {
  const cols = [
    [
      'Studio',
      [
        ['/projects/', 'Projects'],
        ['/crew/', 'Crew'],
        ['/about/', 'About'],
      ],
    ],
    [
      'Build with us',
      [
        ['/launchpad/', 'Launchpad'],
        ['/contact/', 'Contact'],
      ],
    ],
  ] as const;
  return (
    <footer className="s-footer">
      <div className="s-wrap s-footer-grid">
        <p className="s-footer-line display">
          Software people rely on, and a home for young builders with something worth finishing.
        </p>
        <nav aria-label="Footer" className="s-footer-nav">
          {cols.map(([title, items]) => (
            <div key={title}>
              <p className="mono">{title}</p>
              <ul>
                {items.map(([path, label]) => (
                  <li key={path}>
                    <a href={link(path)}>{label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <Stamp className="s-footer-stamp" />
      <a className="s-footer-logo" href={link('/')} aria-label="Alpha Studios, home">
        <Wordmark className="wm--mega" />
      </a>
      <div className="s-wrap s-footer-meta">
        <span className="mono s-footer-issue">
          © 2026 Alpha Studios · Issue 01 · Version 1
          <Barcode />
        </span>
        <span className="mono s-footer-credit">
          Post-credit scene: you scrolled all the way down. Go build something.
        </span>
        <button
          type="button"
          className="s-top"
          onClick={() => scrollToTop(false)}
          aria-label="Back to the top"
        >
          <span aria-hidden="true">↑</span> Top
        </button>
      </div>
    </footer>
  );
}

/**
 * The hero is a magazine cover: the headline set huge across the page, the second line on a solid orange block,
 * cover lines in the margin, the issue number turned on its side, and the crew along the bottom edge.
 */
export function Hero({ snap, link }: { snap: Snapshot; link: LinkFn }) {
  const ref = useRef<HTMLElement>(null);
  const on = useMotionOn();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const lineA = useTransform(p, [0, 1], ['0%', '-12%']);
  const lineB = useTransform(p, [0, 1], ['0%', '10%']);

  const platforms = new Set(snap.projects.flatMap((x) => x.platforms)).size;
  const proof = [
    [snap.projects.length, snap.projects.length === 1 ? 'drop shipped' : 'drops shipped'],
    [snap.members.length, 'builders on the crew'],
    [platforms, platforms === 1 ? 'platform' : 'platforms'],
  ] as const;
  const latest = snap.projects[snap.projects.length - 1];

  return (
    <section ref={ref} className="s-hero" aria-labelledby="hero-title">
      <Shapes progress={p} />
      <div className="s-wrap s-hero-top">
        <p className="s-eyebrow mono">Native apps · Web platforms · APIs</p>
        {latest && (
          <a className="s-badge" href={link(`/projects/${latest.slug}/`)}>
            <span className="mono">New drop</span> {latest.name},{' '}
            {statusLabel[latest.status].toLowerCase()} <span aria-hidden="true">→</span>
          </a>
        )}
      </div>
      <h1 id="hero-title" className="display s-hero-title">
        <span className="visually-hidden">{headlineText()}</span>
        <span aria-hidden="true">
          <motion.span className="s-hero-line" style={on ? { x: lineA } : undefined}>
            <SplitText text={HEADLINE[0]} delay={0.1} step={0.06} />
          </motion.span>
          <motion.span className="s-hero-line s-hero-accent" style={on ? { x: lineB } : undefined}>
            <WordLoop words={HEADLINE_LOOP} />
          </motion.span>
        </span>
      </h1>
      <div className="s-wrap s-hero-body">
        <div className="s-hero-lede-wrap">
          <p className="s-lede s-hero-lede">{snap.settings.studioStatement}</p>
          <p className="s-tagline display">
            Built at twenty. Engineered for real.
            <DoodleWave />
          </p>
          <DoodleArrow className="s-hero-arrow" />
        </div>
        <ul className="s-coverlines" aria-label="In this issue">
          <li>
            <b className="mono">p. 02</b> Two drops, zero chill
          </li>
          <li>
            <b className="mono">p. 03</b> Meet the five cover stars
          </li>
          <li>
            <b className="mono">p. 05</b> Bring your idea, keep your name
          </li>
        </ul>
        <p className="s-actions">
          <Magnetic>
            <a className="s-btn s-btn--ink" href="#work">
              See the drops
            </a>
          </Magnetic>
          <Magnetic>
            <a className="s-btn s-btn--line" href={link('/launchpad/')}>
              Back a project
            </a>
          </Magnetic>
        </p>
      </div>
      <div className="s-wrap s-hero-foot">
        <a className="s-faces" href={link('/crew/')} aria-label="Meet the crew">
          {snap.members.slice(0, 5).map((m, i) => (
            <span key={m.slug} className={`s-face a-${accentFor(i)}`} aria-hidden="true">
              <Portrait record={m.avatar} />
            </span>
          ))}
        </a>
        <Stamp className="s-hero-stamp" />
        <ul className="s-hero-proof" aria-label="The studio in numbers">
          {proof.map(([n, label]) => (
            <li key={label}>
              <b className="display">
                <Count to={n} />
              </b>
              <span className="mono">{label}</span>
            </li>
          ))}
        </ul>
      </div>
      <span className="s-issue-side mono" aria-hidden="true">
        Issue 01 / 2026
      </span>
    </section>
  );
}

/** The contents page, styled as a tracklist: where everything in this issue lives. */
export function Contents() {
  const items = [
    ['#vision', 'Manifesto', 'What we will not trade away'],
    ['#make', 'What we make', 'iOS, macOS, web, AI and APIs'],
    ['#work', 'The drops', 'Bioscanner and Velocity'],
    ['#process', 'How we build', 'Four steps, no surprises'],
    ['#crew', 'Cover stars', 'Five builders, all twenty'],
    ['#brief', 'Start a project', 'Tell us what you are building'],
  ] as const;
  return (
    <nav className="s-contents" aria-label="In this issue">
      <div className="s-wrap">
        <p className="s-eyebrow mono">Tracklist</p>
        <ol>
          {items.map(([href, title, sub], i) => (
            <li key={title} className={`a-${accentFor(i)}`}>
              <a href={href}>
                <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                <strong className="display">{title}</strong>
                <em>{sub}</em>
                <span aria-hidden="true">→</span>
              </a>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}

function Chips({ project }: { project: Project }) {
  return (
    <ul className="s-chips" aria-label="Status and platforms">
      <li className="s-chip s-chip--solid">{statusLabel[project.status]}</li>
      {project.platforms.map((x) => (
        <li key={x} className="s-chip">
          {platformLabel[x]}
        </li>
      ))}
    </ul>
  );
}

/** One project as a coloured panel. On wide screens the panels stack: each sticks, and the one behind recedes. */
export function WorkPanel({
  project,
  index,
  link,
  assetBase,
  latest = false,
}: {
  project: Project;
  index: number;
  link: LinkFn;
  assetBase: LinkFn;
  latest?: boolean;
}) {
  const accent = accentFor(index);
  const buttons = projectLinks(project);
  const shots = stackOrder(project.screenshots);
  return (
    <article
      className={`s-work a-${accent}`}
      data-spot
      style={{ '--i': index } as React.CSSProperties}
    >
      <span className="s-work-stamp mono" aria-hidden="true">
        {statusLabel[project.status]}
      </span>
      {latest && <Starburst className="s-work-burst">New</Starburst>}
      <div className="s-work-copy">
        <span className="s-work-num mono" aria-hidden="true">
          Drop {String(index + 1).padStart(2, '0')}
        </span>
        <h3 className="display">
          <a href={link(`/projects/${project.slug}/`)}>{project.name}</a>
        </h3>
        <p className="s-work-summary">{project.summary}</p>
        <Chips project={project} />
        <p className="s-actions">
          <Magnetic>
            <a className="s-btn s-btn--ink" href={link(`/projects/${project.slug}/`)}>
              Open the case study
            </a>
          </Magnetic>
          {buttons.map((b) => (
            <Magnetic key={b.key}>
              <a className="s-btn s-btn--line" href={b.href} rel="noopener noreferrer">
                {b.label}
              </a>
            </Magnetic>
          ))}
        </p>
      </div>
      <WorkStage shots={shots} name={project.name} asset={assetBase} />
    </article>
  );
}

/**
 * The panels in a column. On screens where every panel fits, they stack: each sticks and the one behind recedes
 * as the next covers it. Elsewhere they scroll past normally. Watches the screen so the choice follows resizing.
 */
export function WorkList({ snap, link, asset }: { snap: Snapshot; link: LinkFn; asset: LinkFn }) {
  const on = useMotionOn();
  const ref = useRef<HTMLDivElement>(null);
  const [stack, setStack] = useState(false);
  const { scrollY } = useScroll();

  useEffect(() => {
    const list = ref.current;
    if (!on || !list) {
      setStack(false);
      return;
    }
    const decide = () => {
      const panels = [...list.children] as HTMLElement[];
      list.style.setProperty('--sticky', `${stickyTopFor(innerHeight)}px`);
      setStack(
        canStack(
          panels.map((p) => p.offsetHeight),
          innerHeight,
          innerWidth,
        ),
      );
    };
    decide();
    const ro = new ResizeObserver(decide);
    ro.observe(list);
    addEventListener('resize', decide);
    return () => {
      ro.disconnect();
      removeEventListener('resize', decide);
    };
  }, [on]);

  useMotionValueEvent(scrollY, 'change', () => {
    const list = ref.current;
    if (!list) return;
    const panels = [...list.children] as HTMLElement[];
    const top = stickyTopFor(innerHeight);
    panels.forEach((el, i) => {
      const next = panels[i + 1];
      const amount =
        stack && next
          ? coverAmount(
              coverProgress(
                next.getBoundingClientRect().top,
                innerHeight,
                top + (i + 1) * STACK_STEP,
              ),
            )
          : 0;
      el.style.setProperty('--cover', amount.toFixed(3));
    });
  });
  return (
    <div className="s-work-list" ref={ref} data-stack={stack ? 'on' : 'off'}>
      {snap.projects.map((p, i) => (
        <WorkPanel
          key={p.slug}
          project={p}
          index={i}
          link={link}
          assetBase={asset}
          latest={i === snap.projects.length - 1}
        />
      ))}
    </div>
  );
}

/** A section's number, label and headline, with the headline rising out of a mask. */
export function SectionHead({
  num,
  eyebrow,
  title,
  id,
  as: Tag = 'h2',
  children,
}: {
  num: string;
  eyebrow: string;
  title: string;
  id?: string;
  as?: 'h1' | 'h2';
  children?: ReactNode;
}) {
  return (
    <div className="s-section-head">
      <Reveal>
        <p className="s-eyebrow mono">
          <span>{num}</span> {eyebrow}
        </p>
      </Reveal>
      <Tag id={id} className="display">
        <SplitText text={title} />
      </Tag>
      <span className="s-rule" aria-hidden="true" />
      {children}
    </div>
  );
}

export const accentClass = (i: number) => `a-${ACCENTS[i % ACCENTS.length]}`;

/** A small fixed label showing which section you are in: "02 / Crew". Wide screens with motion only. */
export function SectionIndex({ labels }: { labels: string[] }) {
  const on = useMotionOn();
  const wide = useWide(1000);
  const [i, setI] = useState(0);
  const [visible, setVisible] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, 'change', (y) => {
    const tops = [...document.querySelectorAll<HTMLElement>('[data-section]')].map(
      (el) => el.getBoundingClientRect().top,
    );
    if (tops.length) setI(currentSection(tops, innerHeight * 0.45));
    setVisible(y > 500);
  });
  if (!on || !wide) return null;
  return (
    <div className={`s-index mono ${visible ? 'is-on' : ''}`} aria-hidden="true">
      <span>{String(i + 1).padStart(2, '0')}</span> / {String(labels.length).padStart(2, '0')}{' '}
      {labels[i]}
    </div>
  );
}
