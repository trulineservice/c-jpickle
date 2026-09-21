/**
 * C&J Pickleball Arena - API Concurrency & Performance Benchmark Engine
 * Author: QA Manager & Senior Developer Personas
 * 
 * High-concurrency performance benchmark testing:
 *  - GET /api/availability (Single Date Slot Calculation)
 *  - GET /api/availability (30-Day Heatmap Month Overview)
 *  - GET /api/calendar/venue-feed (iCalendar ICS Venue Stream)
 * 
 * Run with: npx tsx scripts/api-performance-test.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { NextRequest } from 'next/server';

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const COURT_1_ID = '80d4920a-34d9-47f3-8f1b-4627f5b289de';

interface BenchmarkStats {
  title: string;
  concurrency: number;
  totalRequests: number;
  successCount: number;
  errorCount: number;
  totalDurationMs: number;
  throughputRps: number;
  minMs: number;
  meanMs: number;
  p50Ms: number;
  p90Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
}

function calculateBenchmarkStats(title: string, latencies: number[], totalDurationMs: number, successCount: number, errorCount: number): BenchmarkStats {
  if (latencies.length === 0) {
    return {
      title,
      concurrency: 0,
      totalRequests: 0,
      successCount: 0,
      errorCount: 0,
      totalDurationMs: 0,
      throughputRps: 0,
      minMs: 0,
      meanMs: 0,
      p50Ms: 0,
      p90Ms: 0,
      p95Ms: 0,
      p99Ms: 0,
      maxMs: 0,
    };
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const getPercentile = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];

  return {
    title,
    concurrency: latencies.length,
    totalRequests: latencies.length,
    successCount,
    errorCount,
    totalDurationMs: Math.round(totalDurationMs),
    throughputRps: Math.round((latencies.length / (totalDurationMs / 1000)) * 10) / 10,
    minMs: Math.round(sorted[0]),
    meanMs: Math.round(sum / sorted.length),
    p50Ms: Math.round(getPercentile(50)),
    p90Ms: Math.round(getPercentile(90)),
    p95Ms: Math.round(getPercentile(95)),
    p99Ms: Math.round(getPercentile(99)),
    maxMs: Math.round(sorted[sorted.length - 1]),
  };
}

function printStats(stats: BenchmarkStats) {
  console.log(`\n================================================================================`);
  console.log(` BENCHMARK REPORT: ${stats.title}`);
  console.log(`================================================================================`);
  console.log(`| Total Requests Executed : ${stats.totalRequests}`);
  console.log(`| Concurrency Level       : ${stats.concurrency} concurrent requests at T0`);
  console.log(`| Success Rate            : ${Math.round((stats.successCount / stats.totalRequests) * 100)}% (${stats.successCount} OK, ${stats.errorCount} Errors)`);
  console.log(`| Total Execution Duration: ${stats.totalDurationMs} ms`);
  console.log(`| Throughput              : ${stats.throughputRps} requests/second`);
  console.log(`+-------------------------+-----------------------------------------------------+`);
  console.log(`| Latency Metric          | Value (ms)                                          |`);
  console.log(`+-------------------------+-----------------------------------------------------+`);
  console.log(`| Minimum Latency         | ${stats.minMs.toString().padStart(6)} ms                                     |`);
  console.log(`| Mean (Average) Latency  | ${stats.meanMs.toString().padStart(6)} ms                                     |`);
  console.log(`| 50th Percentile (p50)   | ${stats.p50Ms.toString().padStart(6)} ms                                     |`);
  console.log(`| 90th Percentile (p90)   | ${stats.p90Ms.toString().padStart(6)} ms                                     |`);
  console.log(`| 95th Percentile (p95)   | ${stats.p95Ms.toString().padStart(6)} ms                                     |`);
  console.log(`| 99th Percentile (p99)   | ${stats.p99Ms.toString().padStart(6)} ms                                     |`);
  console.log(`| Maximum Latency         | ${stats.maxMs.toString().padStart(6)} ms                                     |`);
  console.log(`+-------------------------+-----------------------------------------------------+`);
}

async function runPerformanceBenchmarks() {
  console.log('================================================================================');
  console.log('   C&J PICKLEBALL ARENA — PERFORMANCE & CONCURRENCY BENCHMARK SUITE');
  console.log('================================================================================\n');

  const { GET: availabilityGET } = await import('@/app/api/availability/route');
  const { GET: calendarGET } = await import('@/app/api/calendar/venue-feed/route');

  const CONCURRENCY = 50;

  // --------------------------------------------------------------------------
  // BENCHMARK 1: /api/availability (Single Date Query)
  // --------------------------------------------------------------------------
  console.log(`\n[Running Benchmark 1/3] GET /api/availability (Single Date Slot Calculation) with ${CONCURRENCY} concurrent requests...`);

  const latencies1: number[] = [];
  let success1 = 0;
  let error1 = 0;

  const tStart1 = performance.now();
  const promises1 = Array.from({ length: CONCURRENCY }, async (_, idx) => {
    const rStart = performance.now();
    try {
      const req = new NextRequest(
        `http://localhost:3000/api/availability?courtId=${COURT_1_ID}&date=2026-09-25&durationHours=1`
      );
      const res = await availabilityGET(req);
      const rEnd = performance.now();
      latencies1.push(rEnd - rStart);
      if (res.status === 200) {
        success1++;
      } else {
        error1++;
      }
    } catch {
      const rEnd = performance.now();
      latencies1.push(rEnd - rStart);
      error1++;
    }
  });

  await Promise.all(promises1);
  const totalDuration1 = performance.now() - tStart1;
  const stats1 = calculateBenchmarkStats('Availability API (Single Date Slots)', latencies1, totalDuration1, success1, error1);
  printStats(stats1);

  // --------------------------------------------------------------------------
  // BENCHMARK 2: /api/availability (Month Heatmap Overview)
  // --------------------------------------------------------------------------
  console.log(`\n[Running Benchmark 2/3] GET /api/availability (30-Day Heatmap Month Overview) with ${CONCURRENCY} concurrent requests...`);

  const latencies2: number[] = [];
  let success2 = 0;
  let error2 = 0;

  const tStart2 = performance.now();
  const promises2 = Array.from({ length: CONCURRENCY }, async () => {
    const rStart = performance.now();
    try {
      const req = new NextRequest(
        `http://localhost:3000/api/availability?courtId=${COURT_1_ID}&month=2026-09`
      );
      const res = await availabilityGET(req);
      const rEnd = performance.now();
      latencies2.push(rEnd - rStart);
      if (res.status === 200) {
        success2++;
      } else {
        error2++;
      }
    } catch {
      const rEnd = performance.now();
      latencies2.push(rEnd - rStart);
      error2++;
    }
  });

  await Promise.all(promises2);
  const totalDuration2 = performance.now() - tStart2;
  const stats2 = calculateBenchmarkStats('Availability API (Month Heatmap Overview)', latencies2, totalDuration2, success2, error2);
  printStats(stats2);

  // --------------------------------------------------------------------------
  // BENCHMARK 3: /api/calendar/venue-feed (iCalendar ICS Venue Stream)
  // --------------------------------------------------------------------------
  console.log(`\n[Running Benchmark 3/3] GET /api/calendar/venue-feed (iCalendar Venue Feed) with ${CONCURRENCY} concurrent requests...`);

  const latencies3: number[] = [];
  let success3 = 0;
  let error3 = 0;

  const tStart3 = performance.now();
  const promises3 = Array.from({ length: CONCURRENCY }, async () => {
    const rStart = performance.now();
    try {
      const req = new NextRequest('http://localhost:3000/api/calendar/venue-feed?venue=courts');
      const res = await calendarGET(req);
      const rEnd = performance.now();
      latencies3.push(rEnd - rStart);
      if (res.status === 200) {
        success3++;
      } else {
        error3++;
      }
    } catch {
      const rEnd = performance.now();
      latencies3.push(rEnd - rStart);
      error3++;
    }
  });

  await Promise.all(promises3);
  const totalDuration3 = performance.now() - tStart3;
  const stats3 = calculateBenchmarkStats('Calendar Feed API (iCalendar Stream)', latencies3, totalDuration3, success3, error3);
  printStats(stats3);

  console.log(`\n>>> PERFORMANCE BENCHMARK SUITE COMPLETE <<<`);
}

runPerformanceBenchmarks().catch((err) => {
  console.error('Fatal benchmark error:', err);
  process.exit(1);
});
