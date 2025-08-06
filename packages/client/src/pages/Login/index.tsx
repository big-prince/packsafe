import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff, Shield, Key, User, Mail, Lock } from 'lucide-react';

import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export const Login = () => {
  const { isAuthenticated, apiKey } = useAuthStore();
  const location = useLocation();
  const Navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(
    location.pathname === '/register'
  );
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [loginData, setLoginData] = useState<LoginData>({
    email: '',
    password: '',
  });

  const [registerData, setRegisterData] = useState<RegisterData>({
    name: '',
    email: '',
    password: '',
  });

  //zustand store
  const login = useAuthStore(state => state.login);
  const setApiKey = useAuthStore(state => state.setApiKey);

  // Handle navigation when authenticated
  useEffect(() => {
    console.log('Login - isAuthenticated:', isAuthenticated);
    if (isAuthenticated) {
      console.log('Login - Navigating to dashboard');
      Navigate('/');
    }
  }, [isAuthenticated, Navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await api.post('/auth/login', loginData);
      console.log('🚀 ~ Login ~ response:', response.data);

      // You'll handle this with Zustand
      toast.success('Login successful!');
      login(response.data.token, response.data.user);
      response.data.apiKey ? setApiKey(response.data.apiKey) : null;
      //dashboard
      Navigate('/');
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await api.post('/auth/register', registerData);
      console.log('🚀 ~ Register ~ response:', response.data);

      toast.success('Registration successful!');
      login(response.data.token, response.data.user);
      // Redirect to dashboard
      Navigate('/');
    } catch (error: any) {
      console.error('Register error:', error);
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  // const generateApiKey = async () => {
  //   setIsLoading(true);

  //   try {
  //     const response = await api.post('/auth/api-key');
  //     console.log('🚀 ~ Generate API Key ~ response:', response.data);

  //     // You'll handle this with Zustand
  //     toast.success('API key generated!');
  //   } catch (error: any) {
  //     console.error('API key generation error:', error);
  //     toast.error(
  //       error.response?.data?.message || 'Failed to generate API key'
  //     );
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-md w-full space-y-8 p-8">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="flex justify-center">
            <div className="bg-blue-600 p-3 rounded-2xl">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">PackSafe</h2>
          <p className="mt-2 text-sm text-gray-600">
            {isRegister ? 'Create your account' : 'Sign in to your account'}
          </p>
        </div>

        {/* API Key Display */}
        {apiKey && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Key className="h-5 w-5 text-green-600 mr-2" />
              <h3 className="text-sm font-medium text-green-800">
                Your API Key
              </h3>
            </div>
            <div className="bg-white p-3 rounded border">
              <code className="text-sm text-gray-800 break-all">{apiKey}</code>
            </div>
            <p className="text-xs text-green-700 mt-2">
              Save this key securely. You'll need it for the VS Code extension.
            </p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(apiKey);
                toast.success('API key copied to clipboard!');
              }}
              className="mt-2 text-sm text-green-600 hover:text-green-800 underline"
            >
              Copy to clipboard
            </button>
          </div>
        )}

        {/* Form */}
        <form
          className="mt-8 space-y-6"
          onSubmit={isRegister ? handleRegister : handleLogin}
        >
          <div className="space-y-4">
            {isRegister && (
              <div>
                <label htmlFor="name" className="sr-only">
                  Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Full name"
                    value={registerData.name}
                    onChange={e =>
                      setRegisterData({ ...registerData, name: e.target.value })
                    }
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Email address"
                  value={isRegister ? registerData.email : loginData.email}
                  onChange={e =>
                    isRegister
                      ? setRegisterData({
                          ...registerData,
                          email: e.target.value,
                        })
                      : setLoginData({ ...loginData, email: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Password"
                  value={
                    isRegister ? registerData.password : loginData.password
                  }
                  onChange={e =>
                    isRegister
                      ? setRegisterData({
                          ...registerData,
                          password: e.target.value,
                        })
                      : setLoginData({ ...loginData, password: e.target.value })
                  }
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isRegister ? 'Creating Account...' : 'Signing In...'}
                </div>
              ) : isRegister ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              {isRegister
                ? 'Already have an account? Sign in'
                : "Don't have an account? Create one"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
