import React from 'react'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// --------------------------------------------------------------------------
// Mocks
// --------------------------------------------------------------------------

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush })
}))

// Mock history factory
const mockClearAll = vi.fn()
const mockGetHistoryMode = vi.fn()
const mockGetHistoryRepository = vi.fn(() => ({ clearAll: mockClearAll }))

vi.mock('@/lib/history/factory', () => ({
  getHistoryMode: () => mockGetHistoryMode(),
  getHistoryRepository: () => mockGetHistoryRepository()
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

// Import after mocks are set up
import { ClearHistoryDropdownItem } from '../clear-history-dropdown-item'
import { ClearHistorySettings } from '../clear-history-settings'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '../ui/dropdown-menu'

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function dispatchEvent_spy() {
  const spy = vi.spyOn(window, 'dispatchEvent')
  return spy
}

// --------------------------------------------------------------------------
// ClearHistorySettings
// --------------------------------------------------------------------------

describe('ClearHistorySettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClearAll.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders nothing when mode is "db"', () => {
    mockGetHistoryMode.mockReturnValue('db')
    const { container } = render(<ClearHistorySettings />)
    expect(container.firstChild).toBeNull()
  })

  it('renders a button when mode is "idb"', () => {
    mockGetHistoryMode.mockReturnValue('idb')
    render(<ClearHistorySettings />)
    expect(
      screen.getByRole('button', { name: /clear history/i })
    ).toBeInTheDocument()
  })

  it('opens confirmation dialog when button is clicked', async () => {
    mockGetHistoryMode.mockReturnValue('idb')
    render(<ClearHistorySettings />)

    fireEvent.click(screen.getByRole('button', { name: /clear history/i }))

    await waitFor(() => {
      expect(screen.getByText(/clear all history/i)).toBeInTheDocument()
    })
  })

  it('calls clearAll and dispatches event on confirm', async () => {
    mockGetHistoryMode.mockReturnValue('idb')
    const dispatchSpy = dispatchEvent_spy()

    render(<ClearHistorySettings />)

    fireEvent.click(screen.getByRole('button', { name: /clear history/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^clear$/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /^clear$/i }))

    await waitFor(() => {
      expect(mockClearAll).toHaveBeenCalledTimes(1)
    })

    expect(mockPush).toHaveBeenCalledWith('/')
    expect(
      dispatchSpy.mock.calls.some(
        ([ev]) => ev instanceof CustomEvent && ev.type === 'chat-history-updated'
      )
    ).toBe(true)
  })
})

// --------------------------------------------------------------------------
// ClearHistoryDropdownItem
// --------------------------------------------------------------------------

describe('ClearHistoryDropdownItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClearAll.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Helper: render the item inside a required DropdownMenu context with the
  // menu open so items are accessible in the DOM
  function renderInMenu() {
    return render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <ClearHistoryDropdownItem />
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  it('renders nothing when mode is "db"', () => {
    mockGetHistoryMode.mockReturnValue('db')
    const { container } = render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <ClearHistoryDropdownItem />
        </DropdownMenuContent>
      </DropdownMenu>
    )
    expect(container.querySelector('[role="menuitem"]')).toBeNull()
  })

  it('renders a menu item when mode is "idb"', () => {
    mockGetHistoryMode.mockReturnValue('idb')
    renderInMenu()
    expect(screen.getByText(/clear history/i)).toBeInTheDocument()
  })

  it('has destructive styling on the menu item', () => {
    mockGetHistoryMode.mockReturnValue('idb')
    renderInMenu()
    const item = screen.getByText(/clear history/i).closest('[role="menuitem"]')
    expect(item).toHaveClass('text-destructive')
  })
})
