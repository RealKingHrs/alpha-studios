import { hydrateRoot } from 'react-dom/client';
import { App } from './App';
import { Snapshot } from './content/schema';
import 'lenis/dist/lenis.css';
import { interceptLinks } from './router';
import './styles/base.css';
import './styles/site.css';
import './styles/member-page.css';

// Public pages read only content.json; they never call the backend.
const base = import.meta.env.BASE_URL;
const res = await fetch(`${base}content.json`);
const snap = Snapshot.parse(await res.json());
interceptLinks();
hydrateRoot(
  document.getElementById('root')!,
  <App snap={snap} pathname={location.pathname} base={base} />,
);
