import { conversationService } from '../../../services/conversation.service';
import type { AiSourceItem } from '../../../types/api';
import { DEMO_STEP_TRANSITION_MS, DEMO_TYPING_SPEED_MS, DEMO_WORKFLOW_STAGE_MS } from '../config/demo.config';
import type { ChatSimStepData } from '../types';
import { WORKFLOW_STAGES } from '../components/screens/WorkflowDiagram';
import type { DemoStep } from './demo-scenario-engine';
import type { DemoStepContext } from './demo-step-context';
import { sleep } from './sleep';

/**
 * Sinh 1 DemoStep hỏi-đáp thật hoàn chỉnh: gõ câu hỏi -> sơ đồ AI Workflow
 * (chạy song song với gọi API thật) -> hiện câu trả lời thật -> hiện trích
 * dẫn thật. Dùng chung cho câu hỏi 1 (task hiện tại) và câu hỏi 2 sau khi
 * upload tài liệu (task Admin Upload) — cùng 1 luồng thật, khác câu hỏi.
 * DemoStep là NGUỒN THỜI GIAN DUY NHẤT (setStepData nhiều lần theo tiến độ),
 * component render chỉ là hàm thuần theo props — dễ test bằng cách mock sleep.
 */
export function createAskQuestionStep(id: string, question: string): DemoStep<DemoStepContext> {
  return {
    id,
    async run(ctx) {
      const setData = ctx.setStepData as (d: ChatSimStepData) => void;

      let conversationId = ctx.vars.conversationId as string | undefined;
      if (!conversationId) {
        const convo = await conversationService.create('CHAT', 'VAIC Demo');
        conversationId = convo.id;
        ctx.vars.conversationId = conversationId;
      }

      // ---- Gõ câu hỏi ----
      const questionWords = question.split(' ');
      for (let i = 0; i <= questionWords.length; i++) {
        setData({ phase: 'typing', question, revealedWordCount: i });
        await sleep(DEMO_TYPING_SPEED_MS);
      }

      // ---- Sơ đồ AI Workflow chạy song song với gọi API thật ----
      const workflowAnimation = (async () => {
        for (let i = 0; i < WORKFLOW_STAGES.length; i++) {
          setData({ phase: 'workflow', question, activeIndex: i });
          await sleep(DEMO_WORKFLOW_STAGE_MS);
        }
      })();
      const [, result] = await Promise.all([workflowAnimation, conversationService.sendMessage(conversationId, question)]);

      // aiError populated + assistantMessage null là phản hồi THẬT khi AI Service gián đoạn
      // (không throw — xem conversation.service.ts backend) — hiển thị đúng thực trạng, không giả vờ.
      const answerText = result.assistantMessage?.content ?? result.aiError ?? 'AI Service hiện không phản hồi.';
      const sources = (result.assistantMessage?.metadata?.sources ?? []) as AiSourceItem[];

      // ---- Hiện câu trả lời thật ----
      const answerWords = answerText.split(' ');
      for (let i = 0; i <= answerWords.length; i++) {
        setData({ phase: 'answer', question, answer: answerText, revealedWordCount: i });
        await sleep(DEMO_TYPING_SPEED_MS);
      }

      // ---- Trích dẫn thật (title/excerpt/score — KHÔNG có section/page/version vì API không trả field đó) ----
      setData({ phase: 'citations', question, answer: answerText, sources });
      await sleep(DEMO_STEP_TRANSITION_MS * 3);
    },
  };
}
