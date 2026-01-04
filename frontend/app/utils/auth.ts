export interface User {
  role: string;
  username: string;
  [key: string]: any;
}

// Get user info from token stored in localStorage (client-side)
export const getUserFromLocalStorage = (): User | null => {
  if (typeof window === "undefined") return null;
  const user = localStorage.getItem("user");
  if (!user || user === "undefined" || user === "null") return null;
  try {
    return JSON.parse(user);
  } catch (e) {
    console.error("Failed to parse user from localStorage:", e);
    return null;
  }
};
