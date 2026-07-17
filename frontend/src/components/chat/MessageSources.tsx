import { Building2, FileText, Scale } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '../ui/Badge';
import type { AiRelatedItem, MessageMetadata } from '../../types/api';

const SOURCE_ICON: Record<string, React.ElementType> = {
  LEGAL_DOCUMENT: Scale,
  PROCEDURE: FileText,
  AGENCY: Building2,
};

function RelatedSection({
  title,
  items,
  href,
  icon: Icon,
}: {
  title: string;
  items: AiRelatedItem[];
  href: (id: string) => string;
  icon: React.ElementType;
}) {
  if (!items.length) return null;
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
        <Icon size={13} aria-hidden="true" />
        {title}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Link
            key={item.id}
            href={href(item.id)}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 transition-colors hover:border-primary hover:text-primary"
          >
            {item.title}
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Hiển thị nguồn tham khảo + đối tượng liên quan (NHIỆM VỤ 6: RAG Source Display) */
export function MessageSources({ metadata }: { metadata: MessageMetadata }) {
  const hasSources = !!metadata.sources?.length;
  const hasRelated =
    !!metadata.relatedProcedures?.length || !!metadata.relatedLaws?.length || !!metadata.agencies?.length;

  if (!hasSources && !hasRelated) return null;

  return (
    <div className="mt-2 flex max-w-[85%] flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      {hasSources && (
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Nguồn tham khảo</p>
            {typeof metadata.confidence === 'number' && (
              <Badge tone={metadata.confidence >= 0.85 ? 'green' : 'amber'}>
                Độ tin cậy {Math.round(metadata.confidence * 100)}%
              </Badge>
            )}
          </div>
          <ul className="flex flex-col gap-1.5">
            {metadata.sources!.map((s, idx) => {
              const Icon = SOURCE_ICON[s.sourceType] ?? FileText;
              return (
                <li key={`${s.sourceType}-${s.sourceId}-${idx}`} className="flex items-start gap-2 text-xs text-slate-600">
                  <Icon size={13} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
                  <span>
                    <span className="font-medium text-slate-700">[{idx + 1}] {s.title}</span> — {s.excerpt}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <RelatedSection title="Thủ tục liên quan" items={metadata.relatedProcedures ?? []} href={(id) => `/procedures/${id}`} icon={FileText} />
      <RelatedSection title="Văn bản pháp luật" items={metadata.relatedLaws ?? []} href={() => '/legal'} icon={Scale} />
      <RelatedSection title="Cơ quan xử lý" items={metadata.agencies ?? []} href={() => '/agencies'} icon={Building2} />
    </div>
  );
}
