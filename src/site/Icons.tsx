/** Fine line icons in one weight, drawn in the current text colour. Decorative: always paired with a visible label. */
const base = {
  viewBox: '0 0 48 48',
  width: 44,
  height: 44,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

/** A drawing compass: craft. */
export const CraftIcon = () => (
  <svg {...base}>
    <circle cx="24" cy="9" r="3.5" />
    <path d="M24 12.5 12 40M24 12.5 36 40" />
    <path d="M17 29h14" />
    <path d="M12 40l-2 3M36 40l2 3" />
  </svg>
);

/** Two overlapping circles: people. */
export const PeopleIcon = () => (
  <svg {...base}>
    <circle cx="18" cy="24" r="11" />
    <circle cx="30" cy="24" r="11" />
    <path d="M24 15.4a11 11 0 0 1 0 17.2" />
  </svg>
);

/** A seal with a ribbon: credit. */
export const CreditIcon = () => (
  <svg {...base}>
    <circle cx="24" cy="19" r="11" />
    <path d="m19 17 3.6 3.6L29 14.5" />
    <path d="m17.5 29-3 14 9.5-5 9.5 5-3-14" />
  </svg>
);

/** A phone: native iOS apps. */
export const PhoneIcon = () => (
  <svg {...base}>
    <rect x="14" y="5" width="20" height="38" rx="5" />
    <path d="M21 9.5h6M22 38.5h4" />
  </svg>
);

/** A laptop: macOS apps. */
export const LaptopIcon = () => (
  <svg {...base}>
    <rect x="9" y="10" width="30" height="21" rx="2.5" />
    <path d="M5 37h38M20 37l1.5-2.5h5L28 37" />
  </svg>
);

/** A globe: web apps. */
export const GlobeIcon = () => (
  <svg {...base}>
    <circle cx="24" cy="24" r="16" />
    <path d="M8 24h32M24 8c-6 5-6 27 0 32M24 8c6 5 6 27 0 32" />
  </svg>
);

/** Two sparks: AI and ML. */
export const SparkIcon = () => (
  <svg {...base}>
    <path d="M20 8l3 10 10 3-10 3-3 10-3-10-10-3 10-3zM35 26l1.6 5.4L42 33l-5.4 1.6L35 40l-1.6-5.4L28 33l5.4-1.6z" />
  </svg>
);

/** A plug: APIs. */
export const PlugIcon = () => (
  <svg {...base}>
    <path d="M18 6v10M30 6v10M12 16h24v8a12 12 0 0 1-24 0zM24 36v8" />
  </svg>
);
