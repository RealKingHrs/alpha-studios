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
