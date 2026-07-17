'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Speech-To-Text qua Web Speech API của trình duyệt (thiết kế đã chốt —
 * KHÔNG xử lý audio phía server). Chrome/Edge hỗ trợ tốt nhất; trình duyệt
 * không hỗ trợ sẽ báo `isSupported=false` để UI ẩn nút mic một cách an toàn.
 */

// Kiểu tối giản cho SpeechRecognition — TypeScript lib.dom chưa có sẵn đầy đủ
interface MinimalSpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
}

export function useSpeechRecognition() {
  const [isSupported, setIsSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null);

  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: new () => MinimalSpeechRecognition;
      webkitSpeechRecognition?: new () => MinimalSpeechRecognition;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    setIsSupported(!!Ctor);
  }, []);

  const start = useCallback(() => {
    const w = window as unknown as {
      SpeechRecognition?: new () => MinimalSpeechRecognition;
      webkitSpeechRecognition?: new () => MinimalSpeechRecognition;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      setError('Trình duyệt của bạn không hỗ trợ nhận diện giọng nói.');
      return;
    }

    setError(null);
    setTranscript('');
    const recognition = new Ctor();
    recognition.lang = 'vi-VN';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      const e = event as { results: ArrayLike<{ 0: { transcript: string } }> };
      const text = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(' ');
      setTranscript(text);
    };
    recognition.onerror = (event) => {
      const e = event as { error?: string };
      setError(
        e.error === 'not-allowed'
          ? 'Vui lòng cho phép quyền truy cập micro để dùng tính năng giọng nói.'
          : 'Không nhận diện được giọng nói. Vui lòng thử lại.',
      );
      setIsRecording(false);
    };
    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  const reset = useCallback(() => setTranscript(''), []);

  return { isSupported, isRecording, transcript, error, start, stop, reset };
}
