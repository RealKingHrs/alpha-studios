import { createRoot } from 'react-dom/client';
import { LocalAvatarStore } from '../avatar/store';
import '../styles/app.css';
import '../styles/portal.css';
import { Builder } from './avatar/Builder';

const store = new LocalAvatarStore();
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

function Portal() {
  return (
    <main className="portal">
      <header>
        <a className="wordmark" href={import.meta.env.BASE_URL}>
          Alpha Studios
        </a>
        <span className="mono">Crew portal</span>
      </header>
      <h1>Avatar builder</h1>
      <Builder store={store} reduce={reduce} />
    </main>
  );
}

createRoot(document.getElementById('portal')!).render(<Portal />);
