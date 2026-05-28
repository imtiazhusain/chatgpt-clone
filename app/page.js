'use client';

import { useState, useRef, useEffect } from 'react';

// ─── Thread ID ────────────────────────────────────────────────────────────────
// Generate a unique ID once when the module loads (i.e. once per browser session).
// This is used to keep conversation history on the server side (via node-cache).
// It is NOT stored in React state so it never triggers a re-render.
const threadId =
  Date.now().toString(36) + Math.random().toString(36).substring(2, 8);

// ─── Component ────────────────────────────────────────────────────────────────
export default function Home() {
  // messages: array of { role: 'user' | 'assistant', content: string }
  const [messages, setMessages] = useState([]);

  // input: controlled value of the textarea
  const [input, setInput] = useState('');

  // loading: true while waiting for the server response
  const [loading, setLoading] = useState(false);

  // bottomRef: a dummy div at the bottom of the message list used for auto-scrolling
  const bottomRef = useRef(null);

  // ── Auto-scroll ─────────────────────────────────────────────────────────────
  // Whenever messages or loading state changes, smoothly scroll to the bottom
  // so the latest message is always visible.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ── callServer ───────────────────────────────────────────────────────────────
  // Sends the user message + threadId to our Next.js API route at /api/chat.
  // Returns the assistant's reply as a string.
  async function callServer(text) {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ threadId, message: text }),
    });

    if (!response.ok) {
      throw new Error('Error generating the response.');
    }

    const result = await response.json();
    return result.message;
  }

  // ── generate ─────────────────────────────────────────────────────────────────
  // Main function that:
  //   1. Appends the user message to the UI immediately
  //   2. Clears the input field
  //   3. Sets loading to true (shows the thinking animation)
  //   4. Calls the server and waits for the reply
  //   5. Appends the assistant reply to the UI
  //   6. Handles errors gracefully
  async function generate(text) {
    if (!text.trim()) return; // ignore empty submissions

    // Append user bubble immediately (optimistic UI)
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);

    try {
      const assistantMessage = await callServer(text);

      // Append assistant reply once it arrives
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: assistantMessage },
      ]);
    } catch (err) {
      // Show a friendly error message inside the chat instead of crashing
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Something went wrong. Please try again.',
        },
      ]);
    } finally {
      // Always stop the loading animation, even if an error occurred
      setLoading(false);
    }
  }

  // ── handleAsk ────────────────────────────────────────────────────────────────
  // Called when the "Ask" button is clicked
  function handleAsk() {
    generate(input);
  }

  // ── handleKeyUp ──────────────────────────────────────────────────────────────
  // Called on every keyup inside the textarea.
  // Pressing Enter (without Shift) submits the message.
  // Shift+Enter adds a newline (default textarea behavior).
  function handleKeyUp(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      generate(input);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-[#111110] text-[#f0ede8]">

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.07] shrink-0">
        {/* Logo badge */}
        <div className="w-7 h-7 rounded-lg bg-[#f0ede8] flex items-center justify-center shrink-0">
          <span className="text-[12px] font-medium text-[#111110]">P</span>
        </div>

        <span className="text-sm font-medium">Promptiqo</span>

        {/* Model label on the right */}
        <span className="ml-auto text-xs text-white/30">llama-3.3-70b</span>
      </header>

      {/* ── Messages area ────────────────────────────────────────────────────── */}
      {/* flex-1 makes this section fill the remaining height between header and inputbar */}
      <main className="flex-1 overflow-y-auto px-5 py-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-5">

          {/* ── Empty state ─────────────────────────────────────────────────── */}
          {/* Show a welcome prompt when there are no messages yet */}
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
              <div className="w-10 h-10 rounded-xl bg-[#f0ede8] flex items-center justify-center">
                <span className="text-[15px] font-medium text-[#111110]">P</span>
              </div>
              <p className="text-sm text-white/40">Ask me anything — I can search the web too.</p>
            </div>
          )}

          {/* ── Message list ────────────────────────────────────────────────── */}
          {messages.map((msg, i) =>
            msg.role === 'user' ? (
              // User bubble: right-aligned, darker background
              <div key={i} className="flex justify-end">
                <div className="bg-[#2a2a28] border border-white/[0.07] rounded-[18px] rounded-br-[4px] px-4 py-2.5 text-sm leading-relaxed max-w-[72%]">
                  {msg.content}
                </div>
              </div>
            ) : (
              // Assistant bubble: left-aligned with small avatar
              <div key={i} className="flex gap-2.5 items-start">
                {/* AI avatar badge */}
                <div className="w-6 h-6 rounded-lg bg-[#f0ede8] flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-medium text-[#111110]">AI</span>
                </div>
                {/* Assistant text */}
                <p className="text-sm leading-[1.75] text-white/80 whitespace-pre-wrap pt-0.5">
                  {msg.content}
                </p>
              </div>
            )
          )}

          {/* ── Thinking animation ──────────────────────────────────────────── */}
          {/* Shown while waiting for the server response */}
          {loading && (
            <div className="flex gap-2.5 items-start">
              <div className="w-6 h-6 rounded-lg bg-[#f0ede8] flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-medium text-[#111110]">AI</span>
              </div>
              {/* Three animated dots */}
              <div className="flex gap-1 items-center pt-2">
                {[0, 1, 2].map((n) => (
                  <span
                    key={n}
                    className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse"
                    style={{ animationDelay: `${n * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Invisible anchor element — scrolled into view on new messages */}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* ── Input bar ────────────────────────────────────────────────────────── */}
      {/* Sits at the bottom, does not scroll */}
      <div className="shrink-0 px-4 pb-4 pt-2 border-t border-white/[0.07]">
        <div className="max-w-2xl mx-auto">
          {/* Input wrapper: focus ring handled via focus-within */}
          <div className="bg-[#1e1e1c] border border-white/10 rounded-2xl px-3 pt-3 pb-2 focus-within:border-white/25 transition-colors">
            <textarea
              className="w-full resize-none bg-transparent outline-none text-[#f0ede8] text-sm leading-relaxed placeholder:text-white/25"
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyUp={handleKeyUp}
              placeholder="Ask me anything…"
            />

            {/* Footer row: hint + send button */}
            <div className="flex items-center justify-between mt-1">
              <span className="text-[11px] text-white/20">
                Enter to send · Shift+Enter for newline
              </span>

              <button
                onClick={handleAsk}
                disabled={loading || !input.trim()}
                className="flex items-center gap-1.5 bg-[#f0ede8] text-[#111110] text-[13px] font-medium px-3.5 py-1.5 rounded-[10px] hover:bg-[#d6d3ce] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Ask
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
