import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  Shield,
  Key,
  Copy,
  RefreshCw,
  LogOut,
  Activity,
  BarChart3,
  Database,
  TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';

interface UserStats {
  projectsScanned: number;
  totalDependencies: number;
  scanCount: number;
  activeProjects: number;
  recentProjects: Array<{
    name: string;
    lastScan: string;
    dependencyCount: number;
  }>;
}

export const Dashboard = () => {
  const { user, logout, apiKey, setApiKey, isAuthenticated } = useAuthStore();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const Navigate = useNavigate();

  // Fetch user stats
  const fetchUserStats = async () => {
    try {
      const response = await api.get('/users/stats');
      console.log('🚀 ~ User Stats ~ response:', response.data);
      setUserStats(response.data.data);
    } catch (error) {
      console.error('Error fetching user stats:', error);
      toast.error('Failed to fetch user statistics');
    }
  };

  useEffect(() => {
    console.log('Dashboard - isAuthenticated:', isAuthenticated);
    if (!isAuthenticated) {
      console.log('Dashboard - Not authenticated, redirecting to login');
      Navigate('/login');
      return;
    }
    console.log('Dashboard - Authenticated, fetching user stats');
    fetchUserStats();
  }, [isAuthenticated, Navigate]);

  // Generate API key
  const generateApiKey = async () => {
    setIsLoading(true);

    try {
      const response = await api.post('/auth/api-key');
      console.log('🚀 ~ Generate API Key ~ response:', response.data);

      setApiKey(response.data.apiKey);
      toast.success('API key generated successfully!');
    } catch (error: any) {
      console.error('API key generation error:', error);
      toast.error(
        error.response?.data?.message || 'Failed to generate API key'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Reset API key
  const resetApiKey = async () => {
    setIsLoading(true);

    try {
      const response = await api.post('/auth/api-key/reset');
      console.log('🚀 ~ Reset API Key ~ response:', response.data);

      setApiKey(response.data.apiKey);
      toast.success('API key reset successfully!');
    } catch (error: any) {
      console.error('API key reset error:', error);
      toast.error(error.response?.data?.message || 'Failed to reset API key');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="bg-blue-600 p-2 rounded-lg mr-3">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  PackSafe Dashboard
                </h1>
                <p className="text-sm text-gray-500">
                  Welcome back, {user?.name}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Database className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">
                  Projects Scanned
                </h3>
                <p className="text-2xl font-bold text-gray-900">
                  {userStats?.projectsScanned || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">
                  Total Dependencies
                </h3>
                <p className="text-2xl font-bold text-gray-900">
                  {userStats?.totalDependencies || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="bg-purple-100 p-3 rounded-lg">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">
                  Total Scans
                </h3>
                <p className="text-2xl font-bold text-gray-900">
                  {userStats?.scanCount || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="bg-orange-100 p-3 rounded-lg">
                <Activity className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">
                  Active Projects
                </h3>
                <p className="text-2xl font-bold text-gray-900">
                  {userStats?.activeProjects || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* API Key Management */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Key className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">
                API Key Management
              </h2>
            </div>
            <button
              onClick={() => fetchUserStats()}
              className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Stats
            </button>
          </div>

          {apiKey ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-medium text-green-800 mb-2">
                Your API Key
              </h3>
              <div className="bg-white p-3 rounded border flex items-center justify-between">
                <code className="text-sm text-gray-800 break-all mr-4">
                  {apiKey}
                </code>
                <button
                  onClick={() => copyToClipboard(apiKey)}
                  className="flex items-center px-3 py-1 text-sm text-green-600 hover:text-green-800 border border-green-300 rounded hover:bg-green-50 transition-colors"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </button>
              </div>
              <p className="text-xs text-green-700 mt-2">
                Use this key in your VS Code extension configuration.
              </p>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 text-center">
              <p className="text-gray-600 mb-3">No API key generated yet.</p>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              onClick={() => generateApiKey()}
              disabled={isLoading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Key className="h-4 w-4 mr-2" />
              )}
              {apiKey ? 'Generate New Key' : 'Generate API Key'}
            </button>

            {apiKey && (
              <button
                onClick={() => resetApiKey()}
                disabled={isLoading}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Reset Key
              </button>
            )}
          </div>
        </div>

        {/* Recent Projects */}
        {userStats &&
          userStats.recentProjects &&
          userStats.recentProjects.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Database className="h-5 w-5 mr-2" />
                Recent Projects
              </h2>
              <div className="space-y-4">
                {userStats.recentProjects.map((project, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 p-4 rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {project.name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        Last scan:{' '}
                        {new Date(project.lastScan).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">
                        {project.dependencyCount}
                      </p>
                      <p className="text-xs text-gray-500">dependencies</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>
    </div>
  );
};
