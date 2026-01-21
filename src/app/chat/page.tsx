'use client'

import { useState, useRef, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { Send, Loader2, Bot, User, Sparkles } from 'lucide-react'

interface Message {
    role: 'user' | 'assistant'
    content: string
}

const suggestedQuestions = [
    'Chi tiêu tháng này bao nhiêu?',
    'So sánh với tháng trước?',
    'Tôi tiêu nhiều nhất cho gì?',
    'Làm sao để tiết kiệm hơn?',
]

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [conversationId, setConversationId] = useState<string | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const sendMessage = async (messageText?: string) => {
        const text = messageText || input
        if (!text.trim() || loading) return

        const userMessage: Message = { role: 'user', content: text }
        setMessages(prev => [...prev, userMessage])
        setInput('')
        setLoading(true)

        try {
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    conversationId,
                }),
            })

            const data = await res.json()

            if (data.conversationId) {
                setConversationId(data.conversationId)
            }

            const assistantMessage: Message = {
                role: 'assistant',
                content: data.response || 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.'
            }
            setMessages(prev => [...prev, assistantMessage])
        } catch (error) {
            console.error('Chat error:', error)
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.',
            }])
        } finally {
            setLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f]">
            <Sidebar />

            <main className="ml-64 min-h-screen flex flex-col">
                <Header
                    title="AI Chat"
                    subtitle="Hỏi đáp về chi tiêu với trợ lý AI"
                />

                <div className="flex-1 flex flex-col p-8">
                    {/* Messages area */}
                    <div className="flex-1 overflow-y-auto pb-4">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center animate-fade-in">
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-6">
                                    <Sparkles className="w-10 h-10 text-indigo-400" />
                                </div>
                                <h2 className="text-2xl font-bold mb-2">Xin chào!</h2>
                                <p className="text-gray-400 mb-8 text-center max-w-md">
                                    Tôi là trợ lý AI của bạn. Hãy hỏi tôi bất cứ điều gì về chi tiêu của bạn!
                                </p>

                                <div className="grid grid-cols-2 gap-3 max-w-lg w-full">
                                    {suggestedQuestions.map((question, i) => (
                                        <button
                                            key={i}
                                            onClick={() => sendMessage(question)}
                                            className="p-4 text-left rounded-xl bg-[#12121a] border border-[#2a2a3a] hover:border-indigo-500/50 hover:bg-[#1a1a25] transition-all duration-200"
                                        >
                                            <span className="text-sm text-gray-300">{question}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6 max-w-3xl mx-auto">
                                {messages.map((message, index) => (
                                    <div
                                        key={index}
                                        className={`flex gap-4 animate-fade-in ${message.role === 'user' ? 'flex-row-reverse' : ''
                                            }`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${message.role === 'user'
                                                ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
                                                : 'bg-gradient-to-br from-green-500/20 to-emerald-500/20'
                                            }`}>
                                            {message.role === 'user' ? (
                                                <User className="w-5 h-5 text-white" />
                                            ) : (
                                                <Bot className="w-5 h-5 text-green-400" />
                                            )}
                                        </div>
                                        <div className={`flex-1 max-w-[80%] ${message.role === 'user' ? 'text-right' : ''
                                            }`}>
                                            <div className={`inline-block p-4 rounded-2xl ${message.role === 'user'
                                                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                                                    : 'bg-[#12121a] border border-[#2a2a3a]'
                                                }`}>
                                                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                                    {message.content}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {loading && (
                                    <div className="flex gap-4 animate-fade-in">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                                            <Bot className="w-5 h-5 text-green-400" />
                                        </div>
                                        <div className="bg-[#12121a] border border-[#2a2a3a] p-4 rounded-2xl">
                                            <div className="flex items-center gap-2 text-gray-400">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Đang suy nghĩ...
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>

                    {/* Input area */}
                    <div className="max-w-3xl mx-auto w-full">
                        <div className="relative">
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Nhập câu hỏi của bạn..."
                                rows={1}
                                className="input pr-14 resize-none py-4"
                                disabled={loading}
                            />
                            <button
                                onClick={() => sendMessage()}
                                disabled={!input.trim() || loading}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Send className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 text-center mt-3">
                            AI có thể đưa ra thông tin không chính xác. Hãy kiểm tra lại các thông tin quan trọng.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    )
}
