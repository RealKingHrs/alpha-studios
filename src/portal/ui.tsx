import { useEffect, useState, type ReactNode } from 'react';

/** A loading state keeps the page's heading, so the page never loses its structure while data arrives. */
export const Loading = ({ what = 'Loading.', title }: { what?: string; title?: string }) => (
  <>
    {title && <h1>{title}</h1>}
    <p role="status" className="state">
      {what}
    </p>
  </>
);

export function ErrorState({
  message,
  onRetry,
  title,
}: {
  message: string;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <>
      {title && <h1>{title}</h1>}
      <div role="alert" className="state error-state">
        <p>{message}</p>
        {onRetry && (
          <button type="button" className="secondary" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    </>
  );
}

export const Empty = ({ children }: { children: ReactNode }) => <p className="state">{children}</p>;

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: (id: string) => ReactNode;
}) {
  const id = `f-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children(id)}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

/** A banner shown while the browser has no connection. */
export function OfflineBanner() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    addEventListener('online', on);
    addEventListener('offline', off);
    return () => {
      removeEventListener('online', on);
      removeEventListener('offline', off);
    };
  }, []);
  if (online) return null;
  return (
    <p role="status" className="offline">
      You are offline. Changes cannot be saved until you reconnect.
    </p>
  );
}

export const SAVED = 'Saved. The public site shows this after the next publish.';

/** A button that asks twice before doing something that cannot easily be undone. */
export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  className = 'secondary',
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  className?: string;
}) {
  const [asking, setAsking] = useState(false);
  return asking ? (
    <span className="confirm">
      <button
        type="button"
        className={className}
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </button>
      <button type="button" className="secondary" onClick={() => setAsking(false)}>
        Cancel
      </button>
    </span>
  ) : (
    <button type="button" className={className} onClick={() => setAsking(true)}>
      {label}
    </button>
  );
}
