'use client';

import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';

interface FilePreviewProps {
  file: File;
  isUploading: boolean;
  onRemove: () => void;
}

/** Xem trước ảnh đã chọn + Upload Progress (NHIỆM VỤ 5) */
export function FilePreview({ file, isUploading, onRemove }: FilePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="relative inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 pr-3 animate-fade-in">
      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- ảnh preview tạm thời từ blob URL, không cần Next/Image optimize
        <img src={previewUrl} alt={`Xem trước ${file.name}`} className="h-10 w-10 rounded object-cover" />
      )}
      <div className="flex flex-col">
        <span className="max-w-[140px] truncate text-xs font-medium text-slate-700">{file.name}</span>
        <span className="text-[11px] text-slate-400">{(file.size / 1024).toFixed(0)} KB</span>
      </div>
      {isUploading ? (
        <Loader2 size={16} className="animate-spin text-primary" aria-label="Đang tải lên" />
      ) : (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Bỏ ảnh đã chọn"
          className="rounded-full p-1 text-slate-400 hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
