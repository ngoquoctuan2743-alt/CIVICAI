import { apiFetch } from '../lib/api-client';
import type {
  Conversation,
  ConversationChannel,
  Feedback,
  Message,
  PaginatedResult,
  SendMessageResult,
} from '../types/api';

export const conversationService = {
  create: (channel: ConversationChannel = 'CHAT', title?: string) =>
    apiFetch<Conversation>('/conversations', { method: 'POST', body: { channel, title } }),

  findMine: (params: { page?: number; limit?: number; search?: string } = {}) => {
    const qs = new URLSearchParams();
    qs.set('page', String(params.page ?? 1));
    qs.set('limit', String(params.limit ?? 20));
    if (params.search) qs.set('search', params.search);
    return apiFetch<PaginatedResult<Conversation>>(`/conversations?${qs.toString()}`);
  },

  getMessages: (conversationId: string, page = 1, limit = 100) =>
    apiFetch<PaginatedResult<Message>>(
      `/conversations/${conversationId}/messages?page=${page}&limit=${limit}`,
    ),

  sendMessage: (conversationId: string, content: string) =>
    apiFetch<SendMessageResult>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: { content },
    }),

  submitFeedback: (conversationId: string, messageId: string, rating: 1 | -1, comment?: string) =>
    apiFetch<Feedback>(`/conversations/${conversationId}/messages/${messageId}/feedback`, {
      method: 'POST',
      body: { rating, comment },
    }),

  rename: (conversationId: string, title: string) =>
    apiFetch<Conversation>(`/conversations/${conversationId}`, { method: 'PATCH', body: { title } }),

  remove: (conversationId: string) =>
    apiFetch<{ message: string }>(`/conversations/${conversationId}`, { method: 'DELETE' }),
};
