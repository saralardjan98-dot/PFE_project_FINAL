import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api"; 

interface AuthContextType {
  session: string | null;
  user: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<string | null>(localStorage.getItem("access_token"));
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  
useEffect(() => {
  const checkUser = async () => {
    const token = localStorage.getItem("access_token");
    if (token) {
      try {
        const response = await api.get("/auth/me"); 
    
        console.log("My Profile Data:", response.data); 
        setUser(response.data); 
        setSession(token);
      } catch (err) {
        console.error("Session expired or error:", err);
        localStorage.removeItem("access_token");
        setSession(null);
        setUser(null);
      }
    }
    setLoading(false);
  };
  checkUser();
}, []);

  const signIn = async (email, password) => {
    try {
      const response = await api.post("/auth/login", {
        email: email, 
        password: password
      });
  
      const { access_token } = response.data;

        localStorage.setItem("access_token", access_token);
        setSession(access_token);

        const me = await api.get("/auth/me");
        setUser(me.data);
navigate("/");
return { error: null };
  
     
    
    } catch (err: any) {
      console.error("Login Error:", err.response?.data);
      return { 
        error: err.response?.data?.detail || "Erreur de connexion" 
      };
    }
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      const response = await api.post("/auth/register", {
        email,
        password,
        full_name: displayName
      });
      return { error: null };
    } catch (err: any) {
      return { error: err.response?.data?.detail || "Erreur d'inscription" };
    }
  };


  const signOut = async () => {
    localStorage.removeItem("access_token");
    setSession(null);
    setUser(null);
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}