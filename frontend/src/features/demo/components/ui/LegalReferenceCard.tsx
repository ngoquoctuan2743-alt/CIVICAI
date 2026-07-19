'use client';

import { useState } from 'react';
import type { AiSourceItem, LegalDocument } from '../../../../types/api';

/**
 * Thẻ trích dẫn pháp lý — CHỈ hiện field có thật: title/excerpt/score luôn có
 * (từ AiSourceItem), version/effectiveDate CHỈ hiện khi tra được chi tiết
 * văn bản thật (GET /legal/documents/:id) và field đó khác null. KHÔNG có
 * article/section/page vì API RAG hiện tại không trả field đó (sourceId trỏ
 * tới cả văn bản, không phải 1 đoạn/chunk cụ thể).
 */
export function LegalReferenceCard({ source, detail }: { source: AiSourceItem; detail?: LegalDocument }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
      <button type="button" onClick={() => setExpanded((e) => !e)} className="flex w-full items-start justify-between gap-2 text-left">
        <span className="text-sm text-slate-200">
          <span className="font-medium text-white">{source.title}</span>
          <span className="ml-2 text-xs text-slate-500">độ liên quan {Math.round(source.score * 100)}%</span>
        </span>
        <span className="shrink-0 text-xs text-slate-500">{expanded ? '−' : '+'}</span>
      </button>
      {expanded && (
        <div className="mt-2 flex flex-col gap-1 text-xs text-slate-400">
          <p>{source.excerpt}</p>
          {detail?.version && <p>Phiên bản: {detail.version}</p>}
          {detail?.effectiveDate && <p>Hiệu lực từ: {new Date(detail.effectiveDate).toLocaleDateString('vi-VN')}</p>}
        </div>
      )}
    </li>
  );
}
