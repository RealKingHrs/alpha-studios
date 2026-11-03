import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './App';
import { Snapshot } from './content/schema';
import { interceptLinks, isExplore } from './router';
import './styles/base.css';
import './styles/site.css';
import './styles/explore.css';

// Public pages read only content.json; they never call the backend.
const base = import.meta.env.BASE_URL;
const res = await fetch(`${base}content.json`);
const snap = Snapshot.parse(await res.json());
interceptLinks();
const root = document.getElementById('root')!;
const app = <App snap={snap} pathname={location.pathname} base={base} search={location.search} />;
// The page was prerendered as the bright site. Explore is client-only, so it replaces that markup
// instead of hydrating it.
if (isExplore(location.search)) createRoot(root).render(app);
else hydrateRoot(root, app);
