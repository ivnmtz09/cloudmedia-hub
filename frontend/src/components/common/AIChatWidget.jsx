import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles, X, Send, Bot, User, RefreshCw, Globe,
  Film, Compass, ChevronDown, MessageSquare
} from 'lucide-react';
import { sendChatMessage } from '../../services/api';

const QUICK_PROMPTS = [
  '¿Qué películas de acción tenemos en el catálogo?',
  'Recomiéndame algo bueno para ver hoy',
  '¿De qué trata Batman: La máscara del fantasma?',
  '¿Quiénes actúan en Batman: La máscara del fantasma?'
];

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: '¡Hola! Soy tu asistente cinematográfico de **CloudMedia Hub**.\n\nPuedo recomendarte títulos de nuestro catálogo, darte detalles de actores y sinopsis, o buscar información actualizada en la web con **Google Search**.\n\n¿Qué te gustaría ver hoy?',
      grounded: false
    }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  const handleSend = async (textToSend = inputMessage) => {
    const text = (typeof textToSend === 'string' ? textToSend : inputMessage).trim();
    if (!text || loading) return;

    const userMsg = {
      id: `usr_${Date.now()}`,
      role: 'user',
      text
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputMessage('');
    setLoading(true);

    try {
      // Formatear historial para el backend
      const formattedHistory = newHistory
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({
          role: m.role,
          text: m.text
        }));

      const res = await sendChatMessage(text, formattedHistory);

      const aiMsg = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        text: res.reply || 'No obtuve respuesta del asistente.',
        grounded: !!res.grounded,
        sources: res.sources || []
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('Error enviando mensaje al chat:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          text: `⚠️ **Error:** ${err.message || 'No pude conectar con el servicio de IA. Inténtalo de nuevo.'}`,
          grounded: false
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome_reset',
        role: 'assistant',
        text: 'Conversación reiniciada. ¿En qué más puedo ayudarte hoy?',
        grounded: false
      }
    ]);
  };

  // Renderizador básico y seguro de texto Markdown (negritas, listas, saltos de línea)
  const renderFormattedText = (rawText) => {
    if (!rawText) return null;

    const lines = rawText.split('\n');
    return lines.map((line, lIdx) => {
      // Línea vacía
      if (!line.trim()) {
        return <div key={lIdx} className="h-2" />;
      }

      // Viñeta
      const isBullet = line.trim().startsWith('* ') || line.trim().startsWith('- ');
      const cleanLine = isBullet ? line.trim().replace(/^[\*\-]\s+/, '') : line;

      // Parsear **negritas**
      const parts = cleanLine.split(/(\*\*.*?\*\*)/g);

      const content = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} className="font-bold text-white">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      if (isBullet) {
        return (
          <div key={lIdx} className="flex items-start gap-2 my-1 pl-1">
            <span className="text-brand-400 mt-1">•</span>
            <span className="flex-1">{content}</span>
          </div>
        );
      }

      return (
        <p key={lIdx} className="my-1">
          {content}
        </p>
      );
    });
  };

  return (
    <>
      {/* Botón Flotante en la Esquina Inferior Derecha */}
      <div className="fixed bottom-6 right-6 z-40">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-2.5 px-4 py-3.5 rounded-full bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white shadow-2xl shadow-brand-500/40 border border-white/20 transition-all duration-300 transform hover:scale-105 active:scale-95"
            aria-label="Abrir Asistente AI"
          >
            <div className="relative">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-gray-900" />
            </div>
            <span className="text-xs sm:text-sm font-bold tracking-wide pr-1">
              CloudMedia Copilot
            </span>
          </button>
        )}
      </div>

      {/* Ventana de Chat Estilo "Copilot" */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] h-[580px] max-h-[85vh] bg-gray-900/95 backdrop-blur-2xl border border-slate-700/80 rounded-3xl shadow-2xl shadow-black/90 flex flex-col overflow-hidden animate-fade-in text-slate-100">
          {/* Header */}
          <div className="px-5 py-4 bg-gray-900 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-brand-500 to-indigo-600 p-0.5 shadow-md shadow-brand-500/20">
                <div className="w-full h-full bg-dark-950 rounded-[14px] flex items-center justify-center">
                  <Bot className="w-5 h-5 text-brand-400" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  CloudMedia Copilot
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                </h3>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Gemini &bull; Catálogo &bull; Web Search</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={clearChat}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
                title="Limpiar chat"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
                title="Cerrar chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Cuerpo de Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs sm:text-sm">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-4 h-4 text-brand-400" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed shadow-md ${
                      isUser
                        ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white rounded-tr-sm'
                        : 'bg-slate-800/90 border border-slate-700/60 text-slate-200 rounded-tl-sm'
                    }`}
                  >
                    {renderFormattedText(msg.text)}

                    {/* Badge de Búsqueda Web */}
                    {msg.grounded && (
                      <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex items-center gap-1.5 text-[11px] text-emerald-400">
                        <Globe className="w-3.5 h-3.5" />
                        <span>Información complementada con Google Search</span>
                      </div>
                    )}

                    {/* Enlaces de Fuentes si existen */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {msg.sources.slice(0, 3).map((src, sIdx) => (
                          <a
                            key={sIdx}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] bg-slate-900/80 hover:bg-slate-900 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700 truncate max-w-[200px]"
                          >
                            {src.title || 'Fuente'}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-7 h-7 rounded-xl bg-indigo-900/60 border border-indigo-700/60 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4 text-indigo-300" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Indicador de Escritura */}
            {loading && (
              <div className="flex gap-2.5 items-start">
                <div className="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-brand-400 animate-spin" />
                </div>
                <div className="bg-slate-800/90 border border-slate-700/60 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:0.4s]" />
                  <span className="text-xs text-slate-400 ml-1">Consultando catálogo y web...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Sugerencias Rápidas */}
          {messages.length <= 2 && !loading && (
            <div className="px-4 pb-2 pt-1 border-t border-slate-800/60">
              <p className="text-[11px] text-slate-400 font-semibold mb-2 flex items-center gap-1">
                <Compass className="w-3 h-3 text-brand-400" />
                Preguntas sugeridas:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(prompt)}
                    className="text-[11px] bg-slate-800/80 hover:bg-slate-700/90 text-slate-300 px-2.5 py-1 rounded-xl border border-slate-700/60 text-left transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Footer */}
          <div className="p-3 bg-gray-900 border-t border-slate-800 shrink-0">
            <div className="relative flex items-center">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pregunta sobre películas, actores o temas libres..."
                rows={1}
                disabled={loading}
                className="w-full pl-3.5 pr-12 py-2.5 rounded-2xl bg-dark-950 border border-slate-700/80 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500 resize-none transition-colors disabled:opacity-50"
              />
              <button
                onClick={() => handleSend()}
                disabled={!inputMessage.trim() || loading}
                className="absolute right-1.5 p-2 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:bg-slate-800 text-white disabled:text-slate-500 transition-colors shadow-md"
                title="Enviar mensaje (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 px-1">
              <span>Enter para enviar</span>
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3 text-slate-400" />
                Google Gemini 3.8
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
