import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Send, Bot, User, RefreshCw, Globe, ArrowLeft,
  Film, Compass, HardDrive, CheckCircle2, Clapperboard, Flame
} from 'lucide-react';
import { sendChatMessage } from '../../services/api';

const FEATURED_SUGGESTIONS = [
  {
    icon: Film,
    title: 'Películas de Acción',
    prompt: '¿Qué películas de acción o superhéroes tenemos disponibles en el catálogo?'
  },
  {
    icon: Flame,
    title: 'Recomendación Sorpresa',
    prompt: 'Recomiéndame una película excelente del servidor para ver hoy con palomitas.'
  },
  {
    icon: Clapperboard,
    title: 'Misterio y Trama',
    prompt: '¿De qué trata Batman: La máscara del fantasma y por qué es tan aclamada?'
  },
  {
    icon: Globe,
    title: 'Cine Mundial y Noticias',
    prompt: '¿Cuáles han sido las películas más premiadas del último año en los festivales de cine?'
  }
];

export default function CloudMedIAView() {
  const navigate = useNavigate();
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: '¡Hola! Bienvenido a **CloudMedIA**, tu asistente cinematográfico de élite en **CloudMedia Hub**.\n\nTengo acceso en tiempo real a todo el catálogo de películas, series y anime alojado en tu almacenamiento, y además cuento con **Google Search** para resolver cualquier duda o curiosidad del mundo del cine.\n\n¿En qué te puedo ayudar hoy?',
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
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
      console.error('Error enviando mensaje a CloudMedIA:', err);
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
        text: 'Conversación reiniciada. ¿En qué más te puedo orientar sobre el catálogo o el cine?',
        grounded: false
      }
    ]);
  };

  const renderFormattedText = (rawText) => {
    if (!rawText) return null;

    const lines = rawText.split('\n');
    return lines.map((line, lIdx) => {
      if (!line.trim()) return <div key={lIdx} className="h-2" />;

      const isBullet = line.trim().startsWith('* ') || line.trim().startsWith('- ');
      const cleanLine = isBullet ? line.trim().replace(/^[\*\-]\s+/, '') : line;
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
          <div key={lIdx} className="flex items-start gap-2.5 my-1 pl-1">
            <span className="text-red-500 font-bold mt-0.5">•</span>
            <span className="flex-1 text-slate-200">{content}</span>
          </div>
        );
      }

      return (
        <p key={lIdx} className="my-1.5 text-slate-200 leading-relaxed">
          {content}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] max-w-5xl mx-auto w-full animate-fade-in text-slate-100">
      {/* 1. Header de CloudMedIA */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-3 px-2 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Volver a Cine & Series"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 via-indigo-600 to-purple-600 p-0.5 shadow-lg shadow-red-500/20">
              <div className="w-full h-full bg-dark-950 rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
              </div>
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                CloudMedIA
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-600/20 border border-red-500/30 text-red-400">
                  IA Cinéfila
                </span>
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Gemini Flash
                </span>
                <span>•</span>
                <span>Catálogo en Servidor</span>
                <span>•</span>
                <span>Google Search Activo</span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={clearChat}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          title="Reiniciar chat"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Nueva charla</span>
        </button>
      </div>

      {/* 2. Área Central de Conversación */}
      <div className="flex-1 overflow-y-auto py-6 px-2 sm:px-4 space-y-6">
        {/* Sugerencias Rápidas Iniciales (cuando solo está el mensaje de bienvenida) */}
        {messages.length <= 1 && (
          <div className="py-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1">
              <Compass className="w-4 h-4 text-red-500" />
              Preguntas recomendadas para empezar:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FEATURED_SUGGESTIONS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSend(item.prompt)}
                    className="p-3.5 rounded-2xl bg-dark-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-left transition-all duration-200 group flex items-start gap-3 shadow-lg"
                  >
                    <div className="p-2 rounded-xl bg-slate-800 group-hover:bg-red-600/20 text-slate-300 group-hover:text-red-400 border border-slate-700 transition-colors shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-red-400 transition-colors">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                        {item.prompt}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Flujo de Mensajes */}
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-red-600 to-indigo-600 p-0.5 shrink-0 shadow-md">
                  <div className="w-full h-full bg-dark-950 rounded-[14px] flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                  </div>
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-3xl p-4 sm:p-5 shadow-xl ${
                  isUser
                    ? 'bg-gradient-to-r from-red-600 via-rose-600 to-indigo-600 text-white rounded-tr-sm'
                    : 'bg-dark-900/90 border border-slate-800/80 text-slate-100 rounded-tl-sm backdrop-blur-md'
                }`}
              >
                {renderFormattedText(msg.text)}

                {/* Badge de Google Search */}
                {msg.grounded && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center gap-2 text-xs text-emerald-400 font-medium">
                    <Globe className="w-4 h-4" />
                    <span>Respuesta respaldada con información en vivo de Google Search</span>
                  </div>
                )}

                {/* Fuentes Web */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {msg.sources.slice(0, 4).map((src, sIdx) => (
                      <a
                        key={sIdx}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] bg-slate-950/80 hover:bg-slate-950 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg border border-slate-800 transition-colors flex items-center gap-1.5"
                      >
                        <Globe className="w-3 h-3 text-slate-400" />
                        <span className="truncate max-w-[200px]">{src.title || 'Fuente web'}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-9 h-9 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-slate-300" />
                </div>
              )}
            </div>
          );
        })}

        {/* Indicador de Pensando */}
        {loading && (
          <div className="flex gap-3.5 items-start">
            <div className="w-9 h-9 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-red-500 animate-spin" />
            </div>
            <div className="bg-dark-900 border border-slate-800 rounded-3xl rounded-tl-sm px-5 py-3.5 flex items-center gap-3 text-slate-400 shadow-xl">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
              </div>
              <span className="text-xs text-slate-300 font-medium">
                CloudMedIA está analizando el catálogo y la web...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Dock de Entrada Inferior Ergonomico */}
      <div className="pt-2 pb-4 px-2 shrink-0">
        <div className="relative flex items-center bg-dark-900/95 border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 focus-within:border-red-500 transition-colors">
          <textarea
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pregúntale a CloudMedIA sobre recomendaciones, sinopsis, actores o cultura de cine..."
            rows={1}
            disabled={loading}
            className="w-full pl-3.5 pr-14 py-2.5 bg-transparent text-sm text-slate-100 placeholder-slate-400 focus:outline-none resize-none"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputMessage.trim() || loading}
            className="absolute right-2.5 p-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-slate-800 text-white disabled:text-slate-500 shadow-lg transition-all active:scale-95"
            title="Enviar mensaje (Enter)"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-3 pt-1.5">
          <span>Presiona <strong className="text-slate-300">Enter</strong> para enviar</span>
          <span className="flex items-center gap-1 text-slate-400">
            <Sparkles className="w-3 h-3 text-amber-400" />
            CloudMedIA • Gemini 3.8
          </span>
        </div>
      </div>
    </div>
  );
}
