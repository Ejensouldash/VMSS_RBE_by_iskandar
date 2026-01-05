
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Bot, Sparkles } from 'lucide-react';
import { processNaturalLanguageQuery } from '../services/ai';

export default function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'system', text: '👋 **Hai Bos! Saya Cortex AI.**\n\nSaya boleh cakap **Melayu & English**.\n\nSaya bukan chatbot biasa, saya boleh kawal Vending Machine ni. Cuba tanya:\n\n*"Sales hari ni okay tak?"*\n*"Tolong restock slot 1"*' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsTyping(true);
    
    // Simulate AI "Thinking" Process (Latency varies to feel natural)
    const thinkingTime = 1000 + Math.random() * 1000;
    
    setTimeout(() => {
      const response = processNaturalLanguageQuery(userMsg);
      setMessages(prev => [...prev, { role: 'system', text: response }]);
      setIsTyping(false);
    }, thinkingTime);
  };

  const QuickPrompt = ({ text, cmd }: { text: string, cmd?: string }) => (
    <button 
      onClick={() => { 
        if (cmd) {
            setInput(cmd);
            // Optionally auto-send here if desired
        } else {
            setInput(text);
        }
        inputRef.current?.focus();
      }}
      className="text-[10px] md:text-xs bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-700 font-medium px-3 py-1.5 rounded-full border border-slate-200 hover:border-indigo-200 transition-all whitespace-nowrap snap-center active:scale-95"
    >
      {text}
    </button>
  );

  return (
    <div className="fixed bottom-6 right-6 z-[100] font-sans flex flex-col items-end gap-4">
      
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-2xl shadow-indigo-500/30 transition-all hover:scale-110 ring-4 ring-white/50 animate-in zoom-in duration-300"
        >
          <div className="relative">
            <Bot size={28} />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <span className="font-bold pr-2 max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 whitespace-nowrap text-sm">
            Chat with AI
          </span>
        </button>
      )}

      {isOpen && (
        <div className="bg-white w-[90vw] md:w-[400px] h-[80vh] md:h-[600px] rounded-2xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
          
          {/* Header */}
          <div className="bg-slate-900 p-4 flex justify-between items-center text-white relative overflow-hidden shadow-md">
            {/* Background Abstract */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 opacity-20 rounded-full -mr-10 -mt-10 blur-3xl"></div>
            
            <div className="flex items-center gap-3 relative z-10">
              <div className="bg-indigo-500/20 p-2 rounded-lg border border-indigo-400/30 backdrop-blur-sm">
                <Bot size={20} className="text-indigo-300" />
              </div>
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                   Cortex AI v2.0
                   <span className="bg-emerald-500/20 text-emerald-300 text-[9px] px-1.5 py-0.5 rounded border border-emerald-500/30">ONLINE</span>
                </h3>
                <p className="text-[10px] text-slate-400">Bilingual Support (BM/EN)</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors relative z-10 bg-white/10 p-1.5 rounded-full hover:bg-white/20">
              <X size={18} />
            </button>
          </div>

          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 scroll-smooth">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                {msg.role === 'system' && (
                  <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-indigo-600 mr-2 mt-1 flex-shrink-0 shadow-sm">
                    <Sparkles size={14} />
                  </div>
                )}
                <div className={`max-w-[85%] p-3.5 text-sm shadow-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm' 
                    : 'bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-tl-sm'
                }`}>
                  <div className="whitespace-pre-wrap markdown-body">
                    {msg.text.split('\n').map((line, i) => (
                      <p key={i} className={`mb-1 last:mb-0 ${line.startsWith('•') ? 'pl-2' : ''}`}>
                         {/* Simple Bold Parsing for **text** */}
                         {line.split(/(\*\*.*?\*\*)/).map((part, j) => 
                            part.startsWith('**') && part.endsWith('**') 
                              ? <strong key={j} className={msg.role === 'system' ? "text-slate-900" : "text-white"}>{part.slice(2, -2)}</strong> 
                              : part
                         )}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start animate-in fade-in">
                 <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-indigo-600 mr-2 mt-1 flex-shrink-0 shadow-sm">
                    <Sparkles size={14} />
                 </div>
                 <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1.5 items-center">
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-100"></span>
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-200"></span>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions - Horizontal Scroll */}
          <div className="bg-white px-4 py-3 border-t border-slate-100 flex gap-2 overflow-x-auto no-scrollbar mask-gradient">
            <QuickPrompt text="💰 Check Sales" cmd="Sales hari ni okay tak?" />
            <QuickPrompt text="📦 Stok Habis?" cmd="Ada barang stock low tak?" />
            <QuickPrompt text="🚨 Mesin Rosak" cmd="Check mesin offline" />
            <QuickPrompt text="🔄 Reboot System" cmd="Reboot VM-1001" />
            <QuickPrompt text="🚀 Isi Penuh" cmd="Restock semua barang" />
            <QuickPrompt text="🗣️ Speak Malay" cmd="Hi awak boleh speak in malay?" />
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t border-slate-100 flex gap-2 items-center">
            <input 
              ref={inputRef}
              className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition-all text-slate-800 placeholder:text-slate-400"
              placeholder="Tanya AI apa-apa..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white p-3 rounded-xl transition-all shadow-md active:scale-95 flex-shrink-0"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
