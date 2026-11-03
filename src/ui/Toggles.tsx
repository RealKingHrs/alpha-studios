/** Two plain switches: sound and effects. Both are always reachable and say what they are doing. */
export function Toggles({
  soundOn,
  fxOn,
  fxAvailable,
  cue,
  onSound,
  onFx,
}: {
  soundOn: boolean;
  fxOn: boolean;
  /** False under reduced motion, where effects are off and cannot be switched on. */
  fxAvailable: boolean;
  /** The sound cue just played, as text, for anyone who cannot hear it. */
  cue: string | null;
  onSound: () => void;
  onFx: () => void;
}) {
  return (
    <section className="toggles" aria-label="Sound and effects">
      <button type="button" className="toggle" aria-pressed={soundOn} onClick={onSound}>
        Sound {soundOn ? 'on' : 'off'}
      </button>
      {fxAvailable && (
        <button type="button" className="toggle" aria-pressed={fxOn} onClick={onFx}>
          Effects {fxOn ? 'on' : 'off'}
        </button>
      )}
      <span className="cue mono" role="status">
        {soundOn && cue ? cue : ''}
      </span>
    </section>
  );
}
