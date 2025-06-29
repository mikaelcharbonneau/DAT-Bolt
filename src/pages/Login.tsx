import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight } from 'lucide-react';
import HPELogo from '../components/ui/HPELogo';
import { supabase } from '../lib/supabaseClient';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    setError(null);
    setLoading(true);
    
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // If remember me is checked, persist the session
      if (rememberMe) {
        await supabase.auth.setSession({
          access_token: (await supabase.auth.getSession()).data.session?.access_token || '',
          refresh_token: (await supabase.auth.getSession()).data.session?.refresh_token || '',
        });
      }

      navigate('/');
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex mb-6">
            <HPELogo height={48} />
          </div>
          <h2 className="text-2xl font-bold text-hpe-blue-700">
            HPE Walkthrough App
          </h2>
          <p className="mt-2 text-sm text-hpe-blue-500">
            Sign in to access your dashboard
          </p>
        </div>
        
        {/* Login Card */}
        <div className="bg-white shadow-md rounded-lg">
          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-hpe-error-50 border border-hpe-error-200 rounded-md text-sm text-hpe-error-600">
                {error}
              </div>
            )}
            
            <div className="mb-4">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={18} className="text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <button 
                  type="button"
                  onClick={() => navigate('/reset-password')}
                  className="text-sm text-hpe-green hover:text-hpe-green-600"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-gray-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-hpe-green-500 rounded border-gray-300 focus:ring-hpe-green-500"
                />
                <label htmlFor="remember-me" className="ml-2 text-sm text-hpe-blue-600">
                  Remember me
                </label>
              </div>
            </div>
            
            <button 
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-2.5 flex items-center justify-center relative"
            >
              {loading ? (
                <span className="inline-flex items-center">
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Signing in...
                </span>
              ) : (
                <span className="inline-flex items-center">
                  Sign in
                  <ArrowRight className="ml-2 h-4 w-4" />
                </span>
              )}
            </button>
          </form>
          
          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 text-center rounded-b-lg">
            <p className="text-sm text-hpe-blue-500">
              Don't have an account? <a href="mailto:support@hpe.com" className="text-hpe-green hover:text-hpe-green-600 font-medium">Contact your administrator</a>
            </p>
          </div>
        </div>
        
        {/* Footer Links */}
        <div className="mt-6 text-center">
          <div className="flex justify-center space-x-4 text-xs text-hpe-blue-500">
            <a href="https://www.hpe.com/us/en/legal/privacy.html" target="_blank" rel="noopener noreferrer" className="hover:text-hpe-blue-700">Privacy Policy</a>
            <a href="https://www.hpe.com/us/en/legal/terms-of-use.html" target="_blank" rel="noopener noreferrer" className="hover:text-hpe-blue-700">Terms of Service</a>
            <a href="mailto:support@hpe.com" className="hover:text-hpe-blue-700">Contact Support</a>
          </div>
          <p className="mt-3 text-xs text-hpe-blue-400">
            &copy; {new Date().getFullYear()} Hewlett Packard Enterprise Development LP
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;