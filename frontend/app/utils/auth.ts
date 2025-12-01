export interface User {
  role: string;
  username: string;
  [key: string]: any;
}

// Get user info from token stored in localStorage (client-side)
export const getUserFromLocalStorage = (): User | null => {
  if (typeof window === "undefined") return null;
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};
