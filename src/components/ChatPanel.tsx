"use client";

import { useState, useRef } from "react";

export function ChatPanel() {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState([{
    id: "welcome",
    role: "assistant",
    content: "Hi! I'm your expense assistant. Try things like:\n- \"I spent ₹250 on groceries yesterday\"\n- \"How much did I spend on food this month?\"\n- \"Change the category of my last expense to transport\"\n- \"Give me insights on my spending\"",
  }]);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedValue = inputValue.trim();
    if (!trimmedValue) return;

    // Add user message immediately
    const userMessage = {
      id: Date.now().toString(),
      role: "user" as const,
      content: trimmedValue
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setInputValue("");

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage]
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Add assistant response
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: data.reply || data.message || "I received your message but didn't get a proper response."
      }]);
      
      // Trigger expense update event
      window.dispatchEvent(new Event('expense-updated'));
      
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: "Sorry, there was an error processing your message. Please try again."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-100">
          AI Chatbot
        </h2>
        <p className="text-[11px] text-emerald-400 font-medium">
          Powered by OpenAI
        </p>
      </div>
      <div className="flex-1 flex flex-col space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 text-xs overflow-hidden">
        <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-1">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`whitespace-pre-line rounded-lg px-3 py-2 ${
                m.role === "user"
                  ? "self-end bg-blue-600 text-zinc-50 max-w-[85%]"
                  : "self-start bg-zinc-900 border border-zinc-800 text-zinc-100 max-w-[95%]"
              }`}
            >
              {m.content}
            </div>
          ))}
          {isLoading && (
            <div className="self-start px-3 py-2 text-zinc-500 animate-pulse">
              Thinking...
            </div>
          )}
        </div>
        <form onSubmit={onSubmit} className="flex gap-2 shrink-0">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder='e.g. "I spent ₹250 on groceries yesterday"'
            className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="inline-flex items-center gap-1 rounded-md bg-emerald-500 px-3 py-2 text-xs font-medium text-black hover:bg-emerald-400 disabled:opacity-50 disabled:bg-zinc-300 disabled:text-zinc-500 transition-colors dark:disabled:bg-zinc-700"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
