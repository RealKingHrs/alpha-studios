import { useEffect, useMemo, useRef, useState } from 'react';
import { usePortraitLook } from '../../avatar/look';
import { Portrait } from '../../avatar/Portrait';
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
  const stage = useRef<HTMLDivElement>(null);
  usePortraitLook(stage, !reduce);

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

  if (loading) return <p role="status">Loading your avatar.</p>;

  return (
    <div className="builder">
      <div className="stage" ref={stage}>
        <div className="stage-disc">
          <div key={reactKey} className="stage-hop">
            <Portrait
              record={record}
              label="Live preview of your avatar"
              className="portrait--big"
            />
          </div>
        </div>
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
