import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { NoteBlock } from '../types/note'

export function BlockPreview({ block }: { block: NoteBlock }) {
  if (block.type === 'markdown') {
    return (
      <div className="md-preview">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.text || '*Empty*'}</ReactMarkdown>
      </div>
    )
  }
  if (block.type === 'image') {
    return (
      <figure className="media-placeholder">
        <span className="media-placeholder__label">Image block</span>
        <span className="media-placeholder__hint">Attachments will plug in here.</span>
      </figure>
    )
  }
  if (block.type === 'audio') {
    return (
      <div className="media-placeholder">
        <span className="media-placeholder__label">Audio block</span>
        <span className="media-placeholder__hint">Voice notes will plug in here.</span>
      </div>
    )
  }
  return (
    <div className="media-placeholder">
      <span className="media-placeholder__label">LaTeX</span>
      <code className="media-placeholder__code">{block.expression}</code>
    </div>
  )
}
