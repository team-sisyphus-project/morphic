'use client'

import { useState } from 'react'

import {
  IconArrowRight as ArrowRight,
  IconCheck as Check,
  IconPlayerTrackNext as SkipForward
} from '@tabler/icons-react'

import type { ToolPart } from '@/lib/types/ai'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuestionOption {
  value: string
  label: string
}

interface QuestionItem {
  question: string
  options: QuestionOption[]
  allowsInput?: boolean
  inputLabel?: string
  inputPlaceholder?: string
}

interface QuestionAnswer {
  question: string
  selectedOptions: string[]
  inputText: string
}

interface QuestionConfirmationProps {
  toolInvocation: ToolPart<'askQuestion'>
  onConfirm: (toolCallId: string, approved: boolean, response?: any) => void
  isCompleted?: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalise the raw tool input into an array of QuestionItem objects.
 * Supports the new `{ questions: [...] }` envelope and the legacy flat
 * `{ question, options, ... }` shape produced by older AI models.
 */
function normaliseQuestions(input: unknown): QuestionItem[] {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return []
  }
  const obj = input as Record<string, unknown>

  // New envelope format
  if (Array.isArray(obj.questions)) {
    return obj.questions as QuestionItem[]
  }

  // Legacy flat format — wrap into a single-element array
  if (typeof obj.question === 'string') {
    return [obj as unknown as QuestionItem]
  }

  return []
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuestionConfirmation({
  toolInvocation,
  onConfirm,
  isCompleted = false
}: QuestionConfirmationProps) {
  const questions = normaliseQuestions(toolInvocation.input)

  // Per-question answer state: selectedOptions[] + inputText
  const [answers, setAnswers] = useState<QuestionAnswer[]>(() =>
    questions.map(q => ({
      question: q.question,
      selectedOptions: [],
      inputText: ''
    }))
  )
  const [completed, setCompleted] = useState(isCompleted)
  const [skipped, setSkipped] = useState(false)

  // Result data from a completed tool invocation
  const resultData =
    toolInvocation.state === 'output-available' && toolInvocation.output
      ? (toolInvocation.output as Record<string, unknown>)
      : null

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleOptionChange = (questionIdx: number, label: string) => {
    setAnswers(prev =>
      prev.map((ans, i) => {
        if (i !== questionIdx) return ans
        const already = ans.selectedOptions.includes(label)
        return {
          ...ans,
          selectedOptions: already
            ? ans.selectedOptions.filter(o => o !== label)
            : [...ans.selectedOptions, label]
        }
      })
    )
  }

  const handleInputChange = (
    questionIdx: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value
    setAnswers(prev =>
      prev.map((ans, i) =>
        i === questionIdx ? { ...ans, inputText: value } : ans
      )
    )
  }

  const handleSkip = () => {
    setSkipped(true)
    setCompleted(true)
    onConfirm(toolInvocation.toolCallId, false, { skipped: true })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onConfirm(toolInvocation.toolCallId, true, { answers })
    setCompleted(true)
  }

  // Submit is disabled only when all questions are entirely unanswered
  const isSubmitDisabled = answers.every((ans, i) => {
    const q = questions[i]
    return (
      ans.selectedOptions.length === 0 &&
      (!q?.allowsInput || ans.inputText.trim() === '')
    )
  })

  // -------------------------------------------------------------------------
  // Completed / result view
  // -------------------------------------------------------------------------

  if (completed || toolInvocation.state === 'output-available') {
    const wasSkipped = skipped || resultData?.skipped === true

    const displayAnswers: QuestionAnswer[] = (() => {
      if (resultData && Array.isArray((resultData as any).answers)) {
        return (resultData as any).answers as QuestionAnswer[]
      }
      return answers
    })()

    return (
      <Card className="p-3 md:p-4 w-full flex flex-col gap-2">
        {wasSkipped ? (
          <div className="flex items-center gap-1">
            <SkipForward size={16} className="text-yellow-500 w-4 h-4" />
            <span className="text-muted-foreground text-xs">
              Questions skipped
            </span>
          </div>
        ) : (
          <>
            {displayAnswers.map((ans, i) => (
              <div key={i} className="w-full">
                <CardTitle className="text-sm font-medium text-muted-foreground w-full mb-0.5">
                  {ans.question}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Check size={14} className="text-green-500 shrink-0" />
                  <p className="text-xs text-muted-foreground truncate">
                    {[
                      ans.selectedOptions.length > 0
                        ? ans.selectedOptions.join(', ')
                        : null,
                      ans.inputText?.trim() !== '' ? ans.inputText : null
                    ]
                      .filter(Boolean)
                      .join(' | ') || '—'}
                  </p>
                </div>
              </div>
            ))}
          </>
        )}
      </Card>
    )
  }

  // -------------------------------------------------------------------------
  // Active (interactive) view
  // -------------------------------------------------------------------------

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {questions.length === 1
            ? questions[0].question
            : 'A few quick questions'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6 mb-6">
            {questions.map((q, qi) => (
              <div key={qi} className="flex flex-col gap-2">
                {/* Section label — only shown for multi-question */}
                {questions.length > 1 && (
                  <p className="text-sm font-medium leading-snug">
                    {q.question}
                  </p>
                )}

                {/* Checkbox options */}
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {q.options.map((option, oi) => (
                    <div
                      key={`q${qi}-opt${oi}`}
                      className="flex items-center space-x-1.5"
                    >
                      <Checkbox
                        id={`q${qi}-${option.value}`}
                        checked={answers[qi]?.selectedOptions.includes(
                          option.label
                        )}
                        onCheckedChange={() =>
                          handleOptionChange(qi, option.label)
                        }
                      />
                      <label
                        className="text-sm whitespace-nowrap"
                        htmlFor={`q${qi}-${option.value}`}
                      >
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>

                {/* Optional free-text input */}
                {q.allowsInput && (
                  <div className="flex flex-col space-y-1 text-sm">
                    {q.inputLabel && (
                      <label
                        className="text-muted-foreground"
                        htmlFor={`q${qi}-text`}
                      >
                        {q.inputLabel}
                      </label>
                    )}
                    <Input
                      type="text"
                      id={`q${qi}-text`}
                      className="w-full"
                      placeholder={q.inputPlaceholder ?? ''}
                      value={answers[qi]?.inputText ?? ''}
                      onChange={e => handleInputChange(qi, e)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleSkip}>
              <SkipForward size={16} className="mr-1" />
              Skip
            </Button>
            <Button type="submit" disabled={isSubmitDisabled}>
              <ArrowRight size={16} className="mr-1" />
              Send
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
