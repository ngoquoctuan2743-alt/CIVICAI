'use client';

import { useCallback, useMemo, useReducer, useRef, useState } from 'react';
import { useAuth } from '../../../stores/auth-context';
import { DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD, DEMO_EXIT_KEY, DEMO_HOTKEYS } from '../config/demo.config';
import { demoSteps } from '../engine/demo-steps';
import { runScenario } from '../engine/demo-scenario-engine';
import type { DemoStepContext } from '../engine/demo-step-context';
import { resetDemoConversations } from '../services/demo-data-seeder';
import { demoReducer, initialDemoState } from '../state/demo-state-manager';
import { useHotkey } from '../../../hooks/use-hotkey';

/**
 * DemoModeService — orchestrator chính của Demo Mode, dạng hook vì phụ thuộc
 * trực tiếp AuthContext thật (đăng nhập/đăng xuất admin_demo bằng đúng luồng
 * auth thật của app, không có đường tắt riêng). Logic thuần (state machine,
 * scenario runner) nằm ở state/ và engine/ để test độc lập không cần React.
 */
export function useDemoMode() {
  const { login, logout } = useAuth();
  const [state, dispatch] = useReducer(demoReducer, initialDemoState);
  const [stepData, setStepData] = useState<unknown>(null);
  const cancelledRef = useRef(false);
  const varsRef = useRef<Record<string, unknown>>({});

  const enter = useCallback(async () => {
    cancelledRef.current = false;
    varsRef.current = {};
    setStepData(null);
    dispatch({ type: 'ENTER' });
    try {
      // Đăng nhập trước để có phiên admin_demo hợp lệ, RỒI mới reset — reset cần
      // token thật để gọi API xoá hội thoại; gọi trước login sẽ luôn 401 vô ích.
      await login({ email: DEMO_ADMIN_EMAIL, password: DEMO_ADMIN_PASSWORD });
      await resetDemoConversations().catch(() => undefined);
      dispatch({ type: 'LOGGED_IN' });

      const ctx: DemoStepContext = { setStepData, vars: varsRef.current };
      await runScenario(demoSteps, ctx, dispatch, () => cancelledRef.current);
    } catch (error) {
      dispatch({ type: 'ERROR', error: error instanceof Error ? error.message : String(error) });
    }
  }, [login]);

  const exit = useCallback(() => {
    cancelledRef.current = true;
    dispatch({ type: 'RESET' });
    setStepData(null);
    void logout();
  }, [logout]);

  const isActive = state.status !== 'idle';

  useHotkey(DEMO_HOTKEYS, () => void enter(), !isActive);
  useHotkey([DEMO_EXIT_KEY], exit, isActive);

  return useMemo(() => ({ state, stepData, enter, exit }), [state, stepData, enter, exit]);
}
