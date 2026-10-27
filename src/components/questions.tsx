import { useRenderMode } from '../core/runtime'
import { stripRichHtml } from '../core/sanitize'
import type { ComponentConfig, Field } from '../core/types'
import { RichText } from './RichText'
import { textStyle, typographyDefaults, typographyFields, type TypographyProps } from './typography'

const Svg = ({ svg }: { svg?: string }) =>
  svg ? <span className="ptb-inline-svg" dangerouslySetInnerHTML={{ __html: svg }} /> : null

const layoutField: Field = {
  type: 'radio',
  label: 'Options layout',
  options: [
    { label: 'Inline', value: 'inline' },
    { label: 'Stacked', value: 'stacked' },
  ],
}

/** Optional lead line (instruction / title): hidden in print when empty, but still editable in the editor. */
function Lead({ id, path, value, className }: { id: string; path: string[]; value?: string; className: string }) {
  const mode = useRenderMode()
  if (!value && mode !== 'edit') return null
  return (
    <div className={className}>
      <RichText id={id} path={path} value={value} />
    </div>
  )
}

// Builder defaults are generic placeholders ("Question", "Option 1"); realistic sample content
// lives in `demoProps` and only shows when the editor's Demo mode is on.

// ------------------------------------------------------------------ MCQ

export interface McqProps extends TypographyProps {
  question: string
  options: { text: string; svg?: string; correct?: boolean }[]
  showAnswers: boolean
  numbering: 'A' | 'a' | '1' | 'none'
  layout: 'inline' | 'stacked'
}
const marker = (n: McqProps['numbering'], i: number) =>
  n === 'none' ? '' : n === '1' ? `${i + 1}.` : `${String.fromCharCode((n === 'A' ? 65 : 97) + i)})`

export const Mcq: ComponentConfig<McqProps> = {
  label: 'Multiple choice',
  category: 'Questions',
  fields: {
    question: { type: 'richtext', label: 'Question' },
    options: {
      type: 'array',
      label: 'Options',
      defaultOpen: 1,
      arrayFields: {
        text: { type: 'richtext', label: 'Text' },
        svg: { type: 'textarea', label: 'SVG (optional)', rows: 3 },
        correct: { type: 'boolean', label: 'Correct answer' },
      },
      defaultItemProps: (i) => ({ text: `Option ${i + 1}`, svg: '', correct: false }),
      getItemSummary: (o, i) => `${i + 1}. ${stripRichHtml(o.text) || 'Option'}`,
    },
    layout: layoutField,
    numbering: {
      type: 'select',
      label: 'Numbering',
      options: [
        { label: 'A) B) C)', value: 'A' },
        { label: 'a) b) c)', value: 'a' },
        { label: '1. 2. 3.', value: '1' },
        { label: 'None (circles only)', value: 'none' },
      ],
    },
    ...typographyFields,
    showAnswers: { type: 'boolean', label: 'Show correct answers (answer key)' },
  },
  defaultProps: {
    question: 'Question',
    options: [1, 2, 3, 4].map((n) => ({ text: `Option ${n}`, svg: '', correct: false })),
    showAnswers: false,
    numbering: 'A',
    layout: 'inline',
    ...typographyDefaults(),
  },
  demoProps: {
    question: 'Which one is a fruit?',
    options: [
      { text: 'Apple', correct: true },
      { text: 'Pen', correct: false },
      { text: 'Chair', correct: false },
      { text: 'Book', correct: false },
    ],
  },
  render: (props) => {
    const { question, options, showAnswers, numbering, layout } = props
    return (
      <div className="ptb-q ptb-avoid-break" style={textStyle(props)}>
        <div className="ptb-q-text"><RichText id={props.id} path={['question']} value={question} /></div>
        <div className={`ptb-mcq-options${layout === 'stacked' ? ' stacked' : ''}`}>
          {options.map((o, i) => (
            <div key={i} className="ptb-mcq-option">
              <span className={`ptb-bubble${showAnswers && o.correct ? ' filled' : ''}`} />
              {numbering !== 'none' && <span className="ptb-marker">{marker(numbering, i)}</span>}
              <Svg svg={o.svg} />
              <span><RichText id={props.id} path={['options', i, 'text']} value={o.text} /></span>
            </div>
          ))}
        </div>
      </div>
    )
  },
}

// ------------------------------------------------------------------ True / False

export interface TrueFalseProps extends TypographyProps {
  statements: { text: string; svg?: string; answer: boolean }[]
  showAnswers: boolean
  trueLabel: string
  falseLabel: string
  layout: 'inline' | 'stacked'
}
export const TrueFalse: ComponentConfig<TrueFalseProps> = {
  label: 'True / False',
  category: 'Questions',
  fields: {
    statements: {
      type: 'array',
      label: 'Statements',
      defaultOpen: 1,
      arrayFields: {
        text: { type: 'richtext', label: 'Statement' },
        svg: { type: 'textarea', label: 'SVG (optional)', rows: 3 },
        answer: { type: 'boolean', label: 'Correct answer is True' },
      },
      defaultItemProps: (i) => ({ text: `Statement ${i + 1}`, svg: '', answer: true }),
      getItemSummary: (s, i) => `${i + 1}. ${stripRichHtml(s.text) || 'Statement'}`,
    },
    layout: layoutField,
    trueLabel: { type: 'text', label: 'True label' },
    falseLabel: { type: 'text', label: 'False label' },
    ...typographyFields,
    showAnswers: { type: 'boolean', label: 'Show correct answers (answer key)' },
  },
  defaultProps: {
    statements: [1, 2].map((n) => ({ text: `Statement ${n}`, svg: '', answer: true })),
    trueLabel: 'True',
    falseLabel: 'False',
    layout: 'inline',
    showAnswers: false,
    ...typographyDefaults(),
  },
  demoProps: {
    statements: [
      { text: 'The sun rises in the east.', answer: true },
      { text: 'Fish can walk.', answer: false },
    ],
  },
  render: (props) => {
    const { statements, showAnswers, trueLabel, falseLabel, layout } = props
    return (
      <div className="ptb-q" style={textStyle(props)}>
        {statements.map((s, i) => (
          <div key={i} className={`ptb-tf-row ptb-avoid-break${layout === 'stacked' ? ' stacked' : ''}`}>
            <span className="ptb-marker">{i + 1}.</span>
            <Svg svg={s.svg} />
            <span className="ptb-tf-text"><RichText id={props.id} path={['statements', i, 'text']} value={s.text} /></span>
            <span className="ptb-tf-choices">
              <span className="ptb-tf-choice">
                <span className={`ptb-bubble${showAnswers && s.answer ? ' filled' : ''}`} /> {trueLabel}
              </span>
              <span className="ptb-tf-choice">
                <span className={`ptb-bubble${showAnswers && !s.answer ? ' filled' : ''}`} /> {falseLabel}
              </span>
            </span>
          </div>
        ))}
      </div>
    )
  },
}

// ------------------------------------------------------------------ Match the following

export interface MatchProps extends TypographyProps {
  instruction: string
  pairs: { left: string; leftSvg?: string; right: string; rightSvg?: string }[]
  /** Order of the right column as indexes into pairs; empty = rotated by one. Resolvers can shuffle. */
  rightOrder: number[]
  showAnswers: boolean
  rowHeight: number
}
export const Match: ComponentConfig<MatchProps> = {
  label: 'Match the following',
  category: 'Questions',
  fields: {
    instruction: { type: 'richtext', label: 'Instruction' },
    pairs: {
      type: 'array',
      label: 'Pairs',
      defaultOpen: 1,
      arrayFields: {
        left: { type: 'richtext', label: 'Left text' },
        leftSvg: { type: 'textarea', label: 'Left SVG', rows: 3 },
        right: { type: 'richtext', label: 'Right text' },
        rightSvg: { type: 'textarea', label: 'Right SVG', rows: 3 },
      },
      defaultItemProps: (i) => ({ left: `Left ${i + 1}`, leftSvg: '', right: `Right ${i + 1}`, rightSvg: '' }),
      getItemSummary: (p, i) => `${i + 1}. ${stripRichHtml(p.left)} ↔ ${stripRichHtml(p.right)}`,
    },
    rowHeight: { type: 'number', label: 'Row height (mm)', min: 8, max: 60 },
    ...typographyFields,
    showAnswers: { type: 'boolean', label: 'Show answer lines (answer key)' },
  },
  defaultProps: {
    instruction: 'Instruction',
    pairs: [1, 2, 3].map((n) => ({ left: `Left ${n}`, leftSvg: '', right: `Right ${n}`, rightSvg: '' })),
    rightOrder: [],
    showAnswers: false,
    rowHeight: 16,
    ...typographyDefaults(),
  },
  demoProps: {
    instruction: 'Match the animals to their sounds.',
    pairs: [
      { left: 'Cat', right: 'Meow' },
      { left: 'Dog', right: 'Woof' },
      { left: 'Cow', right: 'Moo' },
    ],
  },
  render: (props) => {
    const { instruction, pairs, rightOrder, showAnswers, rowHeight } = props
    const valid = rightOrder.length === pairs.length && rightOrder.every((i) => pairs[i])
    // default: rotate by one so the editor preview isn't trivially aligned
    const order = valid ? rightOrder : pairs.map((_, i) => (i + 1) % pairs.length)
    const h = rowHeight
    const n = pairs.length
    return (
      <div className="ptb-q ptb-avoid-break" style={textStyle(props)}>
        <Lead id={props.id} path={['instruction']} value={instruction} className="ptb-q-text" />
        <div className="ptb-match" style={{ height: `${n * h}mm` }}>
          <div className="ptb-match-col">
            {pairs.map((p, i) => (
              <div key={i} className="ptb-match-item" style={{ height: `${h}mm` }}>
                <Svg svg={p.leftSvg} />
                <span><RichText id={props.id} path={['pairs', i, 'left']} value={p.left} /></span>
                <span className="ptb-dot" />
              </div>
            ))}
          </div>
          <svg className="ptb-match-lines" viewBox={`0 0 100 ${n * h}`} preserveAspectRatio="none">
            {showAnswers &&
              pairs.map((_, i) => {
                const j = order.indexOf(i)
                return (
                  <line
                    key={i}
                    x1="0"
                    y1={i * h + h / 2}
                    x2="100"
                    y2={j * h + h / 2}
                    stroke="#222"
                    strokeWidth="0.5"
                    vectorEffect="non-scaling-stroke"
                  />
                )
              })}
          </svg>
          <div className="ptb-match-col right">
            {order.map((pi, j) => (
              <div key={j} className="ptb-match-item right" style={{ height: `${h}mm` }}>
                <span className="ptb-dot" />
                <Svg svg={pairs[pi].rightSvg} />
                <span><RichText id={props.id} path={['pairs', pi, 'right']} value={pairs[pi].right} /></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  },
}

// ------------------------------------------------------------------ Sequence / ordering

export interface SequenceProps extends TypographyProps {
  instruction: string
  items: { text: string; svg?: string }[]
  /** Display order as indexes into items (correct order = items order). Empty = reversed. */
  displayOrder: number[]
  layout: 'row' | 'column'
  showAnswers: boolean
}
export const Sequence: ComponentConfig<SequenceProps> = {
  label: 'Arrange in order',
  category: 'Questions',
  fields: {
    instruction: { type: 'richtext', label: 'Instruction' },
    items: {
      type: 'array',
      label: 'Events (in correct order)',
      defaultOpen: 1,
      arrayFields: {
        text: { type: 'richtext', label: 'Caption' },
        svg: { type: 'textarea', label: 'SVG (optional)', rows: 3 },
      },
      defaultItemProps: (i) => ({ text: `Event ${i + 1}`, svg: '' }),
      getItemSummary: (it, i) => `${i + 1}. ${stripRichHtml(it.text) || 'Event'}`,
    },
    layout: {
      type: 'radio',
      label: 'Layout',
      options: [
        { label: 'Row', value: 'row' },
        { label: 'Column', value: 'column' },
      ],
    },
    ...typographyFields,
    showAnswers: { type: 'boolean', label: 'Show correct numbers (answer key)' },
  },
  defaultProps: {
    instruction: 'Instruction',
    items: [1, 2, 3, 4].map((n) => ({ text: `Event ${n}` })),
    displayOrder: [],
    layout: 'row',
    showAnswers: false,
    ...typographyDefaults(),
  },
  demoProps: {
    instruction: 'Number the pictures in the correct order.',
    items: [{ text: 'Wake up' }, { text: 'Brush teeth' }, { text: 'Eat breakfast' }, { text: 'Go to school' }],
  },
  render: (props) => {
    const { instruction, items, displayOrder, layout, showAnswers } = props
    const valid = displayOrder.length === items.length && displayOrder.every((i) => items[i])
    const order = valid ? displayOrder : items.map((_, i) => items.length - 1 - i)
    return (
      <div className="ptb-q ptb-avoid-break" style={textStyle(props)}>
        <Lead id={props.id} path={['instruction']} value={instruction} className="ptb-q-text" />
        <div className={`ptb-seq ${layout}`}>
          {order.map((idx, pos) => (
            <div key={pos} className="ptb-seq-card">
              <span className="ptb-seq-box">{showAnswers ? idx + 1 : ''}</span>
              <Svg svg={items[idx].svg} />
              <span className="ptb-seq-text"><RichText id={props.id} path={['items', idx, 'text']} value={items[idx].text} /></span>
            </div>
          ))}
        </div>
      </div>
    )
  },
}

// ------------------------------------------------------------------ Fill in the blank

export interface FillBlankProps extends TypographyProps {
  instruction: string
  /** Use ___ in the text to mark a blank. */
  sentences: { text: string; answer?: string }[]
  showAnswers: boolean
}
export const FillBlank: ComponentConfig<FillBlankProps> = {
  label: 'Fill in the blanks',
  category: 'Questions',
  fields: {
    instruction: { type: 'richtext', label: 'Instruction' },
    sentences: {
      type: 'array',
      label: 'Sentences (use ___ for a blank)',
      defaultOpen: 1,
      arrayFields: { text: { type: 'text', label: 'Sentence' }, answer: { type: 'text', label: 'Answer' } },
      defaultItemProps: (i) => ({ text: `Sentence ${i + 1} with a ___ blank.`, answer: '' }),
      getItemSummary: (s, i) => `${i + 1}. ${s.text}`,
    },
    ...typographyFields,
    showAnswers: { type: 'boolean', label: 'Show answers (answer key)' },
  },
  defaultProps: {
    instruction: 'Instruction',
    sentences: [1, 2].map((n) => ({ text: `Sentence ${n} with a ___ blank.`, answer: '' })),
    showAnswers: false,
    ...typographyDefaults(),
  },
  demoProps: {
    instruction: 'Fill in the blanks.',
    sentences: [
      { text: 'A cat says ___.', answer: 'meow' },
      { text: 'The sky is ___.', answer: 'blue' },
    ],
  },
  render: (props) => {
    const { instruction, sentences, showAnswers } = props
    return (
      <div className="ptb-q" style={textStyle(props)}>
        <Lead id={props.id} path={['instruction']} value={instruction} className="ptb-q-text" />
        {sentences.map((s, i) => {
          const parts = s.text.split('___')
          return (
            <div key={i} className="ptb-fill-row ptb-avoid-break">
              <span className="ptb-marker">{i + 1}.</span>
              <span>
                {parts.map((part, k) => (
                  <span key={k}>
                    {part}
                    {k < parts.length - 1 && <span className="ptb-blank">{showAnswers ? s.answer : ''}</span>}
                  </span>
                ))}
              </span>
            </div>
          )
        })}
      </div>
    )
  },
}

// ------------------------------------------------------------------ Practice / answer lines

export interface PracticeProps extends TypographyProps {
  questions: { text: string; answer?: string }[]
  answerStyle: 'lines' | 'box' | 'grid' | 'none'
  lines: number
  showAnswers: boolean
  title: string
}
export const Practice: ComponentConfig<PracticeProps> = {
  label: 'Practice questions',
  category: 'Questions',
  fields: {
    title: { type: 'richtext', label: 'Title (optional)' },
    questions: {
      type: 'array',
      label: 'Questions',
      defaultOpen: 1,
      arrayFields: { text: { type: 'richtext', label: 'Question' }, answer: { type: 'text', label: 'Answer' } },
      defaultItemProps: (i) => ({ text: `Question ${i + 1}`, answer: '' }),
      getItemSummary: (q, i) => `${i + 1}. ${stripRichHtml(q.text) || 'Question'}`,
    },
    answerStyle: {
      type: 'select',
      label: 'Answer area',
      options: [
        { label: 'Lines', value: 'lines' },
        { label: 'Box', value: 'box' },
        { label: 'Grid (writing practice)', value: 'grid' },
        { label: 'None', value: 'none' },
      ],
    },
    lines: { type: 'number', label: 'Lines / rows per answer', min: 1, max: 12 },
    ...typographyFields,
    showAnswers: { type: 'boolean', label: 'Show answers (answer key)' },
  },
  defaultProps: {
    title: 'Title',
    questions: [1, 2].map((n) => ({ text: `Question ${n}`, answer: '' })),
    answerStyle: 'lines',
    lines: 2,
    showAnswers: false,
    ...typographyDefaults(),
  },
  demoProps: {
    title: 'Practice',
    questions: [
      { text: 'What is 2 + 3?', answer: '5' },
      { text: 'Write the name of your school.', answer: '' },
    ],
  },
  render: (props) => {
    const { title, questions, answerStyle, lines, showAnswers } = props
    return (
      <div className="ptb-q" style={textStyle(props)}>
        <Lead id={props.id} path={['title']} value={title} className="ptb-q-title" />
        {questions.map((q, i) => (
          <div key={i} className="ptb-practice ptb-avoid-break">
            <div className="ptb-q-text">
              <span className="ptb-marker">{i + 1}.</span> <RichText id={props.id} path={['questions', i, 'text']} value={q.text} />
            </div>
            {answerStyle === 'lines' &&
              Array.from({ length: lines }, (_, k) => (
                <div key={k} className="ptb-answer-line">
                  {k === 0 && showAnswers ? q.answer : ''}
                </div>
              ))}
            {answerStyle === 'box' && (
              <div className="ptb-answer-box" style={{ height: `${lines * 9}mm` }}>
                {showAnswers ? q.answer : ''}
              </div>
            )}
            {answerStyle === 'grid' && (
              <div className="ptb-answer-grid" style={{ height: `${lines * 9}mm` }}>
                {showAnswers ? q.answer : ''}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  },
}
