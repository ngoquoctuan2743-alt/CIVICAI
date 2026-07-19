import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatSimStepData } from '../../types';
import { TypewriterText } from '../ui/TypewriterText';
import { ProcedureGuidanceScreen } from './ProcedureGuidanceScreen';
import { WorkflowDiagram } from './WorkflowDiagram';

/** Màn hình mô phỏng hỏi-đáp công dân — thuần render theo `stepData`, không tự tính thời gian */
export function ChatSimScreen({ data }: { data: ChatSimStepData }) {
  if (data.phase === 'guidance') return <ProcedureGuidanceScreen data={data} />;

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-6 px-6">
      <div className="w-full rounded-2xl border border-slate-800 bg-slate-900 p-5 text-left">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Công dân hỏi</p>
        <p className="text-lg text-white">
          {data.phase === 'typing' ? (
            <TypewriterText text={data.question} revealedWordCount={data.revealedWordCount} />
          ) : (
            data.question
          )}
        </p>
      </div>

      {data.phase === 'workflow' && <WorkflowDiagram activeIndex={data.activeIndex} />}

      {(data.phase === 'answer' || data.phase === 'citations') && (
        <div className="w-full rounded-2xl border border-blue-900/60 bg-blue-950/30 p-5 text-left">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-400">VAIC trả lời</p>
          <div className="prose prose-invert prose-sm max-w-none text-slate-100">
            {data.phase === 'answer' ? (
              <TypewriterText text={data.answer} revealedWordCount={data.revealedWordCount} />
            ) : (
              <Markdown remarkPlugins={[remarkGfm]}>{data.answer}</Markdown>
            )}
          </div>
        </div>
      )}

      {data.phase === 'citations' && (
        <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-left">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Nguồn tham khảo thật</p>
          {data.sources.length === 0 ? (
            <p className="text-sm text-slate-500">Không có nguồn trích dẫn cho câu trả lời này.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.sources.map((s, i) => (
                <li key={`${s.sourceId}-${i}`} className="text-sm text-slate-300">
                  <span className="font-medium text-white">[{i + 1}] {s.title}</span>
                  <span className="ml-2 text-xs text-slate-500">độ liên quan {Math.round(s.score * 100)}%</span>
                  <p className="mt-0.5 text-xs text-slate-400">{s.excerpt}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
