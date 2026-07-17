import { FileCheck2, Sparkles } from 'lucide-react';
import { Badge } from '../ui/Badge';
import type { OcrAnalyzeResult } from '../../types/api';

const DOC_TYPE_LABEL: Record<string, string> = {
  CCCD: 'Căn cước công dân',
  GIAY_KHAI_SINH: 'Giấy khai sinh',
  DON_TU: 'Đơn từ',
  BIEU_MAU: 'Biểu mẫu',
  GIAY_TO_KHAC: 'Giấy tờ khác',
};

/** Kết quả OCR + AI phân tích (NHIỆM VỤ 5: Document OCR) */
export function OcrResultCard({ result }: { result: OcrAnalyzeResult }) {
  const fieldEntries = Object.entries(result.fields).filter(([, v]) => v);

  return (
    <div className="max-w-[85%] rounded-xl border border-slate-200 bg-white p-4 text-sm sm:max-w-[75%]">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-medium text-slate-800">
          <FileCheck2 size={16} className="text-primary" aria-hidden="true" />
          {DOC_TYPE_LABEL[result.docType] ?? result.docType}
        </span>
        <Badge tone={result.confidence >= 0.7 ? 'green' : 'amber'}>
          Độ chính xác {Math.round(result.confidence * 100)}%
        </Badge>
      </div>

      {fieldEntries.length > 0 ? (
        <dl className="mb-3 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
          {fieldEntries.map(([key, value]) => (
            <div key={key} className="flex flex-col">
              <dt className="text-xs text-slate-400">{key}</dt>
              <dd className="truncate text-slate-700">{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mb-3 text-xs italic text-slate-400">Không trích xuất được trường thông tin cụ thể.</p>
      )}

      {result.suggestedActions.length > 0 && (
        <div className="border-t border-slate-100 pt-2.5">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Sparkles size={12} aria-hidden="true" /> Gợi ý tiếp theo
          </p>
          <ul className="flex flex-col gap-1">
            {result.suggestedActions.map((action, i) => (
              <li key={i} className="text-xs text-slate-600">
                • {action}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
