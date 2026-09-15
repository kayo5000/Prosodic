import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from './AuthContext';
import * as SecureStore from 'expo-secure-store';
import * as api from '../services/api/prosodicApi';

// Babel/Jest hoist jest.mock() calls to the top of the module at compile
// time regardless of where they're written — safe to keep them below the
// imports they mock (the more readable order) rather than above.
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('../services/api/prosodicApi', () => ({
  login: jest.fn(),
  register: jest.fn(),
  getMe: jest.fn(),
  setAuthToken: jest.fn(),
  clearAuthToken: jest.fn(),
}));

const mockUser = { id: 1, email: 'a@b.com', username: 'kayo', geo_influences: [], created_at: '2026-01-01' };

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

afterEach(() => {
  jest.clearAllMocks();
});

// @testing-library/react-native v14's render()/renderHook() became async
// (return a Promise) — must be awaited, unlike every earlier RNTL major
// version. Confirmed by direct reproduction (an unawaited render()
// silently returns a pending Promise instead of the render result), not
// assumed from a changelog skim.

describe('session restore on launch', () => {
  it('starts loading=true, ends loading=false with no user when no token is stored', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(api.getMe).not.toHaveBeenCalled();
  });

  it('restores the user when a stored token is still valid', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('stored-jwt');
    (api.getMe as jest.Mock).mockResolvedValue({ data: { user: mockUser }, error: null, status: 200 });

    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(api.setAuthToken).toHaveBeenCalledWith('stored-jwt');
    expect(result.current.user).toEqual(mockUser);
  });

  it('drops back to logged-out (and deletes the stale token) when the stored token is expired/invalid', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('expired-jwt');
    (api.getMe as jest.Mock).mockResolvedValue({ data: null, error: 'Token expired', status: 401 });

    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
    expect(api.clearAuthToken).toHaveBeenCalled();
  });
});

describe('login', () => {
  it('on success: sets user, persists the token, returns no error', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (api.login as jest.Mock).mockResolvedValue({
      data: { token: 'new-jwt', user: mockUser }, error: null, status: 200,
    });

    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcome: { error: string | null } | undefined;
    await act(async () => {
      outcome = await result.current.login('a@b.com', 'pw');
    });

    expect(outcome).toEqual({ error: null });
    expect(result.current.user).toEqual(mockUser);
    expect(api.setAuthToken).toHaveBeenCalledWith('new-jwt');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('prosodic_auth_token', 'new-jwt');
  });

  it('on failure: returns the backend error, user stays null', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (api.login as jest.Mock).mockResolvedValue({
      data: null, error: 'Invalid email or password', status: 401,
    });

    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcome: { error: string | null } | undefined;
    await act(async () => {
      outcome = await result.current.login('a@b.com', 'wrong');
    });

    expect(outcome).toEqual({ error: 'Invalid email or password' });
    expect(result.current.user).toBeNull();
  });
});

describe('logout', () => {
  it('clears the user, deletes the stored token, clears the API client token', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('stored-jwt');
    (api.getMe as jest.Mock).mockResolvedValue({ data: { user: mockUser }, error: null, status: 200 });

    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).toEqual(mockUser));

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
    expect(api.clearAuthToken).toHaveBeenCalled();
  });
});

describe('useAuth outside a provider', () => {
  it('throws a clear error instead of returning undefined-shaped nonsense', async () => {
    const { result } = await renderHook(() => {
      try {
        return useAuth();
      } catch (e) {
        return e;
      }
    });
    expect(result.current).toEqual(new Error('useAuth must be used within AuthProvider'));
  });
});
