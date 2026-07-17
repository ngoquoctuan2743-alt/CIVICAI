import { apiFetch } from '../lib/api-client';
import type { CitizenProfile } from '../types/api';

export const citizenService = {
  getMyProfile: () => apiFetch<CitizenProfile>('/citizens/profile'),
};
