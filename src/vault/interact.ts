import { hover3d } from './hover';

/** Pointer helpers shared by everything in the scene that can be picked. */
export const useCursor = () => ({
  onPointerOver: () => {
    hover3d.active = true;
    document.body.style.cursor = 'pointer';
  },
  onPointerOut: () => {
    hover3d.active = false;
    document.body.style.cursor = '';
  },
});

/** A click that was really a swipe must not open anything. */
export const isTap = (e: { delta: number }) => e.delta < 6;
