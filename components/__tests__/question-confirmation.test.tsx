'use client'

import React from 'react'

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { QuestionConfirmation } from '../question-confirmation'

// ---------------------------------------------------------------------------
// Minimal mocks for shadcn/ui primitives used inside QuestionConfirmation
// ---------------------------------------------------------------------------

vi.mock('@/components/ui/card', () => ({
  Card: ({
    children,
    className
  }: {
    children: React.ReactNode
    className?: string
  }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({
    children,
    className
  }: {
    children: React.ReactNode
    className?: string
  }) => <h2 className={className}>{children}</h2>,
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  )
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    type,
    disabled
  }: {
    children: React.ReactNode
    onClick?: () => void
    type?: string
    disabled?: boolean
  }) => (
    <button
      type={(type as 'button' | 'submit' | 'reset') ?? 'button'}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}))

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({
    id,
    checked,
    onCheckedChange
  }: {
    id: string
    checked: boolean
    onCheckedChange: () => void
  }) => (
    <input
      type="checkbox"
      id={id}
      data-testid={`checkbox-${id}`}
      checked={checked}
      onChange={onCheckedChange}
    />
  )
}))

vi.mock('@/components/ui/input', () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    id
  }: {
    value: string
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    placeholder?: string
    id?: string
  }) => (
    <input
      type="text"
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      data-testid={`input-${id}`}
    />
  )
}))

vi.mock('@tabler/icons-react', () => ({
  IconArrowRight: () => <span data-testid="icon-arrow-right" />,
  IconCheck: () => <span data-testid="icon-check" />,
  IconPlayerTrackNext: () => <span data-testid="icon-skip" />
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeToolPart = (
  input: Record<string, unknown>,
  state: 'input-available' | 'output-available' = 'input-available',
  output?: Record<string, unknown>
) => ({
  type: 'tool-askQuestion' as const,
  toolCallId: 'tc-001',
  state,
  input,
  output
})

const Q1 = {
  question: 'What is your goal?',
  options: [
    { value: 'learn', label: 'Learn' },
    { value: 'build', label: 'Build' }
  ],
  allowsInput: false
}

const Q2 = {
  question: 'What level are you?',
  options: [
    { value: 'beginner', label: 'Beginner' },
    { value: 'expert', label: 'Expert' }
  ],
  allowsInput: true,
  inputLabel: 'Other level',
  inputPlaceholder: 'Describe your level'
}

const Q3 = {
  question: 'Preferred format?',
  options: [
    { value: 'video', label: 'Video' },
    { value: 'text', label: 'Text' }
  ],
  allowsInput: false
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('QuestionConfirmation — multi-question rendering', () => {
  test('renders all question texts for a 3-question input', () => {
    render(
      <QuestionConfirmation
        toolInvocation={makeToolPart({ questions: [Q1, Q2, Q3] }) as any}
        onConfirm={vi.fn()}
      />
    )

    expect(screen.getByText('What is your goal?')).toBeDefined()
    expect(screen.getByText('What level are you?')).toBeDefined()
    expect(screen.getByText('Preferred format?')).toBeDefined()
  })

  test('renders options for each question', () => {
    render(
      <QuestionConfirmation
        toolInvocation={makeToolPart({ questions: [Q1, Q2] }) as any}
        onConfirm={vi.fn()}
      />
    )

    expect(screen.getByText('Learn')).toBeDefined()
    expect(screen.getByText('Build')).toBeDefined()
    expect(screen.getByText('Beginner')).toBeDefined()
    expect(screen.getByText('Expert')).toBeDefined()
  })

  test('renders free-text input only for questions with allowsInput=true', () => {
    render(
      <QuestionConfirmation
        toolInvocation={makeToolPart({ questions: [Q1, Q2] }) as any}
        onConfirm={vi.fn()}
      />
    )

    // Q2 has allowsInput, Q1 does not
    expect(screen.getByPlaceholderText('Describe your level')).toBeDefined()
  })

  test('normalises legacy flat input ({ question, options, ... }) to single-question array', () => {
    render(
      <QuestionConfirmation
        toolInvocation={makeToolPart(Q1) as any}
        onConfirm={vi.fn()}
      />
    )

    expect(screen.getByText('What is your goal?')).toBeDefined()
    expect(screen.getByText('Learn')).toBeDefined()
  })
})

describe('QuestionConfirmation — submit button state', () => {
  test('submit button is disabled initially (nothing selected)', () => {
    render(
      <QuestionConfirmation
        toolInvocation={makeToolPart({ questions: [Q1, Q2] }) as any}
        onConfirm={vi.fn()}
      />
    )

    const submitBtn = screen.getByRole('button', { name: /send/i })
    expect((submitBtn as HTMLButtonElement).disabled).toBe(true)
  })

  test('submit button enables after selecting an option in any question', () => {
    render(
      <QuestionConfirmation
        toolInvocation={makeToolPart({ questions: [Q1, Q2] }) as any}
        onConfirm={vi.fn()}
      />
    )

    fireEvent.click(screen.getByLabelText('Learn'))

    const submitBtn = screen.getByRole('button', { name: /send/i })
    expect((submitBtn as HTMLButtonElement).disabled).toBe(false)
  })
})

describe('QuestionConfirmation — submit collects all answers', () => {
  test('onConfirm called with answers array containing all questions', () => {
    const onConfirm = vi.fn()

    render(
      <QuestionConfirmation
        toolInvocation={makeToolPart({ questions: [Q1, Q2] }) as any}
        onConfirm={onConfirm}
      />
    )

    // Select one option in Q1
    fireEvent.click(screen.getByLabelText('Learn'))
    // Select one option in Q2
    fireEvent.click(screen.getByLabelText('Expert'))
    // Type in Q2's free-text input
    const textInput = screen.getByPlaceholderText('Describe your level')
    fireEvent.change(textInput, { target: { value: 'mid-level' } })

    fireEvent.click(screen.getByRole('button', { name: /send/i }))

    expect(onConfirm).toHaveBeenCalledOnce()
    const [toolCallId, approved, response] = onConfirm.mock.calls[0]
    expect(toolCallId).toBe('tc-001')
    expect(approved).toBe(true)
    expect(response).toMatchObject({
      answers: [
        {
          question: 'What is your goal?',
          selectedOptions: ['Learn'],
          inputText: ''
        },
        {
          question: 'What level are you?',
          selectedOptions: ['Expert'],
          inputText: 'mid-level'
        }
      ]
    })
  })

  test('legacy format: onConfirm passes single-item answers array', () => {
    const onConfirm = vi.fn()

    render(
      <QuestionConfirmation
        toolInvocation={makeToolPart(Q1) as any}
        onConfirm={onConfirm}
      />
    )

    fireEvent.click(screen.getByLabelText('Build'))
    fireEvent.click(screen.getByRole('button', { name: /send/i }))

    const [, , response] = onConfirm.mock.calls[0]
    expect(response.answers).toHaveLength(1)
    expect(response.answers[0].question).toBe('What is your goal?')
    expect(response.answers[0].selectedOptions).toContain('Build')
  })
})

describe('QuestionConfirmation — skip', () => {
  test('skip calls onConfirm with skipped: true', () => {
    const onConfirm = vi.fn()

    render(
      <QuestionConfirmation
        toolInvocation={makeToolPart({ questions: [Q1] }) as any}
        onConfirm={onConfirm}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /skip/i }))

    expect(onConfirm).toHaveBeenCalledWith('tc-001', false, { skipped: true })
  })
})

describe('QuestionConfirmation — completed view', () => {
  test('shows summary of selected options for all questions when isCompleted', () => {
    const onConfirm = vi.fn()

    render(
      <QuestionConfirmation
        toolInvocation={
          makeToolPart({ questions: [Q1, Q2] }, 'output-available', {
            answers: [
              {
                question: 'What is your goal?',
                selectedOptions: ['Learn'],
                inputText: ''
              },
              {
                question: 'What level are you?',
                selectedOptions: ['Expert'],
                inputText: 'mid-level'
              }
            ]
          }) as any
        }
        onConfirm={onConfirm}
        isCompleted
      />
    )

    expect(screen.getByText('What is your goal?')).toBeDefined()
    expect(screen.getByText(/Learn/)).toBeDefined()
    expect(screen.getByText('What level are you?')).toBeDefined()
    expect(screen.getByText(/Expert/)).toBeDefined()
    expect(screen.getByText(/mid-level/)).toBeDefined()
  })

  test('shows skipped state when output has skipped: true', () => {
    render(
      <QuestionConfirmation
        toolInvocation={
          makeToolPart({ questions: [Q1] }, 'output-available', {
            skipped: true
          }) as any
        }
        onConfirm={vi.fn()}
        isCompleted
      />
    )

    expect(screen.getByTestId('icon-skip')).toBeDefined()
  })
})
