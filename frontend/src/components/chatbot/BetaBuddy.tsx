import React, { useState, useRef, useEffect, useCallback } from 'react'
import api from '@/lib/api'
import { ChatButton } from './ChatButton'
import { ChatWindow } from './ChatWindow'
import type { ChatMessageItem } from './ChatBody'
import type { SavedConversation } from './ChatSidebar'

interface BetaBuddyProps {
  validationResult?: any
}

const STORAGE_KEY_CHATS = 'betabuddy_saved_chats_v1'
const STORAGE_KEY_ACTIVE = 'betabuddy_active_chat_id'

export const BetaBuddy: React.FC<BetaBuddyProps> = ({ validationResult }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [inputText, setInputText] = useState('')
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Persistent session ID state with ref for stable callback access
  const [sessionId, setSessionId] = useState(() => `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`)
  const currentSessionIdRef = useRef(sessionId)

  useEffect(() => {
    currentSessionIdRef.current = sessionId
  }, [sessionId])

  // Derive stable dashboard ID from validation result
  const dashboardId = React.useMemo(() => {
    if (validationResult?.idea) {
      const sanitized = validationResult.idea.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 24)
      return `dash_${sanitized}`
    }
    return 'dash_default_session'
  }, [validationResult])

  // Transparently initialize or recreate session on backend
  const ensureSession = useCallback(async (): Promise<string> => {
    try {
      const res = await api.post('/chat/session', { dashboard_id: dashboardId })
      if (res.data?.session_id) {
        const newSid = res.data.session_id
        setSessionId(newSid)
        currentSessionIdRef.current = newSid
        console.log(`[DIAGNOSTICS] Session Created | session_id: '${newSid}' | timestamp: '${new Date().toISOString()}'`)
        return newSid
      }
    } catch (e) {
      console.warn('Backend session registration fallback:', e)
    }
    return currentSessionIdRef.current
  }, [dashboardId])

  // Register session on mount & dashboard switch
  useEffect(() => {
    ensureSession()
  }, [ensureSession])

  // Saved Conversations History State from localStorage
  const [conversations, setConversations] = useState<SavedConversation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CHATS)
      return saved ? JSON.parse(saved) : []
    } catch (e) {
      console.error('Failed to load conversations from localStorage:', e)
      return []
    }
  })

  // Active Chat ID State from localStorage
  const [activeChatId, setActiveChatId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_ACTIVE) || null
    } catch (e) {
      return null
    }
  })

  // Active Chat Messages State
  const [messages, setMessages] = useState<ChatMessageItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CHATS)
      const activeId = localStorage.getItem(STORAGE_KEY_ACTIVE)
      if (saved && activeId) {
        const chats: SavedConversation[] = JSON.parse(saved)
        const found = chats.find((c) => c.id === activeId)
        if (found) return found.messages
      }
    } catch (e) {
      console.error('Failed to restore active chat messages:', e)
    }
    return []
  })

  const scrollRef = useRef<HTMLDivElement>(null)

  // Persist conversations & active ID whenever updated
  const saveToStorage = (updatedChats: SavedConversation[], activeId: string | null) => {
    try {
      localStorage.setItem(STORAGE_KEY_CHATS, JSON.stringify(updatedChats))
      if (activeId) {
        localStorage.setItem(STORAGE_KEY_ACTIVE, activeId)
      } else {
        localStorage.removeItem(STORAGE_KEY_ACTIVE)
      }
    } catch (e) {
      console.error('Failed to persist conversations:', e)
    }
  }

  // Scroll to bottom on message change or preview load
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [isOpen, messages, isLoadingPreview])

  // Toggle open/close window
  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  // Toggle history sidebar
  const handleToggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev)
  }, [])

  // Start a New Chat
  const handleNewChat = useCallback(() => {
    setActiveChatId(null)
    setMessages([])
    try {
      localStorage.removeItem(STORAGE_KEY_ACTIVE)
    } catch (e) {}
  }, [])

  // Select an existing conversation
  const handleSelectChat = useCallback((id: string) => {
    setActiveChatId(id)
    setConversations((prev) => {
      const found = prev.find((c) => c.id === id)
      if (found) {
        setMessages(found.messages)
      }
      return prev
    })
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE, id)
    } catch (e) {}
  }, [])

  // Rename a conversation title
  const handleRenameChat = useCallback((id: string, newTitle: string) => {
    setConversations((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
      saveToStorage(updated, activeChatId)
      return updated
    })
  }, [activeChatId])

  // Delete a conversation
  const handleDeleteChat = useCallback((id: string) => {
    setConversations((prev) => {
      const updated = prev.filter((c) => c.id !== id)
      const nextActiveId = activeChatId === id ? null : activeChatId
      if (activeChatId === id) {
        setActiveChatId(null)
        setMessages([])
      }
      saveToStorage(updated, nextActiveId)
      return updated
    })
  }, [activeChatId])

  // Chip click handler — populates input text
  const handleSelectChip = useCallback((chipLabel: string) => {
    setInputText(chipLabel)
  }, [])

  // Form submit handler — sends question with session retry recovery logic
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = inputText.trim()
    if (!text || isLoadingPreview) return

    // Create user message UI entry
    const userMsg: ChatMessageItem = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInputText('')
    setIsLoadingPreview(true)

    // Synchronize current chat in conversations list
    let currentChatId = activeChatId
    if (!currentChatId) {
      currentChatId = `chat_${Date.now()}`
      const chatTitle = text.length > 28 ? `${text.slice(0, 28)}...` : text
      const newChat: SavedConversation = {
        id: currentChatId,
        title: chatTitle,
        messages: nextMessages,
        updatedAt: Date.now(),
      }
      setActiveChatId(currentChatId)
      setConversations((prev) => {
        const updated = [newChat, ...prev]
        saveToStorage(updated, currentChatId)
        return updated
      })
    } else {
      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.id === currentChatId
            ? { ...c, messages: nextMessages, updatedAt: Date.now() }
            : c
        )
        saveToStorage(updated, currentChatId)
        return updated
      })
    }

    let activeSid = currentSessionIdRef.current

    try {
      let res: any
      try {
        // Attempt 1: Standard API Call
        console.log(`[DIAGNOSTICS] Session Retrieved | session_id: '${activeSid}' | timestamp: '${new Date().toISOString()}'`)
        res = await api.post('/chat/', {
          session_id: activeSid,
          dashboard_id: dashboardId,
          question: text,
          validation_result: validationResult || null,
        })
      } catch (firstErr: any) {
        const errDetail = String(firstErr.response?.data?.detail || '')
        const status = firstErr.response?.status

        // Check if error is due to session expiration / missing session ID
        if (
          status === 401 ||
          errDetail.toLowerCase().includes('expired') ||
          errDetail.toLowerCase().includes('does not exist') ||
          errDetail.toLowerCase().includes('not found')
        ) {
          console.warn(`[DIAGNOSTICS] Session Expired | session_id: '${activeSid}' | timestamp: '${new Date().toISOString()}'`)
          console.warn(`[DIAGNOSTICS] Retry Triggered | session_id: '${activeSid}' | timestamp: '${new Date().toISOString()}'`)

          // Transparently recreate session on backend & retry ONCE
          activeSid = await ensureSession()
          console.log(`[DIAGNOSTICS] Session Recreated | session_id: '${activeSid}' | timestamp: '${new Date().toISOString()}'`)

          res = await api.post('/chat/', {
            session_id: activeSid,
            dashboard_id: dashboardId,
            question: text,
            validation_result: validationResult || null,
          })
        } else {
          throw firstErr
        }
      }

      console.log(`[DIAGNOSTICS] Session Refreshed | session_id: '${activeSid}' | timestamp: '${new Date().toISOString()}'`)

      const status = res.data?.status || 'success'
      const rawAnswer = res.data?.response

      let answer = rawAnswer
      if (status === 'clarification_required') {
        answer = rawAnswer || "Could you rephrase your question? I can answer questions about your startup validation dashboard."
      } else if (!answer) {
        answer = "I'm having trouble generating a detailed response right now. Please ask about your validation score, SWOT, or competitors."
      }

      const botMsg: ChatMessageItem = {
        id: `bot_${Date.now()}`,
        sender: 'assistant',
        text: answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev) => {
        const finalMessages = [...prev, botMsg]
        if (currentChatId) {
          setConversations((chats) => {
            const updated = chats.map((c) =>
              c.id === currentChatId
                ? { ...c, messages: finalMessages, updatedAt: Date.now() }
                : c
            )
            saveToStorage(updated, currentChatId)
            return updated
          })
        }
        return finalMessages
      })
    } catch (err: any) {
      console.error('BetaBuddy API error after retry:', err)
      const rawDetail = err.response?.data?.detail || err.response?.data?.response
      const errDetail = typeof rawDetail === 'string' && !rawDetail.toLowerCase().includes('expired')
        ? rawDetail
        : "I'm having trouble processing your question right now. Based on your dashboard, please review your metrics above while AI reconnects."

      const botMsg: ChatMessageItem = {
        id: `bot_err_${Date.now()}`,
        sender: 'assistant',
        text: errDetail,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev) => {
        const finalMessages = [...prev, botMsg]
        if (currentChatId) {
          setConversations((chats) => {
            const updated = chats.map((c) =>
              c.id === currentChatId
                ? { ...c, messages: finalMessages, updatedAt: Date.now() }
                : c
            )
            saveToStorage(updated, currentChatId)
            return updated
          })
        }
        return finalMessages
      })
    } finally {
      setIsLoadingPreview(false)
    }
  }

  return (
    <>
      <ChatButton isOpen={isOpen} onClick={handleToggle} />
      <ChatWindow
        isOpen={isOpen}
        onClose={handleToggle}
        messages={messages}
        inputText={inputText}
        onInputChange={setInputText}
        onSubmit={handleSubmit}
        onSelectChip={handleSelectChip}
        isLoadingPreview={isLoadingPreview}
        scrollRef={scrollRef}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={handleToggleSidebar}
        conversations={conversations}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onRenameChat={handleRenameChat}
        onDeleteChat={handleDeleteChat}
      />
    </>
  )
}

BetaBuddy.displayName = 'BetaBuddy'
export default BetaBuddy
