import { create } from "zustand";
import { persist } from "zustand/middleware";

type AuthState = {
  isAuthenticated: boolean;
  email: string | null;
  name: string | null;
  token: string | null;
  userId: string | null;
  login: (params: { email: string; name?: string; token: string; userId: string }) => void;
  logout: () => void;
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      email: null,
      name: null,
      token: null,
      userId: null,
      login: ({ email, name, token, userId }) =>
        set({
          isAuthenticated: true,
          email,
          name: name ?? email.split("@")[0],
          token,
          userId,
        }),
      logout: () =>
        set({
          isAuthenticated: false,
          email: null,
          name: null,
          token: null,
          userId: null,
        }),
    }),
    { name: "marea-auth" }
  )
);
