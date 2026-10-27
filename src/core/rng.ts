export interface Rng {
  /** Float in [0, 1). */
  next(): number
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number
  pick<T>(items: readonly T[]): T
  /** Returns a shuffled copy. */
  shuffle<T>(items: readonly T[]): T[]
  /** Picks n distinct items. */
  sample<T>(items: readonly T[], n: number): T[]
}

/** FNV-1a string hash -> uint32. */
export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** mulberry32 seeded RNG. Deterministic for a given seed. */
export function createRng(seed: string | number): Rng {
  let a = typeof seed === 'number' ? seed >>> 0 : hashString(seed)
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1))
  const shuffle = <T,>(items: readonly T[]) => {
    const out = [...items]
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(0, i)
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }
  return {
    next,
    int,
    pick: (items) => items[int(0, items.length - 1)],
    shuffle,
    sample: (items, n) => shuffle(items).slice(0, n),
  }
}
