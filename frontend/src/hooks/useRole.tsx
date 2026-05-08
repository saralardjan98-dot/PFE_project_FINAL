import { useAuth } from "./useAuth";

export function useRole() {
  const { user } = useAuth(); 

  
  const role = user?.role || "user"; 
  
  
  const isAdmin = role === "admin";

  return { 
    role, 
    isAdmin, 
    loading: false 
  };
}