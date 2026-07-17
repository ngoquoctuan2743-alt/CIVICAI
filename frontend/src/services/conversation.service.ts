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

  findMine: (page = 1, limit = 20) =>
    apiFetch<PaginatedResult<Conversation>>(`/conversations?page=${page}&limit=${limit}`),

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
};
