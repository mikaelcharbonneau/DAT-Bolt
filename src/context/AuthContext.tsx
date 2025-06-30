import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { azureClient } from '../lib/azureClient';
import type { User } from '../types';

type AuthContextType = {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check if user has a token
        const token = localStorage.getItem('authToken');
        if (token) {
          // Verify token with Azure Functions
          const response = await azureClient.getCurrentUser();
          if (response.success && response.data) {
            setIsAuthenticated(true);
            setUser(response.data);
          } else {
            // Token is invalid, remove it
            localStorage.removeItem('authToken');
            setIsAuthenticated(false);
            setUser(null);
            if (location.pathname !== '/login') {
              navigate('/login', { replace: true });
            }
          }
        } else {
          setIsAuthenticated(false);
          setUser(null);
          if (location.pathname !== '/login') {
            navigate('/login', { replace: true });
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setIsAuthenticated(false);
        setUser(null);
        if (location.pathname !== '/login') {
          navigate('/login', { replace: true });
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [navigate, location.pathname]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const response = await azureClient.signIn(email, password);

      if (response.success && response.data) {
        setIsAuthenticated(true);
        setUser(response.data.user);
        return true;
      } else {
        console.error('Error logging in:', response.error);
        return false;
      }
    } catch (error) {
      console.error('Error during login:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await azureClient.signOut();
      setIsAuthenticated(false);
      setUser(null);
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};