/**
 * Utility for persisting a completed conversation into a HistoryRepository.
 *
 * Extracted into its own module so the logic can be unit-tested independently
 * of the React component that calls it.
 */

import type { UIMessage } from '@/lib/types/ai'
import { getTextFromParts } from '@/lib/utils/message-utils'

import type { HistoryRepository } from './types'

const MAX_TITLE_LENGTH = 100

/**
 * Save (or overwrite) a chat entry in `repository` from the current in-memory
 * messages list.
 *
 * The title is derived from the first user message, capped at 100 characters.
 * Falls back to "Untitled" when the conversation has no user messages or the
 * message text is empty.
 *
 * @param repository  HistoryRepository to write to (IDB in production).
 * @param chatId      Stable identifier for this chat session.
 * @param messages    Current in-memory message list from `useChat`.
 */
export async function saveConversationToIdb(
  repository: HistoryRepository,
  chatId: string,
  messages: UIMessage[]
): Promise<void> {
  const firstUserMessage = messages.find(m => m.role === 'user')
  const rawTitle = firstUserMessage
    ? getTextFromParts(firstUserMessage.parts)
    : ''
  const title = rawTitle.trim().slice(0, MAX_TITLE_LENGTH) || 'Untitled'

  await repository.saveChat({
    id: chatId,
    title,
    createdAt: new Date()
  })
}
