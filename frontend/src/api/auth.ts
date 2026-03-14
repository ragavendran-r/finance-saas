import apiClient from './client';
import type { LoginResponse, RegisterPayload, User } from '../types';

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', { email, password });
    return data;
  },

  register: async (payload: RegisterPayload): Promise<User> => {
    const { data } = await apiClient.post<User>('/auth/register', payload);
    return data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  refresh: async (): Promise<LoginResponse> => {
    const { data } = await apiClient.post<LoginResponse>('/auth/refresh', {});
    return data;
  },

  me: async (): Promise<User> => {
    const { data } = await apiClient.get<User>('/auth/me');
    return data;
  },
};
