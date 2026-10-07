import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Toast } from './Toast'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('Toast', () => {
  it('dismisses itself after its duration', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    render(
      <Toast duration={1000} onDismiss={onDismiss}>
        Saved
      </Toast>,
    )
    act(() => vi.advanceTimersByTime(999))
    expect(onDismiss).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(onDismiss).toHaveBeenCalledOnce()
  })
  it('pauses while hovered and resumes with the time that was left', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    render(
      <Toast duration={1000} onDismiss={onDismiss}>
        Saved
      </Toast>,
    )
    act(() => vi.advanceTimersByTime(600))
    fireEvent.pointerEnter(screen.getByRole('status'))
    act(() => vi.advanceTimersByTime(5000))
    expect(onDismiss).not.toHaveBeenCalled()
    fireEvent.pointerLeave(screen.getByRole('status'))
    act(() => vi.advanceTimersByTime(399))
    expect(onDismiss).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(onDismiss).toHaveBeenCalledOnce()
  })
})
