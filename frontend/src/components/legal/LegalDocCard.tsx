import { ExternalLink } from 'lucide-react';
import { Badge } from '../ui/Badge';
import type { LegalDocument } from '../../types/api';

const DOC_TYPE_LABEL: Record<string, string> = {
  LUAT: 'Luật',
  NGHI_DINH: 'Nghị định',
  THONG_TU: 'Thông tư',
  QUYET_DINH: 'Quyết định',
  KHAC: 'Khác',
};

const STATUS_TONE: Record<string, 'green' | 'red' | 'amber'> = {
  CON_HIEU_LUC: 'green',
  HET_HIEU_LUC: 'red',
  CHUA_HIEU_LUC: 'amber',
};

const STATUS_LABEL: Record<string, string> = {
  CON_HIEU_LUC: 'Còn hiệu lực',
  HET_HIEU_LUC: 'Hết hiệu lực',
  CHUA_HIEU_LUC: 'Chưa hiệu lực',
};

/** Card văn bản pháp luật — tiêu đề, trích đoạn, nguồn (NHIỆM VỤ 7) */
export function LegalDocCard({ doc }: { doc: LegalDocument }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge tone="blue">{DOC_TYPE_LABEL[doc.docType] ?? doc.docType}</Badge>
        <Badge tone={STATUS_TONE[doc.status] ?? 'gray'}>{STATUS_LABEL[doc.status] ?? doc.status}</Badge>
        <span className="text-xs text-slate-400">{doc.code}</span>
      </div>
      <h3 className="mb-1 font-medium text-slate-800">{doc.title}</h3>
      {doc.summary && <p className="line-clamp-3 text-sm text-slate-500">{doc.summary}</p>}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span>Ban hành bởi {doc.issuingBody}</span>
        {doc.sourceUrl && (
          <a
            href={doc.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 font-medium text-primary hover:underline"
          >
            Xem nguồn <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  );
}
