import { render, screen } from '@testing-library/react'
import { BlockPreview } from './BlockPreview'

describe('BlockPreview markdown math', () => {
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

    expect(document.querySelector('.katex')).toBeInTheDocument()
    expect(screen.getByText('Energy:')).toBeInTheDocument()
  })
})
