import { useState, MutableRefObject } from 'react'
import type { Item, ChatEntry, Attachment, InferenceStats } from './types'
import { reseatIds } from './types'

interface UseChatHistoryParams {
  cwd: string
  items: Item[]
  setItems: React.Dispatch<React.SetStateAction<Item[]>>
  setConnected: React.Dispatch<React.SetStateAction<boolean>>
  setQueue: React.Dispatch<React.SetStateAction<{ text: string; images: Attachment[] }[]>>
  resetSessionStats: () => void
  /** Re-seed the context meter from the switched-in chat's persisted stat. */
  setLastInference: (v: InferenceStats | null) => void
  connected: boolean
  busy: boolean
  loadedRef: MutableRefObject<boolean>
}

export function useChatHistory({
  cwd,
  items,
  setItems,
  setConnected,
  setQueue,
  resetSessionStats,
  setLastInference,
  connected,
  busy,
  loadedRef,
}: UseChatHistoryParams) {
  const [chats, setChats] = useState<ChatEntry[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)

  /** Force-write the transcript now — the autosave debounce may be pending. */
  const flushTranscript = async (): Promise<void> => {
    if (loadedRef.current) await window.codehamr.writeTranscript(cwd, items)
  }

  const loadChats = async (): Promise<void> => {
    setChats(await window.codehamr.listChats(cwd))
  }

  const loadTranscriptFromDisk = async (): Promise<void> => {
    const saved = (await window.codehamr.readTranscript(cwd)) as Item[] | null
    if (Array.isArray(saved)) {
      reseatIds(saved)
      setItems(saved.map((it) => ('streaming' in it ? { ...it, streaming: false } : it)))
    } else {
      setItems([])
    }
  }

  /** Re-seed the context meter from the live chat's persisted context.json.
   *  Called after a switch/new swaps the live pair on disk. */
  const restoreContextStat = async (): Promise<void> => {
    const stat = await window.codehamr.readContextStat(cwd)
    if (stat && stat.promptTokens > 0) {
      setLastInference({
        promptTokens: stat.promptTokens,
        completionTokens: 0,
        contextWindow: stat.contextWindow,
      })
    }
  }

  const newChat = async (): Promise<void> => {
    if (!connected || busy) return
    setHistoryOpen(false)
    await flushTranscript()
    setConnected(false)
    await window.codehamr.newChatSession(cwd) // archives the current pair
    setItems([])
    setQueue([])
    resetSessionStats() // fresh chat: no context.json yet, meter starts empty
    await window.codehamr.startAgent(cwd)
  }

  const switchToChat = async (id: string): Promise<void> => {
    setHistoryOpen(false)
    if (busy || chats.find((c) => c.id === id)?.current) return
    await flushTranscript()
    setConnected(false)
    await window.codehamr.switchChat(cwd, id)
    await loadTranscriptFromDisk()
    setQueue([])
    resetSessionStats()
    // switchChat swapped context.json to the target chat's; re-seed the meter
    // from it (after reset, so this value is what sticks and re-persists).
    await restoreContextStat()
    await window.codehamr.startAgent(cwd)
  }

  const removeChat = async (id: string): Promise<void> => {
    await window.codehamr.deleteChat(cwd, id)
    await loadChats()
  }

  return {
    chats,
    historyOpen,
    setHistoryOpen,
    flushTranscript,
    loadChats,
    loadTranscriptFromDisk,
    newChat,
    switchToChat,
    removeChat,
  }
}
