import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Project, Snapshot } from '../content/schema';
import { platformLabel, projectLinks, statusLabel } from '../rooms';
import type { Route } from '../routes';
import { ACCENTS, HEADLINE, ROTATING_WORDS, accentFor, headlineText, stackOrder } from './data';
import { Mark, Sticker } from './Mark';
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
  ['/projects/', 'Work'],
  ['/crew/', 'Crew'],
  ['/launchpad/', 'Launchpad'],
  ['/contact/', 'Contact'],
] as const;

const section = (route: Route) =>
  route.name === 'projects' || route.name === 'project'
    ? '/projects/'
    : route.name === 'crew' || route.name === 'member' || route.name === 'certificate'
      ? '/crew/'
      : route.name === 'launchpad'
        ? '/launchpad/'
        : route.name === 'contact'
          ? '/contact/'
          : null;

/** The header tucks away as you scroll down and returns the moment you scroll up. */
export function Header({ route, link }: { route: Route; link: LinkFn }) {
  const here = section(route);
  const on = useMotionOn();
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [solid, setSolid] = useState(false);
  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setSolid(y > 12);
    if (on) setHidden(y > 160 && y > prev);
    if (y < 160 || y < prev) setHidden(false);
  });
  return (
    <header className={`s-header ${hidden ? 'is-hidden' : ''} ${solid ? 'is-solid' : ''}`}>
      <a className="s-brand" href={link('/')} aria-label="Alpha Studios, home">
        <Mark className="s-brand-mark" />
        <span>Alpha Studios</span>
      </a>
      <MenuButton link={link} here={here} />
      <nav aria-label="Main" className="s-nav">
        <ul>
          {NAV.map(([path, label]) => (
            <li key={path}>
              <Magnetic strength={0.6}>
                <a href={link(path)} aria-current={here === path ? 'page' : undefined}>
                  {label}
                </a>
              </Magnetic>
            </li>
          ))}
          <li>
            <Magnetic>
              <a className="s-pill" href={link('/contact/')}>
                Say hello
              </a>
            </Magnetic>
          </li>
        </ul>
      </nav>
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
      {open && (
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
              <li key={path} style={{ '--i': i } as React.CSSProperties}>
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
        </div>
      )}
    </>
  );
}

export function Footer({ link }: { link: LinkFn }) {
  return (
    <footer className="s-footer">
      <div className="s-wrap s-footer-grid">
        <p className="s-footer-big display" aria-hidden="true">
          Alpha Studios
        </p>
        <nav aria-label="Footer">
          <ul>
            <li>
              <a href={link('/projects/')}>Work</a>
            </li>
            <li>
              <a href={link('/crew/')}>Crew</a>
            </li>
            <li>
              <a href={link('/launchpad/')}>Launchpad</a>
            </li>
            <li>
              <a href={link('/contact/')}>Contact</a>
            </li>
          </ul>
        </nav>
        <div className="s-footer-meta">
          <span className="mono">© 2026 Alpha Studios</span>
          <button
            type="button"
            className="s-top"
            onClick={() => scrollToTop(false)}
            aria-label="Back to the top"
          >
            <span aria-hidden="true">↑</span> Top
          </button>
        </div>
      </div>
    </footer>
  );
}

const WORD_BG = ['var(--tomato)', 'var(--sky)', 'var(--mint)'];

/** The word that changes. With motion it slides through a mask; without, three words fade by CSS. */
function Rotor() {
  const on = useMotionOn();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => setI((v) => (v + 1) % ROTATING_WORDS.length), 2700);
    return () => clearInterval(id);
  }, [on]);
  if (!on) {
    return (
      <span className="rotor">
        {ROTATING_WORDS.map((w, n) => (
          <span key={w} className="rotor-word" style={{ '--n': n } as React.CSSProperties}>
            {w}
            {n === ROTATING_WORDS.length - 1 ? '.' : ''}
          </span>
        ))}
      </span>
    );
  }
  return (
    <span className="rotor rotor--js">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={i}
          className="rotor-word"
          style={{ background: WORD_BG[i] }}
          initial={{ y: '70%', opacity: 0, rotate: -5, scale: 0.96 }}
          animate={{ y: '0%', opacity: 1, rotate: -2, scale: 1 }}
          exit={{ y: '-70%', opacity: 0, rotate: 3, scale: 0.96 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          {ROTATING_WORDS[i]}
          {i === ROTATING_WORDS.length - 1 ? '.' : ''}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** The hero: the headline rises word by word, the mark draws itself, and everything drifts apart as you scroll. */
export function Hero({ snap }: { snap: Snapshot }) {
  const ref = useRef<HTMLElement>(null);
  const on = useMotionOn();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const markRotate = useTransform(p, [0, 1], [-6, 26]);
  const markY = useTransform(p, [0, 1], ['0%', '14%']);
  const copyY = useTransform(p, [0, 1], ['0%', '-8%']);
  const copyOpacity = useTransform(p, [0, 0.85], [1, 0.1]);
  const s1 = useTransform(p, [0, 1], ['0%', '-22%']);
  const s2 = useTransform(p, [0, 1], ['0%', '-11%']);
  const s3 = useTransform(p, [0, 1], ['0%', '-30%']);
  const s4 = useTransform(p, [0, 1], ['0%', '-6%']);
  const s5 = useTransform(p, [0, 1], ['0%', '-16%']);

  // Shapes lean toward the pointer a little. Skipped without motion.
  useEffect(() => {
    const el = ref.current;
    if (!on || !el) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      el.style.setProperty('--px', String((e.clientX / innerWidth - 0.5) * 2));
      el.style.setProperty('--py', String((e.clientY / innerHeight - 0.5) * 2));
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [on]);

  const shape = (cls: string, y: typeof s1) => (
    <motion.span className="shape-slot" style={on ? { y } : undefined}>
      <span className={`shape ${cls}`} />
    </motion.span>
  );

  return (
    <section ref={ref} className="s-hero" aria-labelledby="hero-title">
      <div className="s-shapes" aria-hidden="true">
        {shape('shape--circle a-tomato', s1)}
        {shape('shape--square a-sun', s2)}
        {shape('shape--pill a-mint', s3)}
        {shape('shape--ring a-sky', s4)}
        {shape('shape--dot a-lilac', s5)}
      </div>
      <div className="s-wrap s-hero-grid">
        <motion.div
          className="s-hero-copy"
          style={on ? { y: copyY, opacity: copyOpacity } : undefined}
        >
          <p className="s-eyebrow mono">Studio for native and web apps</p>
          <h1 id="hero-title" className="display s-hero-title">
            <span className="visually-hidden">{headlineText()}</span>
            <span aria-hidden="true">
              <span className="s-hero-line">
                <SplitText text={HEADLINE} delay={0.25} step={0.12} />
              </span>
              <Rotor />
            </span>
          </h1>
          <p className="s-lede">{snap.settings.studioStatement}</p>
          <p className="s-actions">
            <Magnetic>
              <a className="s-btn s-btn--ink" href="#work">
                See the work
              </a>
            </Magnetic>
            <Magnetic>
              <a className="s-btn s-btn--line" href="#crew">
                Meet the crew
              </a>
            </Magnetic>
          </p>
        </motion.div>
        <a className="s-scroll-cue mono" href="#work">
          <span>Scroll</span>
          <i aria-hidden="true" />
        </a>
        <div className="s-hero-art" aria-hidden="true">
          <motion.div
            className="s-hero-mark-wrap"
            style={on ? { rotate: markRotate, y: markY } : undefined}
          >
            <Mark className="s-hero-mark" draw />
          </motion.div>
          <Sticker text="ALPHA STUDIOS" className="s-hero-sticker" />
        </div>
      </div>
    </section>
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
}: {
  project: Project;
  index: number;
  link: LinkFn;
  assetBase: LinkFn;
}) {
  const accent = accentFor(index);
  const buttons = projectLinks(project);
  const shots = stackOrder(project.screenshots);
  return (
    <article className={`s-work a-${accent}`} style={{ '--i': index } as React.CSSProperties}>
      <div className="s-work-copy">
        <span className="s-work-num display" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
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
        <WorkPanel key={p.slug} project={p} index={i} link={link} assetBase={asset} />
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
