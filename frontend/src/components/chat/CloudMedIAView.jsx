import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Send, Bot, User, RefreshCw, Globe, ArrowLeft,
  Film, Compass, HardDrive, CheckCircle2, Clapperboard, Flame,
  Play, Info, Star, Clock, Zap
} from 'lucide-react';
import { sendChatMessage } from '../../services/api';
import VideoPlayerModal from '../streaming/VideoPlayerModal';

const QUICK_CHIPS = [
  {
    icon: Flame,
    prompt: '¿Qué películas de acción o superhéroes tenemos?',
    label: 'Acción & Superhéroes'
  },
  {
    icon: Clock,
    prompt: 'Tengo 1 hora libre, recomiéndame algo rápido',
    label: '1 Hora Libre'
  },
  {
    icon: Sparkles,
    prompt: 'Sorpréndeme con una joya del servidor',
    label: 'Joya del Servidor'
  }
];

const FEATURED_SUGGESTIONS = [
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
      grounded: false,
      matchedMedia: []
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [activeMedia, setActiveMedia] = useState(null);
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
        sources: res.sources || [],
        matchedMedia: Array.isArray(res.matchedMedia) ? res.matchedMedia : []
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
          grounded: false,
          matchedMedia: []
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
        grounded: false,
        matchedMedia: []
      }
    ]);
  };

  const formatMediaType = (type) => {
    if (!type) return 'Película';
    const t = type.toLowerCase();
    if (t.includes('serie') || t.includes('tv')) return 'Serie';
    if (t.includes('anime')) return 'Anime';
    return 'Película';
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
                <span>Smart Watch Activo</span>
                <span>•</span>
                <span>Google Search</span>
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
        {/* Sugerencias Rápidas Iniciales ("Chips" y Tarjetas) */}
        {messages.length <= 1 && (
          <div className="py-2 space-y-4">
            {/* Chips Rápidos de Inicio solicitados */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1 mb-2.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Sugerencias rápidas recomendadas:
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_CHIPS.map((chip, idx) => {
                  const Icon = chip.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSend(chip.prompt)}
                      className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-dark-900/90 hover:bg-slate-800 border border-slate-800 hover:border-red-500/40 text-xs font-medium text-slate-200 hover:text-white transition-all shadow-md group active:scale-95 text-left"
                    >
                      <div className="p-1 rounded-lg bg-red-600/20 text-red-400 group-hover:bg-red-600 group-hover:text-white transition-colors shrink-0">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-semibold text-white group-hover:text-red-400 transition-colors">
                        {chip.prompt}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tarjetas destacadas de contexto adicional */}
            <div className="pt-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1 mb-2.5">
                <Compass className="w-3.5 h-3.5 text-red-500" />
                O explora más temas:
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
          </div>
        )}

        {/* Flujo de Mensajes */}
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const hasMedia = Array.isArray(msg.matchedMedia) && msg.matchedMedia.length > 0;

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
                className={`rounded-3xl p-4 sm:p-5 shadow-xl ${
                  isUser
                    ? 'max-w-[85%] sm:max-w-[75%] bg-gradient-to-r from-red-600 via-rose-600 to-indigo-600 text-white rounded-tr-sm'
                    : hasMedia
                      ? 'max-w-[96%] sm:max-w-[88%] bg-dark-900/95 border border-slate-800/90 text-slate-100 rounded-tl-sm backdrop-blur-md'
                      : 'max-w-[85%] sm:max-w-[80%] bg-dark-900/90 border border-slate-800/80 text-slate-100 rounded-tl-sm backdrop-blur-md'
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

                {/* Tarjetas Interactivas de Recomendaciones Detectadas en tu Servidor */}
                {hasMedia && (
                  <div className="mt-4 pt-3.5 border-t border-slate-800/90">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-lg bg-red-600/20 text-red-400 border border-red-500/20">
                          <Film className="w-3.5 h-3.5" />
                        </div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                          Recomendaciones Detectadas en tu Servidor
                        </h4>
                      </div>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                        {msg.matchedMedia.length} {msg.matchedMedia.length === 1 ? 'título disponible' : 'títulos disponibles'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {msg.matchedMedia.map((media, mIdx) => (
                        <div
                          key={`${media.path}-${mIdx}`}
                          className="flex bg-slate-950/80 hover:bg-slate-900 border border-slate-800/90 hover:border-slate-700/90 rounded-2xl p-2.5 gap-3 transition-all duration-200 shadow-lg group"
                        >
                          {/* Póster de TMDB con overlay de reproducción */}
                          <div
                            onClick={() => setActiveMedia(media)}
                            className="relative w-20 h-28 sm:w-24 sm:h-32 shrink-0 rounded-xl overflow-hidden bg-slate-800 cursor-pointer group/poster shadow-md"
                            title={`Reproducir de inmediato: ${media.title}`}
                          >
                            {media.posterUrl ? (
                              <img
                                src={media.posterUrl}
                                alt={media.title}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover/poster:scale-105"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-500">
                                <Film className="w-8 h-8 text-slate-600" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/poster:opacity-100 transition-opacity flex items-center justify-center">
                              <div className="w-8 h-8 rounded-full bg-red-600/90 flex items-center justify-center text-white shadow-lg transform scale-90 group-hover/poster:scale-100 transition-transform">
                                <Play className="w-4 h-4 fill-white ml-0.5" />
                              </div>
                            </div>
                          </div>

                          {/* Metadatos y botones de acción */}
                          <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
                            <div>
                              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                  {formatMediaType(media.type)}
                                </span>
                                {media.year && (
                                  <span className="text-[11px] text-slate-400">
                                    {media.year}
                                  </span>
                                )}
                                {media.rating != null && (
                                  <span className="flex items-center gap-0.5 text-[11px] font-bold text-amber-400 ml-auto">
                                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                    {Number(media.rating).toFixed(1)}
                                  </span>
                                )}
                              </div>

                              <h5
                                className="font-bold text-xs sm:text-sm text-white line-clamp-1 group-hover:text-red-400 transition-colors"
                                title={media.title}
                              >
                                {media.title}
                              </h5>

                              {media.synopsis && (
                                <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-snug">
                                  {media.synopsis}
                                </p>
                              )}
                            </div>

                            {/* Botones de acción */}
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/80">
                              <button
                                onClick={() => setActiveMedia(media)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-md shadow-red-900/30 active:scale-95 transition-all"
                                title="Reproducir de inmediato en Smart Watch"
                              >
                                <Play className="w-3.5 h-3.5 fill-white" />
                                <span>▶ Ver Ahora</span>
                              </button>

                              <button
                                onClick={() => navigate(`/media/${encodeURIComponent(media.path)}`)}
                                className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-medium text-xs active:scale-95 transition-all"
                                title="Ver detalles completos del medio"
                              >
                                <Info className="w-3.5 h-3.5" />
                                <span className="hidden xs:inline">Detalles</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
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

      {/* 3. Dock de Entrada Inferior Ergonómico */}
      <div className="pt-2 pb-4 px-2 shrink-0 space-y-2">
        {/* Fila de Chips Rápidos siempre accesibles si ya hay conversación */}
        {messages.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none px-1 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0 mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Sugerencias:
            </span>
            {QUICK_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(chip.prompt)}
                disabled={loading}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full bg-dark-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all text-[11px] active:scale-95 disabled:opacity-50"
              >
                <chip.icon className="w-3 h-3 text-red-400" />
                <span>{chip.label}</span>
              </button>
            ))}
          </div>
        )}

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
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-3 pt-0.5">
          <span>Presiona <strong className="text-slate-300">Enter</strong> para enviar</span>
          <span className="flex items-center gap-1 text-slate-400">
            <Sparkles className="w-3 h-3 text-amber-400" />
            CloudMedIA • Smart Watch & Gemini Flash
          </span>
        </div>
      </div>

      {/* 4. Modal de Reproducción Directa ("Smart Watch") */}
      {activeMedia && (
        <VideoPlayerModal
          item={activeMedia}
          onClose={() => setActiveMedia(null)}
        />
      )}
    </div>
  );
}
