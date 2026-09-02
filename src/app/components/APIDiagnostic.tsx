import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

export function APIDiagnostic() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<{
    healthCheck?: { status: 'success' | 'error'; message: string; time?: number };
    products?: { status: 'success' | 'error'; message: string; time?: number };
    auth?: { status: 'success' | 'error'; message: string; time?: number };
  }>({});

  const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-c4f5ade4`;

  const testHealthCheck = async () => {
    const startTime = Date.now();
    try {
      console.log('[DIAGNOSTIC] Testing health endpoint:', `${API_BASE}/health`);
      const response = await fetch(`${API_BASE}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      const time = Date.now() - startTime;
      
      if (!response.ok) {
        const text = await response.text();
        console.error('[DIAGNOSTIC] Health check failed:', response.status, text);
        return {
          status: 'error' as const,
          message: `HTTP ${response.status}: ${text}`,
          time,
        };
      }
      
      const data = await response.json();
      console.log('[DIAGNOSTIC] Health check response:', data);
      
      return {
        status: 'success' as const,
        message: JSON.stringify(data),
        time,
      };
    } catch (error) {
      const time = Date.now() - startTime;
      console.error('[DIAGNOSTIC] Health check error:', error);
      return {
        status: 'error' as const,
        message: error instanceof Error ? error.message : String(error),
        time,
      };
    }
  };

  const testProducts = async () => {
    const startTime = Date.now();
    try {
      console.log('[DIAGNOSTIC] Testing products endpoint:', `${API_BASE}/products`);
      const response = await fetch(`${API_BASE}/products`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      const time = Date.now() - startTime;
      
      if (!response.ok) {
        const text = await response.text();
        console.error('[DIAGNOSTIC] Products fetch failed:', response.status, text);
        return {
          status: 'error' as const,
          message: `HTTP ${response.status}: ${text}`,
          time,
        };
      }
      
      const data = await response.json();
      console.log('[DIAGNOSTIC] Products response:', data);
      
      return {
        status: 'success' as const,
        message: `Fetched ${data.products?.length || 0} products`,
        time,
      };
    } catch (error) {
      const time = Date.now() - startTime;
      console.error('[DIAGNOSTIC] Products error:', error);
      return {
        status: 'error' as const,
        message: error instanceof Error ? error.message : String(error),
        time,
      };
    }
  };

  const testAuth = async () => {
    const startTime = Date.now();
    try {
      console.log('[DIAGNOSTIC] Testing environment variables');
      console.log('[DIAGNOSTIC] Project ID:', projectId);
      console.log('[DIAGNOSTIC] Anon Key (first 20 chars):', publicAnonKey?.substring(0, 20) + '...');
      console.log('[DIAGNOSTIC] API Base:', API_BASE);
      
      return {
        status: 'success' as const,
        message: `Project ID: ${projectId}, Anon Key: ${publicAnonKey ? 'Present' : 'Missing'}`,
        time: Date.now() - startTime,
      };
    } catch (error) {
      const time = Date.now() - startTime;
      console.error('[DIAGNOSTIC] Auth check error:', error);
      return {
        status: 'error' as const,
        message: error instanceof Error ? error.message : String(error),
        time,
      };
    }
  };

  const runAllTests = async () => {
    setTesting(true);
    setResults({});

    const healthResult = await testHealthCheck();
    setResults((prev) => ({ ...prev, healthCheck: healthResult }));

    const authResult = await testAuth();
    setResults((prev) => ({ ...prev, auth: authResult }));

    const productsResult = await testProducts();
    setResults((prev) => ({ ...prev, products: productsResult }));

    setTesting(false);
  };

  const StatusIcon = ({ status }: { status?: 'success' | 'error' }) => {
    if (status === 'success') return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    if (status === 'error') return <XCircle className="h-5 w-5 text-red-500" />;
    return <AlertCircle className="h-5 w-5 text-gray-400" />;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>🔍 API 诊断工具 / API Diagnostic Tool</span>
          <Button onClick={runAllTests} disabled={testing}>
            {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {testing ? '测试中... / Testing...' : '运行测试 / Run Tests'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <StatusIcon status={results.healthCheck?.status} />
              <span className="font-medium">健康检查 / Health Check</span>
            </div>
            {results.healthCheck && (
              <span className="text-sm text-muted-foreground">
                {results.healthCheck.time}ms
              </span>
            )}
          </div>
          {results.healthCheck && (
            <div className={`p-2 rounded text-sm ${
              results.healthCheck.status === 'success' 
                ? 'bg-green-50 text-green-800' 
                : 'bg-red-50 text-red-800'
            }`}>
              {results.healthCheck.message}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <StatusIcon status={results.auth?.status} />
              <span className="font-medium">环境变量 / Environment Variables</span>
            </div>
            {results.auth && (
              <span className="text-sm text-muted-foreground">
                {results.auth.time}ms
              </span>
            )}
          </div>
          {results.auth && (
            <div className={`p-2 rounded text-sm ${
              results.auth.status === 'success' 
                ? 'bg-green-50 text-green-800' 
                : 'bg-red-50 text-red-800'
            }`}>
              {results.auth.message}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <StatusIcon status={results.products?.status} />
              <span className="font-medium">商品数据 / Products Data</span>
            </div>
            {results.products && (
              <span className="text-sm text-muted-foreground">
                {results.products.time}ms
              </span>
            )}
          </div>
          {results.products && (
            <div className={`p-2 rounded text-sm ${
              results.products.status === 'success' 
                ? 'bg-green-50 text-green-800' 
                : 'bg-red-50 text-red-800'
            }`}>
              {results.products.message}
            </div>
          )}
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">调试信息 / Debug Info</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p><strong>API Base URL:</strong> {API_BASE}</p>
            <p><strong>Project ID:</strong> {projectId}</p>
            <p><strong>Anon Key:</strong> {publicAnonKey ? '✓ Present' : '✗ Missing'}</p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-900 mb-2">常见问题 / Common Issues</h3>
          <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
            <li>如果健康检查失败，可能是 Edge Function 未部署或已停止</li>
            <li>If health check fails, the Edge Function may not be deployed or stopped</li>
            <li>检查 Supabase Dashboard 中的 Edge Functions 状态</li>
            <li>Check Edge Functions status in Supabase Dashboard</li>
            <li>确认环境变量 SUPABASE_URL 和 SUPABASE_ANON_KEY 已正确配置</li>
            <li>Verify SUPABASE_URL and SUPABASE_ANON_KEY are configured correctly</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}