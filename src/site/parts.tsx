import { useEffect, useRef, type ReactNode } from 'react';
import type { Project, Snapshot } from '../content/schema';
import { platformLabel, projectLinks, statusLabel } from '../rooms';
import type { Route } from '../routes';
import { ACCENTS, HEADLINE, ROTATING_WORDS, accentFor, headlineText, stackOrder } from './data';
import { DeviceMock } from './DeviceMock';
import { Mark, Sticker } from './Mark';
import { Reveal } from './Reveal';

export type LinkFn = (path: string) => string;

const NAV = [
  ['/projects/', 'Work'],
  ['/crew/', 'Crew'],
  ['/contact/', 'Contact'],
] as const;

const section = (route: Route) =>
  route.name === 'projects' || route.name === 'project' || route.name === 'room'
    ? '/projects/'
    : route.name === 'crew' || route.name === 'member'
      ? '/crew/'
      : route.name === 'contact'
        ? '/contact/'
        : null;

export function Header({
  route,
  link,
  exploreHref,
}: {
  route: Route;
  link: LinkFn;
  exploreHref: string;
}) {
  const here = section(route);
  return (
    <header className="s-header">
      <a className="s-brand" href={link('/')} aria-label="Alpha Studios, home">
        <Mark className="s-brand-mark" />
        <span>Alpha Studios</span>
      </a>
      <nav aria-label="Main" className="s-nav">
        <ul>
          {NAV.map(([path, label]) => (
            <li key={path}>
              <a href={link(path)} aria-current={here === path ? 'page' : undefined}>
                {label}
              </a>
            </li>
          ))}
          <li>
            <a className="s-pill" href={exploreHref} aria-label="Explore in 3D">
              <span aria-hidden="true" className="pill-long">
                Explore in 3D
              </span>
              <span aria-hidden="true" className="pill-short">
                3D
              </span>
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}

export function Footer({
  snap,
  link,
  fxAvailable,
  fxOn,
  onFx,
}: {
  snap: Snapshot;
  link: LinkFn;
  fxAvailable: boolean;
  fxOn: boolean;
  onFx: () => void;
}) {
  const email = snap.settings.contactEmail;
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
              <a href={link('/contact/')}>Contact</a>
            </li>
            {email && (
              <li>
                <a href={`mailto:${email}`}>{email}</a>
              </li>
            )}
            <li>
              <a href={link('/portal/')} className="s-quiet">
                Crew login
              </a>
            </li>
          </ul>
        </nav>
        <div className="s-footer-meta">
          <span className="mono">© 2026 Alpha Studios</span>
          {fxAvailable && (
            <button type="button" className="s-toggle" aria-pressed={fxOn} onClick={onFx}>
              Playful effects {fxOn ? 'on' : 'off'}
            </button>
          )}
        </div>
      </div>
    </footer>
  );
}

/** The hero: a big headline whose last word takes turns, the mark, a spinning sticker and drifting shapes. */
export function Hero({ snap, exploreHref }: { snap: Snapshot; exploreHref: string }) {
  const ref = useRef<HTMLElement>(null);

  // Shapes drift a little toward the pointer. Skipped under reduced motion.
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      el.style.setProperty('--px', String((e.clientX / innerWidth - 0.5) * 2));
      el.style.setProperty('--py', String((e.clientY / innerHeight - 0.5) * 2));
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  return (
    <section ref={ref} className="s-hero" aria-labelledby="hero-title">
      <div className="s-shapes" aria-hidden="true">
        <span className="shape shape--circle a-tomato" />
        <span className="shape shape--square a-sun" />
        <span className="shape shape--pill a-mint" />
        <span className="shape shape--ring a-sky" />
        <span className="shape shape--dot a-lilac" />
      </div>
      <div className="s-wrap s-hero-grid">
        <div className="s-hero-copy">
          <p className="s-eyebrow mono">Studio for native and web apps</p>
          <h1 id="hero-title" className="display s-hero-title">
            <span className="visually-hidden">{headlineText()}</span>
            <span aria-hidden="true">
              {HEADLINE}
              <span className="rotor">
                {ROTATING_WORDS.map((w, i) => (
                  <span key={w} className="rotor-word" style={{ '--n': i } as React.CSSProperties}>
                    {w}
                    {i === ROTATING_WORDS.length - 1 ? '.' : ''}
                  </span>
                ))}
              </span>
            </span>
          </h1>
          <p className="s-lede">{snap.settings.studioStatement}</p>
          <p className="s-actions">
            <a className="s-btn s-btn--ink" href="#work">
              See the work
            </a>
            <a className="s-btn s-btn--line" href={exploreHref}>
              Explore in 3D
            </a>
          </p>
        </div>
        <div className="s-hero-art" aria-hidden="true">
          <Mark className="s-hero-mark" />
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

/** One project as a full-width coloured panel: number, name, summary, chips, buttons and a stack of devices. */
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
    <Reveal as="article" className={`s-work a-${accent}`}>
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
          <a className="s-btn s-btn--ink" href={link(`/projects/${project.slug}/`)}>
            Open the case study
          </a>
          {buttons.map((b) => (
            <a key={b.key} className="s-btn s-btn--line" href={b.href} rel="noopener noreferrer">
              {b.label}
            </a>
          ))}
        </p>
      </div>
      <div className="s-work-stage">
        {shots.map((s, i) => (
          <DeviceMock
            key={s.src}
            shot={s}
            src={assetBase(`/${s.src}`)}
            label={project.name}
            className={`d${i}`}
          />
        ))}
      </div>
    </Reveal>
  );
}

export function SectionHead({
  num,
  eyebrow,
  title,
  children,
}: {
  num: string;
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="s-section-head">
      <p className="s-eyebrow mono">
        <span>{num}</span> {eyebrow}
      </p>
      <h2 className="display">{title}</h2>
      {children}
    </div>
  );
}

export const accentClass = (i: number) => `a-${ACCENTS[i % ACCENTS.length]}`;
