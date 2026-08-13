import React, { useState, useRef, useEffect, useCallback } from 'react'
import api from '@/lib/api'
import { ChatButton } from './ChatButton'
import { ChatWindow } from './ChatWindow'
import type { ChatMessageItem } from './ChatBody'

interface BetaBuddyProps {
  validationResult?: any
}

export const BetaBuddy: React.FC<BetaBuddyProps> = ({ validationResult }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [inputText, setInputText] = useState('')
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)

  // Persistent session ID per widget instance
  const [sessionId] = useState(() => `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`)

  // Derive stable dashboard ID from validation result
  const dashboardId = React.useMemo(() => {
    if (validationResult?.idea) {
      const sanitized = validationResult.idea.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 24)
      return `dash_${sanitized}`
    }
    return 'dash_default_session'
  }, [validationResult])

  // Pure UI Messages state for display
  const [messages, setMessages] = useState<ChatMessageItem[]>([])

  const scrollRef = useRef<HTMLDivElement>(null)

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

  // Chip click handler — populates input text or directly submits chip
  const handleSelectChip = useCallback((chipLabel: string) => {
    setInputText(chipLabel)
  }, [])

  // Form submit handler — sends question to backend FastAPI chat endpoint
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

    setMessages((prev) => [...prev, userMsg])
    setInputText('')
    setIsLoadingPreview(true)

    try {
      // Execute REAL LLM backend call (1 Gemini call)
      const res = await api.post('/chat/', {
        session_id: sessionId,
        dashboard_id: dashboardId,
        question: text,
        validation_result: validationResult || null,
      })

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

      setMessages((prev) => [...prev, botMsg])
    } catch (err: any) {
      console.error('BetaBuddy API error:', err)
      const rawDetail = err.response?.data?.detail || err.response?.data?.response
      const errDetail = typeof rawDetail === 'string'
        ? rawDetail
        : "I'm having trouble processing your question right now. Based on your dashboard, please review your metrics above while AI reconnects."

      const botMsg: ChatMessageItem = {
        id: `bot_err_${Date.now()}`,
        sender: 'assistant',
        text: errDetail,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, botMsg])
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
      />
    </>
  )
}

BetaBuddy.displayName = 'BetaBuddy'
export default BetaBuddy
