import { describe, expect, it } from 'vitest'

import {
  getQuestionSchemaForModel,
  questionSchema,
  strictQuestionSchema
} from './question'

const validItem = {
  question: 'What is your goal?',
  options: [
    { value: 'research', label: 'Research' },
    { value: 'write', label: 'Write' }
  ],
  allowsInput: false
}

const validStrictItem = {
  ...validItem,
  inputLabel: 'Other',
  inputPlaceholder: 'Describe…'
}

describe('questionSchema', () => {
  it('accepts a questions array with one item', () => {
    const result = questionSchema.parse({ questions: [validItem] })
    expect(result.questions).toHaveLength(1)
    expect(result.questions[0].question).toBe('What is your goal?')
  })

  it('accepts a questions array with three items', () => {
    const payload = { questions: [validItem, validItem, validItem] }
    const result = questionSchema.parse(payload)
    expect(result.questions).toHaveLength(3)
  })

  it('rejects an empty questions array', () => {
    expect(() => questionSchema.parse({ questions: [] })).toThrow()
  })

  it('rejects more than three questions', () => {
    const payload = {
      questions: [validItem, validItem, validItem, validItem]
    }
    expect(() => questionSchema.parse(payload)).toThrow()
  })

  it('coerces a legacy flat object into a single-item questions array', () => {
    const legacy = {
      question: 'What is your goal?',
      options: [{ value: 'a', label: 'A' }],
      allowsInput: false
    }
    const result = questionSchema.parse(legacy)
    expect(result.questions).toHaveLength(1)
    expect(result.questions[0].question).toBe('What is your goal?')
  })

  it('allows optional inputLabel and inputPlaceholder to be absent', () => {
    const result = questionSchema.parse({ questions: [validItem] })
    expect(result.questions[0].inputLabel).toBeUndefined()
    expect(result.questions[0].inputPlaceholder).toBeUndefined()
  })
})

describe('strictQuestionSchema', () => {
  it('accepts valid strict items', () => {
    const result = strictQuestionSchema.parse({
      questions: [validStrictItem]
    })
    expect(result.questions[0].inputLabel).toBe('Other')
  })

  it('rejects items missing required inputLabel', () => {
    expect(() =>
      strictQuestionSchema.parse({ questions: [validItem] })
    ).toThrow()
  })

  it('coerces a legacy flat strict object', () => {
    const result = strictQuestionSchema.parse(validStrictItem)
    expect(result.questions).toHaveLength(1)
    expect(result.questions[0].inputPlaceholder).toBe('Describe…')
  })
})

describe('getQuestionSchemaForModel', () => {
  it('returns questionSchema for gpt-4o', () => {
    expect(getQuestionSchemaForModel('openai:gpt-4o')).toBe(questionSchema)
  })

  it('returns strictQuestionSchema for openai:o3-mini', () => {
    expect(getQuestionSchemaForModel('openai:o3-mini')).toBe(
      strictQuestionSchema
    )
  })

  it('returns strictQuestionSchema for azure:o1', () => {
    expect(getQuestionSchemaForModel('azure:o1')).toBe(strictQuestionSchema)
  })

  it('returns questionSchema for anthropic models', () => {
    expect(getQuestionSchemaForModel('anthropic:claude-3-5-sonnet')).toBe(
      questionSchema
    )
  })

  it('returns questionSchema for an undefined/empty model string', () => {
    expect(getQuestionSchemaForModel('')).toBe(questionSchema)
  })
})
