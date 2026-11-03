import type { Project } from '../content/schema';

type Shot = Project['screenshots'][number];

/**
 * A device drawn in CSS around a screenshot: a phone, a Mac display or a browser window.
 * Pure markup, so it costs no download and prints and scales cleanly.
 */
export function DeviceMock({
  shot,
  src,
  label,
  className = '',
}: {
  shot: Shot;
  src: string;
  label?: string;
  className?: string;
}) {
  const kind = shot.device === 'android' ? 'iphone' : shot.device;
  return (
    <figure className={`device device--${kind} ${className}`.trim()}>
      {kind === 'browser' && (
        <div className="device-bar" aria-hidden="true">
          <i />
          <i />
          <i />
          <span>{label ?? ''}</span>
        </div>
      )}
      {kind === 'iphone' && <div className="device-notch" aria-hidden="true" />}
      <img src={src} alt={shot.alt} loading="lazy" />
      {kind === 'mac' && <div className="device-chin" aria-hidden="true" />}
    </figure>
  );
}
