import { z } from 'zod'

// Per-question item fields (standard — optional inputLabel/inputPlaceholder)
const questionItemSchema = z.object({
  question: z.string().describe('The main question to ask the user'),
  options: z
    .array(
      z.object({
        value: z.string().describe('Option identifier (always in English)'),
        label: z.string().describe('Display text for the option')
      })
    )
    .describe('List of predefined options'),
  allowsInput: z.boolean().describe('Whether to allow free-form text input'),
  inputLabel: z.string().optional().describe('Label for free-form input field'),
  inputPlaceholder: z
    .string()
    .optional()
    .describe('Placeholder text for input field')
})

// Per-question item fields (strict — all fields required, for models like o3-mini)
const strictQuestionItemSchema = z.object({
  question: z.string().describe('The main question to ask the user'),
  options: z
    .array(
      z.object({
        value: z.string().describe('Option identifier (always in English)'),
        label: z.string().describe('Display text for the option')
      })
    )
    .describe('List of predefined options'),
  allowsInput: z.boolean().describe('Whether to allow free-form text input'),
  inputLabel: z.string().describe('Label for free-form input field'),
  inputPlaceholder: z.string().describe('Placeholder text for input field')
})

/**
 * Coerces a legacy flat question object (single `question` field, no `questions`
 * array) into the new envelope format so old AI responses remain valid.
 */
function coerceLegacyFormat(input: unknown): unknown {
  if (input !== null && typeof input === 'object' && !Array.isArray(input)) {
    const obj = input as Record<string, unknown>
    if ('question' in obj && !('questions' in obj)) {
      return { questions: [obj] }
    }
  }
  return input
}

// Standard schema with optional fields for inputLabel and inputPlaceholder
export const questionSchema = z.preprocess(
  coerceLegacyFormat,
  z.object({
    questions: z
      .array(questionItemSchema)
      .min(1)
      .max(3)
      .describe('List of 1–3 clarifying questions to ask the user')
  })
)

// Strict schema with all fields required, for specific models like o3-mini
export const strictQuestionSchema = z.preprocess(
  coerceLegacyFormat,
  z.object({
    questions: z
      .array(strictQuestionItemSchema)
      .min(1)
      .max(3)
      .describe('List of 1–3 clarifying questions to ask the user')
  })
)

/**
 * Returns the appropriate question schema based on the full model name.
 * Uses the strict schema for OpenAI models starting with 'o'.
 */
export function getQuestionSchemaForModel(fullModel: string) {
  const [provider, modelName] = fullModel?.split(':') ?? []
  const useStrictSchema =
    (provider === 'openai' || provider === 'azure') &&
    modelName?.startsWith('o')
  return useStrictSchema ? strictQuestionSchema : questionSchema
}
