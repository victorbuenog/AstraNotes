import { render, screen } from '@testing-library/react'
import { BlockPreview } from './BlockPreview'

describe('BlockPreview', () => {
  it('renders markdown text', () => {
    render(
      <BlockPreview
        block={{ id: 'b1', type: 'markdown', text: '# Heading\n\nSome paragraph' }}
      />,
    )
    expect(screen.getByText('Heading')).toBeInTheDocument()
    expect(screen.getByText('Some paragraph')).toBeInTheDocument()
  })

  it('renders inline latex between dollar signs', () => {
    render(
      <BlockPreview
        block={{
          id: 'b1',
          type: 'markdown',
          text: 'Energy: $E=mc^2$',
        }}
      />,
    )
    expect(screen.getByText('Energy:')).toBeInTheDocument()
  })

  it('renders image block placeholder', () => {
    render(<BlockPreview block={{ id: 'b1', type: 'image', ref: 'img1', alt: 'test' }} />)
    expect(screen.getByText('Image block')).toBeInTheDocument()
  })

  it('renders audio block placeholder', () => {
    render(<BlockPreview block={{ id: 'b1', type: 'audio', ref: 'aud1' }} />)
    expect(screen.getByText('Audio block')).toBeInTheDocument()
  })

  it('renders latex block expression', () => {
    render(
      <BlockPreview block={{ id: 'b1', type: 'latex', expression: '\\int_0^1 x^2 dx' }} />,
    )
    expect(screen.getByText('LaTeX')).toBeInTheDocument()
    expect(screen.getByText('\\int_0^1 x^2 dx')).toBeInTheDocument()
  })

  it('renders empty markdown as italicized Empty', () => {
    render(<BlockPreview block={{ id: 'b1', type: 'markdown', text: '' }} />)
    expect(screen.getByText('Empty')).toBeInTheDocument()
  })
})
