import { Canvas } from '@react-three/fiber';
import { useEffect, useMemo, useState } from 'react';
import { AvatarBust } from '../../avatar/AvatarBust';
import {
  COUNTS,
  GROUPS,
  KIT_VERSION,
  LABELS,
  NAMES,
  emptyAvatar,
  normalizeAvatar,
  type AvatarRecord,
  type OptionKey,
} from '../../avatar/kit';
import type { AvatarStore } from '../../avatar/store';
import { PhotoReference } from './PhotoReference';

/** Colour options show a swatch from design/avatar-swatches.css instead of a name. */
const SWATCH: Partial<Record<OptionKey, string>> = {
  skin: 'skin',
  hairColor: 'hair',
  glassesColor: 'glasses',
  outfitColor: 'outfit',
};

type Status =
  { kind: 'idle' } | { kind: 'saved'; where: string } | { kind: 'error'; message: string };

export function Builder({ store, reduce }: { store: AvatarStore; reduce: boolean }) {
  const [record, setRecord] = useState<AvatarRecord>(emptyAvatar);
  const [saved, setSaved] = useState<AvatarRecord>(emptyAvatar);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [reactKey, setReactKey] = useState(0);

  useEffect(() => {
    let live = true;
    store.load().then((r) => {
      if (!live) return;
      if (r) {
        setRecord(r);
        setSaved(r);
      }
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, [store]);

  const options = useMemo(() => normalizeAvatar(record).options, [record]);
  const dirty = JSON.stringify(options) !== JSON.stringify(normalizeAvatar(saved).options);
  const pick = (key: OptionKey, value: number) => {
    setRecord({ version: KIT_VERSION, options: { ...options, [key]: value } });
    setStatus({ kind: 'idle' });
    setReactKey((k) => k + 1);
  };
  const warm = useMemo(
    () => getComputedStyle(document.documentElement).getPropertyValue('--light-warm').trim(),
    [],
  );
  const bg = useMemo(
    () => getComputedStyle(document.documentElement).getPropertyValue('--obsidian').trim(),
    [],
  );

  if (loading) return <p role="status">Loading your avatar.</p>;

  return (
    <div className="builder">
      <div className="stage" role="img" aria-label="Live preview of your avatar">
        <Canvas camera={{ position: [0, 0.6, 2.2], rotation: [0, 0, 0], fov: 32 }} dpr={[1, 2]}>
          <color attach="background" args={[bg]} />
          <hemisphereLight args={['#ffffff', bg, 1.6]} />
          <pointLight position={[1.2, 1.6, 2]} intensity={16} color={warm} />
          <pointLight position={[-1.4, 0.6, 1.4]} intensity={6} />
          <pointLight position={[0, 1.2, -1.5]} intensity={8} />
          <AvatarBust
            record={record}
            position={[0, 0, 0]}
            follow
            reactKey={reactKey}
            reduce={reduce}
            scale={1.2}
          />
        </Canvas>
      </div>

      <div className="controls-column">
        {GROUPS.map((g) => (
          <fieldset key={g.title} className="panel">
            <legend>{g.title}</legend>
            {g.keys.map((key) => (
              <div key={key} className="option" role="group" aria-labelledby={`label-${key}`}>
                <span id={`label-${key}`} className="option-label">
                  {LABELS[key]}
                </span>
                <div className="choices">
                  {Array.from({ length: COUNTS[key] }, (_, i) => {
                    const swatch = SWATCH[key];
                    const name = NAMES[key]?.[i] ?? `${LABELS[key]} ${i + 1}`;
                    return (
                      <button
                        key={i}
                        type="button"
                        className={swatch ? 'choice swatch' : 'choice'}
                        aria-pressed={options[key] === i}
                        aria-label={swatch ? name : undefined}
                        style={swatch ? { background: `var(--${swatch}-${i})` } : undefined}
                        onClick={() => pick(key, i)}
                      >
                        {swatch ? null : name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </fieldset>
        ))}

        <div className="actions-row">
          <button
            type="button"
            className="primary"
            disabled={!dirty}
            onClick={async () => {
              try {
                await store.save(record);
                setSaved(record);
                setStatus({ kind: 'saved', where: store.where });
              } catch (e) {
                setStatus({ kind: 'error', message: (e as Error).message });
              }
            }}
          >
            Save avatar
          </button>
          <button
            type="button"
            className="secondary"
            disabled={!dirty}
            onClick={() => {
              setRecord(saved);
              setStatus({ kind: 'idle' });
            }}
          >
            Reset
          </button>
          <span role="status" className="status">
            {status.kind === 'saved' && `Saved ${status.where}.`}
            {status.kind === 'error' && status.message}
            {status.kind === 'idle' && dirty && 'You have unsaved changes.'}
          </span>
        </div>

        <PhotoReference />
      </div>
    </div>
  );
}
