"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface ESHealth {
  status: string;
  number_of_nodes: number;
  active_primary_shards: number;
  active_shards: number;
}

interface ESStats {
  doc_count: number;
  store_size_in_bytes: number;
  index_name: string;
}

const OCR_SERVICE_URL = process.env.NEXT_PUBLIC_OCR_SERVICE_URL || "http://localhost:8819";

export default function ElasticsearchDashboard() {
  const [health, setHealth] = useState<ESHealth | null>(null);
  const [stats, setStats] = useState<ESStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [reindexing, setReindexing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [healthRes, statsRes] = await Promise.all([
        fetch(`${OCR_SERVICE_URL}/api/v1/admin/es/health`),
        fetch(`${OCR_SERVICE_URL}/api/v1/admin/es/stats`),
      ]);

      if (healthRes.ok) setHealth(await healthRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (error) {
      console.error("Failed to fetch ES data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleReindex = async () => {
    if (!confirm("確定要重建索引嗎？這可能需要一段時間。")) return;
    try {
      setReindexing(true);
      const res = await fetch(`${OCR_SERVICE_URL}/api/v1/admin/es/reindex`, {
        method: "POST",
      });
      if (res.ok) {
        alert("已觸發重建索引排程");
      } else {
        alert("觸發失敗");
      }
    } catch (error) {
      alert("請求失敗");
    } finally {
      setReindexing(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      setSearchLoading(true);
      const res = await fetch(`${OCR_SERVICE_URL}/api/v1/search/documents?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setSearchLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Elasticsearch 管理中心</h1>
        <Button onClick={fetchData} variant="outline" className="text-sm">
          重新整理
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Health Status Card */}
        <Card className="p-6 bg-[#1a1a1a] border-gray-800">
          <h2 className="text-lg font-semibold mb-4 text-gray-200">叢集健康狀態</h2>
          {loading ? (
            <div className="text-gray-400">載入中...</div>
          ) : health ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">狀態</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    health.status === "green"
                      ? "bg-green-900 text-green-300"
                      : health.status === "yellow"
                      ? "bg-yellow-900 text-yellow-300"
                      : "bg-red-900 text-red-300"
                  }`}
                >
                  {health.status.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">節點數量</span>
                <span className="text-white font-mono">{health.number_of_nodes}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">活躍分片</span>
                <span className="text-white font-mono">{health.active_primary_shards}</span>
              </div>
            </div>
          ) : (
            <div className="text-red-400">無法連線至 Elasticsearch</div>
          )}
        </Card>

        {/* Index Stats Card */}
        <Card className="p-6 bg-[#1a1a1a] border-gray-800">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-200">索引統計 ({stats?.index_name || "N/A"})</h2>
            <Button
              onClick={handleReindex}
              disabled={reindexing}
              variant="outline"
              className={`text-xs px-3 py-1 text-red-400 border-red-900 hover:bg-red-900/20 hover:border-red-500 ${reindexing ? "opacity-50" : ""}`}
            >
              {reindexing ? "重建中..." : "重建索引"}
            </Button>
          </div>
          {loading ? (
            <div className="text-gray-400">載入中...</div>
          ) : stats ? (
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-400">文件總數</span>
                <span className="text-white font-mono text-xl">{stats.doc_count.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">索引大小</span>
                <span className="text-white font-mono text-xl">{formatBytes(stats.store_size_in_bytes)}</span>
              </div>
            </div>
          ) : (
            <div className="text-gray-400">無數據</div>
          )}
        </Card>
      </div>

      {/* Search Test Area */}
      <Card className="p-6 bg-[#1a1a1a] border-gray-800">
        <h2 className="text-lg font-semibold mb-4 text-gray-200">中文搜尋測試</h2>
        <div className="flex gap-4 mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="輸入屋主姓名或地址 (支援模糊搜尋)..."
            className="flex-1 bg-gray-900 border border-gray-700 rounded-md px-4 py-2 text-white focus:outline-none focus:border-blue-500"
          />
          <Button onClick={handleSearch} disabled={searchLoading}>
            {searchLoading ? "搜尋中..." : "搜尋"}
          </Button>
        </div>

        <div className="space-y-4">
          {searchResults.map((result) => (
            <div key={result.document_id} className="p-4 bg-gray-900 rounded-md border border-gray-800">
              <div className="flex justify-between mb-2">
                <span 
                  className="font-bold text-blue-400"
                  dangerouslySetInnerHTML={{ 
                    __html: result.highlight?.owner_name?.[0] || result.owner_name || "未知屋主" 
                  }}
                />
                <span className="text-xs text-gray-500 font-mono">Score: {result.score.toFixed(2)}</span>
              </div>
              <div className="text-sm text-gray-300 mb-1">
                <span className="text-gray-500">地址: </span>
                <span 
                  dangerouslySetInnerHTML={{ 
                    __html: result.highlight?.property_address?.[0] || result.property_address || "無地址" 
                  }}
                />
              </div>
              {result.highlight?.ocr_text && (
                <div className="text-xs text-gray-500 mt-2 p-2 bg-black rounded">
                  <span className="block mb-1 text-gray-600">匹配內容:</span>
                  <div dangerouslySetInnerHTML={{ __html: "..." + result.highlight.ocr_text[0] + "..." }} />
                </div>
              )}
            </div>
          ))}
          {searchResults.length === 0 && !searchLoading && searchQuery && (
            <div className="text-center text-gray-500 py-8">找不到符合的結果</div>
          )}
        </div>
      </Card>
    </div>
  );
}
