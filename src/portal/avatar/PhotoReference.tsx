import { useEffect, useMemo, useState } from 'react';
import { createPhotoReference } from '../../avatar/photo';

/** A reference photo shown beside the builder. It stays in this browser and is never uploaded or stored. */
export function PhotoReference() {
  const ref = useMemo(() => createPhotoReference(URL), []);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Release the photo when leaving the builder or closing the tab.
  useEffect(() => {
    const release = () => ref.clear();
    window.addEventListener('pagehide', release);
    return () => {
      window.removeEventListener('pagehide', release);
      release();
    };
  }, [ref]);

  return (
    <section className="panel" aria-labelledby="photo-title">
      <h2 id="photo-title">Reference photo</h2>
      <p className="hint">
        Open a photo to build from. It stays in this browser. It is never uploaded or stored.
      </p>
      <label className="file">
        <span>Choose a photo</span>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              setUrl(ref.set(file));
              setError(null);
            } catch (err) {
              setError((err as Error).message);
            }
          }}
        />
      </label>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {url && (
        <>
          <img
            className="reference"
            src={url}
            alt="Your reference photo, shown only in this browser"
          />
          <button
            type="button"
            className="secondary"
            onClick={() => {
              ref.clear();
              setUrl(null);
            }}
          >
            Remove photo
          </button>
        </>
      )}
    </section>
  );
}
