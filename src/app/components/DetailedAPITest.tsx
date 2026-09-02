import { useState } from 'react';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

/**
 * 详细的 API 测试组件
 * 逐步测试每个端点，显示详细的请求和响应信息
 */
export function DetailedAPITest() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [testing, setTesting] = useState(false);

  const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-c4f5ade4`;

  const addResult = (result: any) => {
    setTestResults(prev => [...prev, result]);
  };

  const runTests = async () => {
    setTestResults([]);
    setTesting(true);

    // 测试 1: 健康检查
    try {
      addResult({ test: '健康检查 Health Check', status: 'testing', endpoint: `${API_BASE}/health` });
      
      const startTime = Date.now();
      const response = await fetch(`${API_BASE}/health`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      const duration = Date.now() - startTime;
      
      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      addResult({
        test: '健康检查 Health Check',
        status: response.ok ? 'success' : 'error',
        httpStatus: response.status,
        duration: `${duration}ms`,
        response: responseData,
        endpoint: `${API_BASE}/health`
      });
    } catch (error) {
      addResult({
        test: '健康检查 Health Check',
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof TypeError ? 'Network Error (CORS or Connection)' : 'Unknown Error',
        endpoint: `${API_BASE}/health`
      });
    }

    // 测试 2: 获取所有产品
    try {
      addResult({ test: '获取所有产品 GET /products', status: 'testing', endpoint: `${API_BASE}/products` });
      
      const startTime = Date.now();
      const response = await fetch(`${API_BASE}/products`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      const duration = Date.now() - startTime;
      
      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      addResult({
        test: '获取所有产品 GET /products',
        status: response.ok ? 'success' : 'error',
        httpStatus: response.status,
        duration: `${duration}ms`,
        response: responseData,
        productCount: responseData?.products?.length,
        endpoint: `${API_BASE}/products`
      });
    } catch (error) {
      addResult({
        test: '获取所有产品 GET /products',
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof TypeError ? 'Network Error (CORS or Connection)' : 'Unknown Error',
        endpoint: `${API_BASE}/products`
      });
    }

    // 测试 3: 调试端点
    try {
      addResult({ test: '调试端点 GET /debug/products', status: 'testing', endpoint: `${API_BASE}/debug/products` });
      
      const startTime = Date.now();
      const response = await fetch(`${API_BASE}/debug/products`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      const duration = Date.now() - startTime;
      
      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      addResult({
        test: '调试端点 GET /debug/products',
        status: response.ok ? 'success' : 'error',
        httpStatus: response.status,
        duration: `${duration}ms`,
        response: responseData,
        endpoint: `${API_BASE}/debug/products`
      });
    } catch (error) {
      addResult({
        test: '调试端点 GET /debug/products',
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof TypeError ? 'Network Error (CORS or Connection)' : 'Unknown Error',
        endpoint: `${API_BASE}/debug/products`
      });
    }

    setTesting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">详细 API 测试 / Detailed API Test</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">配置信息 / Configuration</h2>
          <div className="space-y-2 font-mono text-sm">
            <div><strong>Project ID:</strong> {projectId}</div>
            <div><strong>API Base:</strong> {API_BASE}</div>
            <div><strong>Anon Key:</strong> {publicAnonKey.substring(0, 20)}...</div>
          </div>
        </div>

        <button
          onClick={runTests}
          disabled={testing}
          className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-400 mb-6"
        >
          {testing ? '测试中... Testing...' : '运行测试 Run Tests'}
        </button>

        <div className="space-y-4">
          {testResults.map((result, index) => (
            <div
              key={index}
              className={`bg-white rounded-lg shadow p-6 border-l-4 ${
                result.status === 'success'
                  ? 'border-green-500'
                  : result.status === 'error'
                  ? 'border-red-500'
                  : 'border-yellow-500'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold">{result.test}</h3>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    result.status === 'success'
                      ? 'bg-green-100 text-green-800'
                      : result.status === 'error'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {result.status === 'success' ? '✅ 成功' : result.status === 'error' ? '❌ 失败' : '⏳ 测试中'}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="font-mono text-xs text-gray-600 break-all">
                  <strong>Endpoint:</strong> {result.endpoint}
                </div>

                {result.httpStatus && (
                  <div>
                    <strong>HTTP Status:</strong> {result.httpStatus}
                  </div>
                )}

                {result.duration && (
                  <div>
                    <strong>Duration:</strong> {result.duration}
                  </div>
                )}

                {result.productCount !== undefined && (
                  <div>
                    <strong>Products Found:</strong> {result.productCount}
                  </div>
                )}

                {result.error && (
                  <div className="mt-3 p-3 bg-red-50 rounded">
                    <div className="text-red-800 font-semibold">Error:</div>
                    <div className="text-red-700 font-mono text-xs mt-1">{result.error}</div>
                    {result.errorType && (
                      <div className="text-red-600 text-xs mt-2">
                        <strong>Error Type:</strong> {result.errorType}
                      </div>
                    )}
                  </div>
                )}

                {result.response && (
                  <details className="mt-3">
                    <summary className="cursor-pointer font-semibold text-gray-700 hover:text-gray-900">
                      查看响应数据 View Response Data
                    </summary>
                    <pre className="mt-2 p-3 bg-gray-100 rounded overflow-auto text-xs">
                      {JSON.stringify(result.response, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>

        {testResults.length === 0 && !testing && (
          <div className="text-center text-gray-500 py-12">
            点击"运行测试"开始 / Click "Run Tests" to start
          </div>
        )}
      </div>
    </div>
  );
}