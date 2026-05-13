import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'RIDER' | 'DRIVER' | 'ADMIN';
export type UserStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  homeLat?: number;
  homeLng?: number;
  homeAddress?: string;
  workLat?: number;
  workLng?: number;
  workAddress?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user, token) => {
        set({ user, token, isAuthenticated: true });
      },

      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'shuttle-auth', // localStorage key — unified for all roles
    }
  )
);
