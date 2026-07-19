export const WORKFLOW_STAGES = [
  'User Question',
  'Intent Analysis',
  'Knowledge Retrieval',
  'Prompt Construction',
  'Gemini Generation',
  'Citation Assembly',
  'Final Answer',
] as const;

/**
 * Trình chiếu tuần tự các giai đoạn XỬ LÝ THẬT mà backend/AI service thực
 * hiện theo đúng thứ tự thật (conversation.service.ts -> ai-client -> AI
 * Service RAG pipeline) khi trả lời 1 câu hỏi. Component THUẦN — DemoStep là
 * nguồn thời gian duy nhất (tăng dần activeIndex). Backend hiện KHÔNG trả
 * thời gian xử lý theo từng giai đoạn riêng lẻ, nên nhịp độ ở đây là trình
 * bày trực quan cấu hình được, không phải số đo thật — chỉ trình tự là thật.
 */
export function WorkflowDiagram({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="flex flex-col items-center gap-2">
      {WORKFLOW_STAGES.map((stage, i) => (
        <div key={stage} className="flex flex-col items-center gap-2">
          <div
            className={`rounded-full border px-5 py-2 text-sm font-medium transition-colors ${
              i <= activeIndex ? 'border-blue-400 bg-blue-500/20 text-blue-200' : 'border-slate-700 text-slate-500'
            }`}
          >
            {stage}
          </div>
          {i < WORKFLOW_STAGES.length - 1 && <div className="h-4 w-px bg-slate-700" />}
        </div>
      ))}
    </div>
  );
}
