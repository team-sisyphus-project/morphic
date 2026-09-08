import { describe, expect, it } from 'vitest'

import 'fake-indexeddb/auto'

import { IdbHistoryRepository } from './idb-repository'
import { saveConversationToIdb } from './idb-save-chat'

/** Build a minimal UIMessage-like object for test purposes. */
function msg(role: 'user' | 'assistant', text: string, id = 'm1') {
  return { id, role, parts: [{ type: 'text' as const, text }] } as any
}

describe('saveConversationToIdb', () => {
  it('saves a chat with the title taken from the first user message', async () => {
    const repo = new IdbHistoryRepository('test-save-1')

    await saveConversationToIdb(repo, 'chat-a', [msg('user', 'Hello world')])

    const chat = await repo.getChat('chat-a')
    expect(chat).not.toBeNull()
    expect(chat?.id).toBe('chat-a')
    expect(chat?.title).toBe('Hello world')
    expect(chat?.createdAt).toBeInstanceOf(Date)
  })

  it('uses "Untitled" when there are no messages', async () => {
    const repo = new IdbHistoryRepository('test-save-2')

    await saveConversationToIdb(repo, 'chat-b', [])

    const chat = await repo.getChat('chat-b')
    expect(chat?.title).toBe('Untitled')
  })

  it('uses "Untitled" when there is no user message', async () => {
    const repo = new IdbHistoryRepository('test-save-3')

    await saveConversationToIdb(repo, 'chat-c', [
      msg('assistant', 'Hi there!')
    ])

    const chat = await repo.getChat('chat-c')
    expect(chat?.title).toBe('Untitled')
  })

  it('truncates long titles to 100 characters', async () => {
    const repo = new IdbHistoryRepository('test-save-4')
    const longText = 'A'.repeat(200)

    await saveConversationToIdb(repo, 'chat-d', [msg('user', longText)])

    const chat = await repo.getChat('chat-d')
    expect(chat?.title).toBe('A'.repeat(100))
  })

  it('overwrites an existing chat when called twice with the same id', async () => {
    const repo = new IdbHistoryRepository('test-save-5')

    await saveConversationToIdb(repo, 'chat-e', [msg('user', 'First question')])
    await saveConversationToIdb(repo, 'chat-e', [msg('user', 'Second question')])

    const chat = await repo.getChat('chat-e')
    expect(chat?.title).toBe('Second question')
  })

  it('picks the first user message when there are multiple', async () => {
    const repo = new IdbHistoryRepository('test-save-6')

    await saveConversationToIdb(repo, 'chat-f', [
      msg('user', 'First', 'm1'),
      msg('assistant', 'Answer', 'm2'),
      msg('user', 'Second', 'm3')
    ])

    const chat = await repo.getChat('chat-f')
    expect(chat?.title).toBe('First')
  })
})
