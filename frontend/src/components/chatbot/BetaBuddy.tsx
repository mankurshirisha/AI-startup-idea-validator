import React, { useState, useRef, useEffect, useCallback } from 'react'
import { ChatButton } from './ChatButton'
import { ChatWindow } from './ChatWindow'
import type { ChatMessageItem } from './ChatBody'

export const BetaBuddy: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [inputText, setInputText] = useState('')
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)

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

  // Chip click handler — populates input text
  const handleSelectChip = useCallback((chipLabel: string) => {
    setInputText(chipLabel)
  }, [])

  // Form submit handler — pure UI representation
  const handleSubmit = (e: React.FormEvent) => {
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

    // Demo UI timeout simulation (frontend only, no API/backend)
    setTimeout(() => {
      setIsLoadingPreview(false)
      const botMsg: ChatMessageItem = {
        id: `bot_${Date.now()}`,
        sender: 'assistant',
        text: `Here is the insights breakdown regarding "${text}" based on your startup validation dashboard.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, botMsg])
    }, 1200)
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
