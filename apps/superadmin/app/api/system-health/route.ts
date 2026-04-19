import { NextRequest, NextResponse } from 'next/server';
import os from 'node:os';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';

const execAsync = promisify(exec);

type Status = 'up' | 'down';

interface ServiceStatus {
  status: Status;
  message: string;
}

interface DatabaseStatus {
  status: Status;
  latencyMs?: number;
  error?: string;
}

interface CpuStatus {
  usagePercent: number | null;
}

interface MemoryStatus {
  usedGb: number | null;
  totalGb: number | null;
}

interface DiskStatus {
  mountPoint: string | null;
  usedGb: number | null;
  totalGb: number | null;
}

interface DevServiceStatus {
  name: string;
  url: string;
  status: Status;
  error?: string;
}

export interface SystemHealthResponse {
  apiServer: ServiceStatus;
  database: DatabaseStatus;
  cpu: CpuStatus;
  memory: MemoryStatus;
  /** 根目錄 `/` 所在磁碟的使用量（向後相容既有 UI） */
  disk: DiskStatus;
  /** 其他磁碟（例如 macOS 的 `/Volumes/...` 外接 SSD） */
  extraDisks: DiskStatus[];
  /** 本地開發環境的重要 HTTP 服務（Web、Superadmin、OCR、Supabase Studio、Mailpit 等） */
  devServices: DevServiceStatus[];
}

async function checkDatabase(): Promise<DatabaseStatus> {
  try {
    const client = createAdminClient();
    const start = Date.now();

    // Use a lightweight count query against a small table to measure latency.
    const { error } = await client
      .from('iam_groups')
      .select('id', { count: 'exact', head: true })
      .limit(1);

    const latencyMs = Date.now() - start;

    if (error) {
      console.error('[SystemHealth] Database check failed:', error);
      return {
        status: 'down',
        error: typeof error === 'object' && error && 'message' in error ? String((error as { message?: string }).message) : 'Database error',
      };
    }

    return {
      status: 'up',
      latencyMs,
    };
  } catch (err) {
    console.error('[SystemHealth] Unexpected database check error:', err);
    return {
      status: 'down',
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

function getCpuStatus(): CpuStatus {
  try {
    const loadAverages = os.loadavg();
    const cores = os.cpus()?.length ?? 1;

    if (!loadAverages || loadAverages.length === 0 || cores <= 0) {
      return { usagePercent: null };
    }

    const oneMinuteLoad = loadAverages[0];
    const usage = Math.max(0, Math.min(100, (oneMinuteLoad / cores) * 100));

    return { usagePercent: Math.round(usage) };
  } catch (err) {
    console.error('[SystemHealth] Failed to read CPU status:', err);
    return { usagePercent: null };
  }
}

function getMemoryStatus(): MemoryStatus {
  try {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;

    const toGb = (bytes: number): number => Math.round((bytes / (1024 * 1024 * 1024)) * 10) / 10;

    return {
      usedGb: toGb(used),
      totalGb: toGb(total),
    };
  } catch (err) {
    console.error('[SystemHealth] Failed to read memory status:', err);
    return {
      usedGb: null,
      totalGb: null,
    };
  }
}

async function getDiskStatus(): Promise<DiskStatus> {
  if (process.platform === 'win32') {
    // Not expected in our Docker-based local dev, return nulls on Windows.
    return { mountPoint: null, usedGb: null, totalGb: null };
  }

  try {
    const { stdout } = await execAsync('df -k / | tail -1');
    const parts = stdout.trim().split(/\s+/);

    if (parts.length < 5) {
      return { mountPoint: '/', usedGb: null, totalGb: null };
    }

    const totalBlocks = Number.parseInt(parts[1] ?? '', 10);
    const usedBlocks = Number.parseInt(parts[2] ?? '', 10);

    if (!Number.isFinite(totalBlocks) || !Number.isFinite(usedBlocks) || totalBlocks <= 0) {
      return { mountPoint: '/', usedGb: null, totalGb: null };
    }

    const blockSizeBytes = 1024; // df -k reports 1K-blocks
    const totalBytes = totalBlocks * blockSizeBytes;
    const usedBytes = usedBlocks * blockSizeBytes;

    const toGb = (bytes: number): number => Math.round((bytes / (1024 * 1024 * 1024)) * 10) / 10;

    return {
      mountPoint: '/',
      usedGb: toGb(usedBytes),
      totalGb: toGb(totalBytes),
    };
  } catch (err) {
    console.error('[SystemHealth] Failed to read disk status:', err);
    return {
      mountPoint: '/',
      usedGb: null,
      totalGb: null,
    };
  }
}

async function getAllDisksStatus(): Promise<DiskStatus[]> {
  if (process.platform === 'win32') {
    return [];
  }

  try {
    const { stdout } = await execAsync('df -k');
    const lines = stdout.trim().split('\n');
    if (lines.length <= 1) {
      return [];
    }

    const toGb = (bytes: number): number => Math.round((bytes / (1024 * 1024 * 1024)) * 10) / 10;

    const disks: DiskStatus[] = [];

    for (let i = 1; i < lines.length; i += 1) {
      const line = lines[i];
      const parts = line.trim().split(/\s+/);
      if (parts.length < 6) continue;

      // macOS `df -k` columns:
      // Filesystem 1024-blocks Used Available Capacity iused ifree %iused Mounted on
      // Data rows have the mount point as the last column.
      const totalBlocks = Number.parseInt(parts[1] ?? '', 10);
      const usedBlocks = Number.parseInt(parts[2] ?? '', 10);
      const mountPoint = parts[parts.length - 1] ?? null;

      if (!mountPoint || !Number.isFinite(totalBlocks) || !Number.isFinite(usedBlocks) || totalBlocks <= 0) {
        continue;
      }

      const blockSizeBytes = 1024;
      const totalBytes = totalBlocks * blockSizeBytes;
      const usedBytes = usedBlocks * blockSizeBytes;

      disks.push({
        mountPoint,
        usedGb: toGb(usedBytes),
        totalGb: toGb(totalBytes),
      });
    }

    return disks;
  } catch (err) {
    console.error('[SystemHealth] Failed to read all disks status:', err);
    return [];
  }
}

async function checkHttpService(name: string, url: string, timeoutMs = 3000): Promise<DevServiceStatus> {
  const tryFetch = async (method: 'HEAD' | 'GET') => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method,
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return res;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  };

  try {
    let res = await tryFetch('HEAD');

    // 如果 HEAD 不被允許 (例如 Mailpit 回報 405) 或回報 404，嘗試用 GET 再測一次
    if (res.status === 405 || res.status === 404) {
      try {
        res = await tryFetch('GET');
      } catch {
        // 如果 GET 失敗，就保留原本 HEAD 的結果
      }
    }

    if (!res.ok) {
      // 特例：如果回傳 404 或 405，雖然不是 2xx，但代表服務「有在聽」，只是路徑或方法不對。
      // 對於「連線監控」來說，這通常代表服務已經起來了。
      if (res.status === 404 || res.status === 405) {
        return {
          name,
          url,
          status: 'up',
          error: `HTTP ${res.status} (路徑不匹配但已連線)`,
        };
      }
      return {
        name,
        url,
        status: 'down',
        error: `HTTP ${res.status}`,
      };
    }

    return {
      name,
      url,
      status: 'up',
    };
  } catch (err) {
    return {
      name,
      url,
      status: 'down',
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

async function getDevServicesStatus(): Promise<DevServiceStatus[]> {
  const services: { name: string; url: string }[] = [
    { name: 'Web App', url: 'http://127.0.0.1:3000' },
    { name: 'Superadmin', url: 'http://127.0.0.1:3001/superadmin/dashboard' },
    { name: 'OCR/VLM 服務', url: 'http://127.0.0.1:8000' },
    { name: 'Supabase Studio', url: 'http://127.0.0.1:54323' },
    { name: 'Mailpit (Email)', url: 'http://127.0.0.1:54324' },
  ];

  const results = await Promise.all(
    services.map((svc) => checkHttpService(svc.name, svc.url).catch((err) => ({
      name: svc.name,
      url: svc.url,
      status: 'down' as Status,
      error: err instanceof Error ? err.message : 'Unknown error',
    }))),
  );

  return results;
}

export async function GET(request: NextRequest) {
  const authResult = await requireSuperadmin({
    request,
    allowHeaderFallback: false,
    routeLabel: 'api/system-health',
  });
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  try {
    const [database, disk, allDisks, devServices] = await Promise.all([
      checkDatabase(),
      getDiskStatus(),
      getAllDisksStatus(),
      getDevServicesStatus(),
    ]);
    const cpu = getCpuStatus();
    const memory = getMemoryStatus();

    const response: SystemHealthResponse = {
      apiServer: {
        status: 'up',
        message: '正常運作',
      },
      database,
      cpu,
      memory,
      disk,
      // 只暴露實際有意義的掛載點，例如 macOS 的 /Volumes/ 外接碟，避免 tmpfs 等系統掛載
      extraDisks: allDisks.filter((d) => d.mountPoint && d.mountPoint !== '/' && d.mountPoint.startsWith('/Volumes/')),
      devServices,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error('[SystemHealth] GET /api/system-health unexpected error:', err);
    const fallback: SystemHealthResponse = {
      apiServer: {
        status: 'down',
        message: '無法取得狀態',
      },
      database: {
        status: 'down',
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      cpu: { usagePercent: null },
      memory: { usedGb: null, totalGb: null },
      disk: { mountPoint: '/', usedGb: null, totalGb: null },
      extraDisks: [],
      devServices: [],
    };

    return NextResponse.json(fallback, { status: 500 });
  }
}

