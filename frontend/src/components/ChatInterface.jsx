import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Play } from 'lucide-react'
import { apiClient } from '../lib/api'

function SourceChip({ source }) {
  if (typeof source === 'string') {
    return <span className="text-xs bg-white px-2 py-1 rounded">{source}</span>
  }
  if (source?.url) {
    return (
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 hover:bg-red-100 px-2 py-1 rounded transition-colors"
        title={source.label}
      >
        <Play className="w-3 h-3 fill-current" />
        <span className="truncate max-w-[180px]">{source.label}</span>
        {source.timestamp_label && (
          <span className="font-mono font-semibold ml-1">{source.timestamp_label}</span>
        )}
      </a>
    )
  }
  return (
    <span className="text-xs bg-white px-2 py-1 rounded" title={source?.filename}>
      {source?.label || source?.filename || 'Source'}
    </span>
  )
}

function ChatInterface({ kbId, placeholder, greeting, suggestedQuestions, onMissingKey }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text) => {
    if (!text.trim() || loading || !kbId) return

    const userMessage = { role: 'user', content: text, timestamp: new Date() }
    const history = messages
      .filter((m) => !m.isError)
      .map((m) => ({ role: m.role, content: m.content }))

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const { data } = await apiClient.post(`/kb/${kbId}/chat`, {
        message: text,
        history,
      })
      const botMessage = {
        role: 'assistant',
        content: data.response,
        sources: data.sources || [],
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, botMessage])
    } catch (error) {
      if (error.response?.status === 401) {
        onMissingKey?.()
      }
      const errorMessage = {
        role: 'assistant',
        content: error.response?.data?.detail || 'Failed to get response. Make sure your OpenAI API key is set.',
        isError: true,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleSend = () => sendMessage(input)

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-md flex flex-col h-[calc(100vh-250px)] border border-violet-100">
      <div className="p-4 border-b border-violet-100">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Bot className="w-5 h-5 text-violet-600" />
          Chat
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 py-6">
            <div className="text-center max-w-md w-full">
              <div className="inline-flex relative mb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-400 via-fuchsia-400 to-amber-400 rounded-full blur-xl opacity-60 animate-pulse" />
                <div className="relative bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-500 p-4 rounded-full shadow-lg">
                  <Bot className="w-10 h-10 text-white" />
                </div>
              </div>
              <p className="text-gray-700 mb-4">{greeting || 'Ask a question to get started'}</p>

              {suggestedQuestions && suggestedQuestions.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs uppercase tracking-wide text-violet-600 font-semibold mb-2">
                    Try one of these
                  </p>
                  <div className="flex flex-col gap-2">
                    {suggestedQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(q)}
                        disabled={loading}
                        className="text-left px-4 py-2.5 bg-white hover:bg-gradient-to-r hover:from-violet-50 hover:to-fuchsia-50 border border-violet-200 hover:border-violet-400 rounded-xl text-sm text-gray-800 transition-all hover:shadow-md disabled:opacity-50"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-violet-600" />
                </div>
              )}

              <div
                className={`max-w-[80%] rounded-2xl p-4 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white'
                    : msg.isError
                    ? 'bg-red-50 text-red-800 border border-red-200'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-300">
                    <p className="text-xs font-semibold mb-1">Sources:</p>
                    <div className="flex flex-wrap gap-1">
                      {msg.sources.map((source, i) => (
                        <SourceChip key={i} source={source} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center">
              <Bot className="w-5 h-5 text-violet-600" />
            </div>
            <div className="bg-gray-100 rounded-2xl p-4">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-fuchsia-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-violet-100">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder || 'Ask a question...'}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            rows="2"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-6 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors font-medium"
          >
            <Send className="w-5 h-5" />
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatInterface
