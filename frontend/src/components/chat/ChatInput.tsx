'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Send } from 'lucide-react';
import { useSpeechRecognition } from '../../hooks/use-speech-recognition';
import { FilePreview } from '../ocr/FilePreview';
import { MicButton } from './MicButton';

interface ChatInputProps {
  onSend: (text: string) => void;
  onSendImage: (file: File) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Ô nhập chat — text + đính kèm ảnh (OCR) + mic (Voice), gộp 3 luồng vào 1 giao diện */
export function ChatInput({ onSend, onSendImage, disabled }: ChatInputProps) {
  const [text, setText] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isSupported, isRecording, transcript, error: voiceError, start, stop, reset } = useSpeechRecognition();

  // Đồng bộ transcript giọng nói vào ô nhập trong lúc đang ghi âm
  useEffect(() => {
    if (isRecording) setText(transcript);
  }, [transcript, isRecording]);

  // Tự resize textarea theo nội dung (tối đa ~6 dòng)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }, [text]);

  function handleStopRecording() {
    stop();
    // Sau khi dừng ghi âm, nếu có nội dung thì gửi luôn theo luồng Voice (Microphone -> STT -> AI)
    setTimeout(() => {
      if (transcript.trim()) {
        onSend(transcript.trim());
        setText('');
        reset();
      }
    }, 300); // chờ sự kiện onresult cuối cùng của trình duyệt ổn định transcript
  }

  function handleSendText() {
    const value = text.trim();
    if (!value || disabled) return;
    onSend(value);
    setText('');
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // cho phép chọn lại cùng file lần sau
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFileError('Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError('Ảnh vượt quá dung lượng tối đa 8MB.');
      return;
    }
    setFileError(null);
    setPendingFile(file);
  }

  function confirmSendFile() {
    if (pendingFile) {
      onSendImage(pendingFile);
      setPendingFile(null);
    }
  }

  return (
    <div className="border-t border-slate-200 bg-white p-3 sm:p-4">
      {(fileError || voiceError) && (
        <p role="alert" className="mb-2 text-xs text-red-600">
          {fileError ?? voiceError}
        </p>
      )}

      {pendingFile && (
        <div className="mb-2 flex items-center gap-2">
          <FilePreview file={pendingFile} isUploading={false} onRemove={() => setPendingFile(null)} />
          <button
            onClick={confirmSendFile}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark"
          >
            Gửi ảnh để AI đọc
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          className="hidden"
          onChange={handleFileChange}
          aria-label="Chọn ảnh giấy tờ để OCR"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          aria-label="Đính kèm ảnh giấy tờ"
          title="Đính kèm ảnh giấy tờ (OCR)"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
        >
          <ImagePlus size={19} />
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendText();
            }
          }}
          placeholder={isRecording ? 'Đang nghe...' : 'Nhập câu hỏi về thủ tục, pháp luật...'}
          disabled={disabled || isRecording}
          aria-label="Nhập tin nhắn"
          className="max-h-36 flex-1 resize-none rounded-2xl border border-slate-300 px-4 py-2.5 text-sm focus:border-primary focus:outline focus:outline-2 focus:outline-primary/30 disabled:bg-slate-50"
        />

        <MicButton isSupported={isSupported} isRecording={isRecording} onStart={start} onStop={handleStopRecording} />

        <button
          type="button"
          onClick={handleSendText}
          disabled={disabled || !text.trim() || isRecording}
          aria-label="Gửi tin nhắn"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send size={17} />
        </button>
      </div>
    </div>
  );
}
