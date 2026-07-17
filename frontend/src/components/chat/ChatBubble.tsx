'use client';

import { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, Check, Copy, User, Volume2 } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useTextToSpeech } from '../../hooks/use-text-to-speech';
import type { Message } from '../../types/api';
import { FeedbackButtons } from './FeedbackButtons';
import { MessageSources } from './MessageSources';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

/** Chat Bubble — markdown, timestamp, copy, TTS cho tin nhắn AI (NHIỆM VỤ 3+4) */
export function ChatBubble({ message, conversationId }: { message: Message; conversationId: string }) {
  const isUser = message.senderRole === 'USER';
  const [copied, setCopied] = useState(false);
  const { isSupported: ttsSupported, isSpeaking, speak } = useTextToSpeech();

  async function handleCopy() {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={cn('flex animate-slide-up flex-col', isUser ? 'items-end' : 'items-start')}>
      <div className="flex items-center gap-2 px-1">
        {!isUser && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bot size={12} aria-hidden="true" />
          </span>
        )}
        <span className="text-xs text-slate-400">{formatTime(message.createdAt)}</span>
        {isUser && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-500">
            <User size={12} aria-hidden="true" />
          </span>
        )}
      </div>

      <div
        className={cn(
          'group relative mt-1 max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed sm:max-w-[75%]',
          isUser ? 'rounded-br-sm bg-primary text-white' : 'rounded-bl-sm bg-slate-100 text-slate-800',
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="markdown-body">
            <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
          </div>
        )}

        {!isUser && (
          <div className="mt-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <button
              onClick={handleCopy}
              aria-label="Sao chép câu trả lời"
              className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
            {ttsSupported && (
              <button
                onClick={() => speak(message.content)}
                aria-label="Đọc to câu trả lời"
                disabled={isSpeaking}
                className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
              >
                <Volume2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {!isUser && message.metadata && <MessageSources metadata={message.metadata} />}
      {!isUser && <FeedbackButtons conversationId={conversationId} messageId={message.id} />}
    </div>
  );
}
