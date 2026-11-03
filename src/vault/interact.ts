/** Pointer helpers shared by everything in the scene that can be picked. */
export const useCursor = () => ({
  onPointerOver: () => void (document.body.style.cursor = 'pointer'),
  onPointerOut: () => void (document.body.style.cursor = ''),
});

/** A click that was really a swipe must not open anything. */
export const isTap = (e: { delta: number }) => e.delta < 6;
