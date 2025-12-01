// utils/auth.ts

// Dummy token verification
export const verifyToken = (token: string): boolean => {
  return token === "dummy-token";
};

// Dummy token generation
export const generateToken = (data: any): string => {
  return "dummy-token";
};

// SSR-safe user retrieval from localStorage
export const getUserFromLocalStorage = (): any | null => {
  try {
    // Only access localStorage if it exists (client-side)
    const storage = (globalThis as any).localStorage;
    if (!storage) return null;

    const user = storage.getItem("user");
    return user ? JSON.parse(user) : null;
  } catch (error) {
    // In case of any unexpected errors
    return null;
  }
};
