/**
 * Shared types and the HistoryRepository interface for chat history.
 *
 * Implementations (database, IndexedDB) live elsewhere; this module has no
 * DB or browser imports — only plain TypeScript.
 */

/** A single chat entry stored in the history repository. */
export interface HistoryChat {
  id: string
  title: string
  createdAt: Date
  /** When set, the chat is pinned and sorted before unpinned entries. */
  pinnedAt?: Date
}

/** Options accepted by listChats. */
export interface ListChatsOptions {
  /** Maximum number of chats to return (default: implementation-defined). */
  limit?: number
  /** Zero-based offset into the result set for cursor-style pagination. */
  offset?: number
  /** Free-text filter applied against chat titles. */
  query?: string
}

/** Paginated result returned by listChats. */
export interface ListChatsResult {
  chats: HistoryChat[]
  /** Offset to pass on the next call; null when the list is exhausted. */
  nextOffset: number | null
}

/**
 * Repository interface for chat history.
 *
 * Every method is scoped to the current user; implementations handle
 * user identity internally (e.g., via auth session or a fixed local key).
 */
export interface HistoryRepository {
  /**
   * Return a paginated, optionally filtered list of chats.
   * Pinned chats appear first; within each group chats are newest-first.
   */
  listChats(options?: ListChatsOptions): Promise<ListChatsResult>

  /**
   * Fetch a single chat by id.
   * Returns null when the chat does not exist or is not accessible.
   */
  getChat(id: string): Promise<HistoryChat | null>

  /**
   * Create or fully replace a chat record.
   * The caller supplies the complete HistoryChat value; implementations
   * must not merge with an existing record.
   */
  saveChat(chat: HistoryChat): Promise<HistoryChat>

  /**
   * Permanently delete a chat by id.
   * Resolves without error when the chat does not exist.
   */
  deleteChat(id: string): Promise<void>

  /**
   * Delete every chat owned by the current user.
   */
  clearAll(): Promise<void>

  /**
   * Pin or unpin a chat.
   * @param id    - The chat to update.
   * @param pinned - true to pin (sets pinnedAt to now), false to unpin (clears pinnedAt).
   */
  pinChat(id: string, pinned: boolean): Promise<void>
}
