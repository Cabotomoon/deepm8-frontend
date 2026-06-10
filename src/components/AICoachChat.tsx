import { useState, useRef, useEffect } from 'react';
import { llmService, ChatMessage } from '../services/llmService';

interface AICoachChatProps {
  onClose: () => void;
  currentFEN?: string;
  moveHistory?: string[];
}

export const AICoachChat: React.FC<AICoachChatProps> = ({
  onClose,
  currentFEN,
  moveHistory = []
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Add welcome message (service is always ready with shared token)
    setMessages([{
      role: 'assistant',
      content: '👋 ¡Hola! Soy tu entrenador de ajedrez con IA. ¿En qué puedo ayudarte hoy?\n\nPuedo:\n• Analizar tu posición actual\n• Sugerir jugadas y estrategias\n• Explicar conceptos de ajedrez\n• Revisar tus partidas\n• Recomendarte aperturas'
    }]);
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');

    // Add user message
    const newMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: userMessage }
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await llmService.chat(newMessages);

      setMessages([
        ...newMessages,
        { role: 'assistant', content: response.content }
      ]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: '❌ Lo siento, ocurrió un error al procesar tu mensaje. Por favor verifica tu API key e intenta nuevamente.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = async (action: 'analyze' | 'suggest' | 'review') => {
    if (isLoading) return;

    let prompt = '';

    if (action === 'analyze' && currentFEN) {
      prompt = `Analiza mi posición actual:\nFEN: ${currentFEN}\nJugadas: ${moveHistory.join(', ')}`;
    } else if (action === 'suggest') {
      prompt = '¿Qué apertura me recomiendas para mejorar mi juego?';
    } else if (action === 'review' && moveHistory.length > 0) {
      prompt = `Revisa mi partida reciente:\nJugadas: ${moveHistory.join(', ')}`;
    } else {
      return;
    }

    setInputValue(prompt);
    setTimeout(() => handleSend(), 100);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700 max-w-2xl w-full h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-xl">
              🤖
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Entrenador IA
              </h2>
              <p className="text-xs text-slate-400">
                Powered by OpenAI GPT-4o-mini
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-2xl"
          >
            ×
          </button>
        </div>

        {/* Quick actions */}
        <div className="p-3 bg-slate-700/30 border-b border-slate-700">
          <div className="flex flex-wrap gap-2">
            {currentFEN && (
              <button
                onClick={() => handleQuickAction('analyze')}
                disabled={isLoading}
                className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded-lg text-xs font-semibold text-blue-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🔍 Analizar posición
              </button>
            )}
            <button
              onClick={() => handleQuickAction('suggest')}
              disabled={isLoading}
              className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 rounded-lg text-xs font-semibold text-purple-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              💡 Sugerir apertura
            </button>
            {moveHistory.length > 0 && (
              <button
                onClick={() => handleQuickAction('review')}
                disabled={isLoading}
                className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded-lg text-xs font-semibold text-green-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                📊 Revisar partida
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-sm'
                    : 'bg-slate-700/50 text-slate-100 rounded-bl-sm'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-700/50 px-4 py-3 rounded-2xl rounded-bl-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Escribe tu pregunta..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed rounded-lg font-semibold text-white transition-all duration-200 hover:scale-105 shadow-lg"
            >
              {isLoading ? '⏳' : '📤'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
