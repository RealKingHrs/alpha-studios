/**
 * A family of flowing curves for the hero background. Curve i starts lower and further left than the one
 * before by a fixed step and bends by a little more, so together they read as one sheet of silk.
 * Coordinates are in a 696 by 316 box; the step and the bend grow linearly with i.
 */
export function flowPaths(count = 24, side: 1 | -1 = 1): string[] {
  return Array.from({ length: count }, (_, i) => {
    const s = side;
    const a = 380 - i * 5 * s;
    const b = 189 + i * 6;
    const c = 312 - i * 5 * s;
    const d = 216 - i * 6;
    const e = 152 - i * 5 * s;
    const f = 343 - i * 6;
    const g = 616 - i * 5 * s;
    const h = 470 - i * 6;
    const k = 684 - i * 5 * s;
    const l = 875 - i * 6;
    return `M-${a} -${b}C-${a} -${b} -${c} ${d} ${e} ${f}C${g} ${h} ${k} ${l} ${k} ${l}`;
  });
}
