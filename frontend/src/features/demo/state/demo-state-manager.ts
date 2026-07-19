/**
 * DemoStateManager — state machine thuần (không phụ thuộc React), dùng qua
 * useReducer trong use-demo-mode.ts. Tách riêng để test logic chuyển trạng
 * thái độc lập, không cần render.
 */

export type DemoStatus = 'idle' | 'entering' | 'running' | 'completed' | 'error';

export interface DemoState {
  status: DemoStatus;
  stepIndex: number;
  stepId: string | null;
  error: string | null;
}

export const initialDemoState: DemoState = {
  status: 'idle',
  stepIndex: -1,
  stepId: null,
  error: null,
};

export type DemoAction =
  | { type: 'ENTER' }
  | { type: 'LOGGED_IN' }
  | { type: 'ADVANCE'; stepIndex: number; stepId: string }
  | { type: 'ERROR'; error: string }
  | { type: 'COMPLETE' }
  | { type: 'RESET' };

export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case 'ENTER':
      return { ...initialDemoState, status: 'entering' };
    case 'LOGGED_IN':
      return { ...state, status: 'running' };
    case 'ADVANCE':
      return { ...state, status: 'running', stepIndex: action.stepIndex, stepId: action.stepId, error: null };
    case 'ERROR':
      return { ...state, status: 'error', error: action.error };
    case 'COMPLETE':
      return { ...state, status: 'completed' };
    case 'RESET':
      return initialDemoState;
    default:
      return state;
  }
}
