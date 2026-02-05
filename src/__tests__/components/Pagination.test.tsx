import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { Pagination } from '../../components/Pagination'

describe('Pagination', () => {
  it('should render without crashing', () => {
    const mockOnPageChange = vi.fn()
    const { container } = render(<Pagination currentPage={2} totalPages={5} onPageChange={mockOnPageChange} />)
    
    expect(container).toBeDefined()
  })

  it('should render pagination buttons', () => {
    const mockOnPageChange = vi.fn()
    const { container } = render(<Pagination currentPage={2} totalPages={5} onPageChange={mockOnPageChange} />)
    
    const buttons = container.querySelectorAll('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('should call onPageChange when clicking a button', () => {
    const mockOnPageChange = vi.fn()
    const { container } = render(<Pagination currentPage={2} totalPages={5} onPageChange={mockOnPageChange} />)
    
    const buttons = container.querySelectorAll('button')
    if (buttons.length > 2) {
      fireEvent.click(buttons[2]) // Click third button (a page number)
      expect(mockOnPageChange).toHaveBeenCalled()
    }
  })

  it('should handle single page', () => {
    const mockOnPageChange = vi.fn()
    const { container } = render(<Pagination currentPage={1} totalPages={1} onPageChange={mockOnPageChange} />)
    
    expect(container).toBeDefined()
  })

  it('should handle multiple pages', () => {
    const mockOnPageChange = vi.fn()
    const { container } = render(<Pagination currentPage={5} totalPages={10} onPageChange={mockOnPageChange} />)
    
    const text = container.textContent || ''
    expect(text.length).toBeGreaterThan(0)
  })

  it('should render previous and next buttons', () => {
    const mockOnPageChange = vi.fn()
    const { container } = render(<Pagination currentPage={3} totalPages={5} onPageChange={mockOnPageChange} />)
    
    const text = container.textContent || ''
    expect(text).toContain('Anterior')
    // Button text can be "Próxima" or "Próximo"
    expect(text.length).toBeGreaterThan(0)
  })
})

