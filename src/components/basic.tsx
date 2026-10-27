import { useRenderMode } from '../core/runtime'
import type { ComponentConfig } from '../core/types'
import { RichText } from './RichText'
import { textStyle, typographyDefaults, typographyFields, type TypographyProps } from './typography'

const alignOptions = [
  { label: 'Left', value: 'left' },
  { label: 'Center', value: 'center' },
  { label: 'Right', value: 'right' },
]

export interface HeadingProps extends TypographyProps {
  text: string
  align: 'left' | 'center' | 'right'
  /** Legacy (pre-typography templates). */
  level?: 1 | 2 | 3
}
export const Heading: ComponentConfig<HeadingProps> = {
  label: 'Heading',
  category: 'Basic',
  fields: {
    text: { type: 'richtext', label: 'Text' },
    ...typographyFields,
    align: { type: 'radio', label: 'Align', options: alignOptions },
  },
  // bold is part of the text itself (so letters can be un-bolded), not of the component
  defaultProps: { text: '<strong>Heading</strong>', ...typographyDefaults('h1'), align: 'left' },
  demoProps: { text: '<strong>My First Worksheet</strong>' },
  render: (props) => {
    const legacy = props.level ? ({ 1: 'h1', 2: 'h2', 3: 'h3' } as const)[props.level] : undefined
    return (
      <div className="ptb-heading" style={{ ...textStyle({ ...props, size: props.size ?? legacy }), textAlign: props.align }}>
        <RichText id={props.id} path={['text']} value={props.text} />
      </div>
    )
  },
}

export interface TextProps extends TypographyProps {
  text: string
  align: 'left' | 'center' | 'right'
  /** Legacy (pre-typography templates). */
  bold?: boolean
}
export const Text: ComponentConfig<TextProps> = {
  label: 'Text',
  category: 'Basic',
  fields: {
    text: { type: 'richtext', label: 'Text', multiline: true },
    ...typographyFields,
    align: { type: 'radio', label: 'Align', options: alignOptions },
  },
  defaultProps: { text: 'Text', ...typographyDefaults('normal'), align: 'left' },
  demoProps: { text: 'Read the sentences carefully and answer the questions below.' },
  render: (props) => (
    <div
      className="ptb-text"
      style={{ ...textStyle({ ...props, styles: props.bold ? [...(props.styles ?? []), 'bold'] : props.styles }), textAlign: props.align }}
    >
      <RichText id={props.id} path={['text']} value={props.text} multiline />
    </div>
  ),
}

export interface ImageProps {
  src: string
  svg: string
  alt: string
  width: number
  align: 'left' | 'center' | 'right'
  vAlign: 'top' | 'middle' | 'bottom'
}
export const Image: ComponentConfig<ImageProps> = {
  label: 'Image / SVG',
  category: 'Basic',
  fields: {
    src: { type: 'text', label: 'Image URL' },
    svg: { type: 'textarea', label: 'Inline SVG markup (overrides URL)', rows: 5 },
    alt: { type: 'text', label: 'Alt text' },
    width: { type: 'number', label: 'Image width (% of its box)', min: 5, max: 100 },
    align: { type: 'radio', label: 'Horizontal align', options: alignOptions },
    vAlign: {
      type: 'radio',
      label: 'Vertical align (in a taller box — drag the bottom handle)',
      options: [
        { label: 'Top', value: 'top' },
        { label: 'Middle', value: 'middle' },
        { label: 'Bottom', value: 'bottom' },
      ],
    },
  },
  defaultProps: { src: '', svg: '', alt: '', width: 40, align: 'center', vAlign: 'top' },
  render: function ImageRender({ src, svg, alt, width, align, vAlign }) {
    const mode = useRenderMode()
    const justify = { left: 'flex-start', center: 'center', right: 'flex-end' }[align]
    const alignItems = { top: 'flex-start', middle: 'center', bottom: 'flex-end' }[vAlign ?? 'top']
    let inner
    if (svg.trim()) inner = <div className="ptb-svg" dangerouslySetInnerHTML={{ __html: svg }} />
    else if (src) inner = <img src={src} alt={alt} style={{ width: '100%', display: 'block' }} />
    else inner = mode === 'edit' ? <div className="ptb-img-placeholder">Add an image URL or SVG</div> : null
    return (
      <div className="ptb-image" style={{ justifyContent: justify, alignItems }}>
        <div style={{ width: `${width}%` }}>{inner}</div>
      </div>
    )
  },
}

export interface SpacerProps {
  height: number
}
export const Spacer: ComponentConfig<SpacerProps> = {
  label: 'Spacer',
  category: 'Basic',
  fields: { height: { type: 'number', label: 'Height (mm)', min: 1, max: 200 } },
  defaultProps: { height: 10 },
  render: function SpacerRender({ height }) {
    const mode = useRenderMode()
    return <div className={mode === 'edit' ? 'ptb-spacer ptb-spacer-edit' : 'ptb-spacer'} style={{ height: `${height}mm` }} />
  },
}

export interface DividerProps {
  style: 'solid' | 'dashed' | 'dotted'
  thickness: number
}
export const Divider: ComponentConfig<DividerProps> = {
  label: 'Divider',
  category: 'Basic',
  fields: {
    style: {
      type: 'select',
      label: 'Style',
      options: [
        { label: 'Solid', value: 'solid' },
        { label: 'Dashed', value: 'dashed' },
        { label: 'Dotted', value: 'dotted' },
      ],
    },
    thickness: { type: 'number', label: 'Thickness (px)', min: 1, max: 10 },
  },
  defaultProps: { style: 'solid', thickness: 1 },
  render: ({ style, thickness }) => <hr className="ptb-divider" style={{ borderTop: `${thickness}px ${style} #222` }} />,
}

export interface HeaderProps {
  title: string
  subtitle: string
  showName: boolean
  showDate: boolean
  showClass: boolean
}
export const Header: ComponentConfig<HeaderProps> = {
  label: 'Page header',
  category: 'Basic',
  fields: {
    title: { type: 'text', label: 'Title' },
    subtitle: { type: 'text', label: 'Subtitle' },
    showName: { type: 'boolean', label: 'Name line' },
    showClass: { type: 'boolean', label: 'Class line' },
    showDate: { type: 'boolean', label: 'Date line' },
  },
  defaultProps: { title: 'Title', subtitle: '', showName: true, showClass: false, showDate: true },
  demoProps: { title: 'Alphabet Practice', subtitle: 'Level 2 · Letters A–E' },
  render: ({ title, subtitle, showName, showClass, showDate }) => (
    <div className="ptb-header">
      <div className="ptb-header-title">{title}</div>
      {subtitle && <div className="ptb-header-sub">{subtitle}</div>}
      {(showName || showClass || showDate) && (
        <div className="ptb-header-fields">
          {showName && <span className="ptb-fill-line grow">Name:</span>}
          {showClass && <span className="ptb-fill-line">Class:</span>}
          {showDate && <span className="ptb-fill-line">Date:</span>}
        </div>
      )}
    </div>
  ),
}
