import { defaultConfig, type Config } from '../src'

/**
 * Demo host config: wraps built-in components with resolvers that shuffle per seed.
 * This is the extension point a real app (e.g. FLN) uses to fetch questions / SVGs from a DB.
 */
export const config: Config = {
  ...defaultConfig,
  components: {
    ...defaultConfig.components,
    Match: {
      ...defaultConfig.components.Match,
      resolveData: (props, { rng }) => ({ ...props, rightOrder: rng.shuffle(props.pairs.map((_: unknown, i: number) => i)) }),
    },
    Sequence: {
      ...defaultConfig.components.Sequence,
      resolveData: (props, { rng }) => ({ ...props, displayOrder: rng.shuffle(props.items.map((_: unknown, i: number) => i)) }),
    },
    Mcq: {
      ...defaultConfig.components.Mcq,
      resolveData: (props, { rng }) => ({ ...props, options: rng.shuffle(props.options) }),
    },
  },
}
