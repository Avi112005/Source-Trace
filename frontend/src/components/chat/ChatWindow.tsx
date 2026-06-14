"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Mic, FileText, X, Bot, User, ImageIcon, Search, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSessionId } from "@/hooks/useSessionId";

// Mock data for initial frontend development
const MOCK_MESSAGES = [
  {
    id: "1",
    role: "assistant",
    content: "Hello! I'm your Document Intelligence agent. I've ingested your documents. Ask me anything about them, and I'll provide answers with exact source citations.",
    citations: []
  }
];

export function ChatWindow() {
  const sessionId = useSessionId();
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<{url: string, title: string, page: number} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      }
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = async (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
          
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append("file", audioBlob, "audio.webm");

          try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/transcribe`, {
              method: "POST",
              body: formData,
            });
            if (res.ok) {
              const data = await res.json();
              if (data.text) setInput(data.text);
            }
          } catch (err) {
            console.error("Transcription error:", err);
          }
        }
      };

      mediaRecorder.start(1500); // 1.5s interval for "live" feel
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Please allow microphone access to use voice input.");
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      citations: []
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setIsTyping(true);

    try {
      const messagesToSend = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": sessionId || "00000000-0000-0000-0000-000000000000"
        },
        body: JSON.stringify({ messages: messagesToSend }),
      });

      if (!response.ok) throw new Error("Failed to connect to AI");
      const data = await response.json();

      setIsTyping(false);
      
      // Filter out duplicate sources (same file + page)
      const uniqueSources: any[] = [];
      const seen = new Set();
      for (const source of (data.sources || [])) {
        const key = `${source.file_id}_${source.page}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueSources.push(source);
        }
      }

      // Map the returned source metadata to our UI format
      const mappedCitations = uniqueSources.map((source: any, i: number) => ({
        id: `c${i}`,
        documentName: source.filename || (source.file_id ? `Document_${source.file_id.substring(0, 8)}` : "Source Document"),
        pageNumber: source.page || 1,
        imageUrl: source.image_url || "" 
      }));

      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.answer || "I could not find an answer.",
          citations: mappedCitations
        }
      ]);
    } catch (error) {
      setIsTyping(false);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I encountered a network error while connecting to the AI backend.",
          citations: []
        }
      ]);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-h-[800px] w-full max-w-4xl mx-auto mt-4 rounded-2xl overflow-hidden glass-card flex-1">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/50 bg-background/50 backdrop-blur-sm flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Search className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-lg">Source Trace Knowledge Engine</h2>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Database className="w-3 h-3 text-primary" />
            Vector Store Connected
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex gap-4 max-w-[85%]",
                msg.role === "user" ? "ml-auto flex-row-reverse" : ""
              )}
            >
              {/* Avatar */}
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm",
                msg.role === "user" 
                  ? "bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900" 
                  : "bg-primary text-primary-foreground"
              )}>
                {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div className={cn(
                "flex flex-col gap-2",
                msg.role === "user" ? "items-end" : "items-start"
              )}>
                <div className={cn(
                  "px-5 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm border",
                  msg.role === "user" 
                    ? "bg-foreground text-background border-transparent rounded-tr-sm" 
                    : "bg-background/80 backdrop-blur-md border-border/50 rounded-tl-sm text-foreground"
                )}>
                  {msg.content}
                </div>

                {/* Citations Grid */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {msg.citations.map((cite) => (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        key={cite.id}
                        onClick={() => setSelectedCitation({url: cite.imageUrl, title: cite.documentName, page: cite.pageNumber})}
                        className="group flex flex-col w-48 bg-card rounded-xl border border-border/50 overflow-hidden shadow-sm hover:border-primary/50 transition-colors"
                      >
                        {/* Thumbnail */}
                        <div className="h-32 bg-muted relative overflow-hidden flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-muted-foreground/30 absolute" />
                          {cite.imageUrl && (
                            <div 
                              className="absolute inset-0 bg-cover bg-top bg-no-repeat group-hover:scale-105 transition-transform duration-500 bg-white"
                              style={{ backgroundImage: `url(${cite.imageUrl})` }}
                            />
                          )}
                          <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                        </div>
                        {/* Meta */}
                        <div className="p-3 bg-card flex flex-col items-start gap-1 w-full border-t border-border/50">
                          <p className="text-xs font-medium text-foreground truncate w-full flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-primary" />
                            {cite.documentName}
                          </p>
                          <p className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-sm">
                            Page {cite.pageNumber}
                          </p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="px-5 py-4 rounded-2xl rounded-tl-sm bg-background/80 border border-border/50 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.3s]" />
              <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.15s]" />
              <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" />
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-background/80 backdrop-blur-md border-t border-border/50">
        <form onSubmit={handleSend} className="relative flex items-end gap-2 max-w-3xl mx-auto">
          <div className="relative flex-1 bg-muted/30 border border-border rounded-2xl focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-inner">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your documents..."
              className="w-full bg-transparent resize-none outline-none py-4 pl-4 pr-12 max-h-32 min-h-[56px] text-[15px]"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              type="button"
              onClick={toggleRecording}
              className={cn(
                "absolute right-3 top-3.5 p-1.5 rounded-full transition-all duration-300",
                isRecording 
                  ? "text-red-500 bg-red-500/10 hover:bg-red-500/20 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]" 
                  : "text-muted-foreground hover:text-primary hover:bg-primary/10"
              )}
              title={isRecording ? "Stop Recording" : "Voice Input"}
            >
              <Mic className="w-5 h-5" />
            </button>
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="p-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <p className="text-center text-[11px] text-muted-foreground mt-3">
          AgenticData can make mistakes. Always check the cited sources.
        </p>
      </div>

      {/* Page Viewer Modal */}
      <AnimatePresence>
        {selectedCitation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
            onClick={() => setSelectedCitation(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-card w-full max-w-5xl h-full max-h-[90vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{selectedCitation.title}</h3>
                    <p className="text-sm text-muted-foreground">Page {selectedCitation.page}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCitation(null)}
                  className="p-2 rounded-full hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/5">
                {selectedCitation.url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img 
                    src={selectedCitation.url} 
                    alt={`Page ${selectedCitation.page} of ${selectedCitation.title}`}
                    className="max-w-full max-h-full object-contain shadow-lg border border-border/50 bg-white"
                  />
                ) : (
                  <div className="text-muted-foreground flex flex-col items-center gap-2">
                    <FileText className="w-12 h-12 opacity-50" />
                    <span>Image preview not available for this document</span>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
