import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'node:fs';
import { DEFAULT_MEMORY_PATH, DEFAULT_DASHBOARD_PATH } from '@/lib/constants';
import type { ApiResponse } from '@/lib/types';

interface HealthData {
  status: 'healthy' | 'unhealthy';
  checks: {
    memory_dir: boolean;
    dashboard_dir: boolean;
  };
}

export async function GET(_request: NextRequest): Promise<NextResponse<ApiResponse<HealthData>>> {
  try {
    const checks = {
      memory_dir: false,
      dashboard_dir: false,
    };

    try {
      checks.memory_dir = existsSync(DEFAULT_MEMORY_PATH);
    } catch {
      checks.memory_dir = false;
    }

    try {
      checks.dashboard_dir = existsSync(DEFAULT_DASHBOARD_PATH);
    } catch {
      checks.dashboard_dir = false;
    }

    const allHealthy = checks.memory_dir && checks.dashboard_dir;

    const healthData: HealthData = {
      status: allHealthy ? 'healthy' : 'unhealthy',
      checks,
    };

    const response: ApiResponse<HealthData> = {
      success: allHealthy,
      data: allHealthy ? healthData : null,
      error: allHealthy ? null : 'System health checks failed',
      timestamp: new Date().toISOString(),
      meta: {},
    };

    const statusCode = allHealthy ? 200 : 503;

    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    const response: ApiResponse<HealthData> = {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}
