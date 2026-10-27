import type { Config } from '../core/types'
import { Divider, Header, Heading, Image, Spacer, Text } from './basic'
import { Box, Columns } from './layout'
import { FillBlank, Match, Mcq, Practice, Sequence, TrueFalse } from './questions'
import { Table } from './table'

export * from './basic'
export * from './layout'
export * from './questions'
export * from './table'

export const defaultConfig: Config = {
  components: { Header, Heading, Text, Image, Spacer, Divider, Columns, Box, Table, Mcq, TrueFalse, Match, Sequence, FillBlank, Practice },
  categories: {
    basic: { title: 'Basic', components: ['Header', 'Heading', 'Text', 'Image', 'Spacer', 'Divider'] },
    layout: { title: 'Layout', components: ['Columns', 'Box', 'Table'] },
    questions: { title: 'Questions', components: ['Mcq', 'TrueFalse', 'Match', 'Sequence', 'FillBlank', 'Practice'] },
  },
}
