import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from '../../components/Modal'

describe('Modal', () => {
  it('renders nothing when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()} title="Test Modal">
        <p>Content</p>
      </Modal>
    )
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument()
    expect(screen.queryByText('Content')).not.toBeInTheDocument()
  })

  it('renders title and children when isOpen is true', () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="My Modal">
        <p>Modal body</p>
      </Modal>
    )
    expect(screen.getByText('My Modal')).toBeInTheDocument()
    expect(screen.getByText('Modal body')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Modal isOpen onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>
    )
    // The X button
    const closeBtn = screen.getByRole('button')
    await user.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { container } = render(
      <Modal isOpen onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>
    )
    // The backdrop div is the absolute overlay
    const backdrop = container.querySelector('.absolute.inset-0')
    if (backdrop) await user.click(backdrop)
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when Escape key is pressed', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Modal isOpen onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>
    )
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('does not add keydown listener when closed', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Modal isOpen={false} onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>
    )
    await user.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('renders title in h2', () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Dialog Title">
        Content
      </Modal>
    )
    expect(screen.getByRole('heading', { name: 'Dialog Title' })).toBeInTheDocument()
  })
})
