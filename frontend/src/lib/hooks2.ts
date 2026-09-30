"use client";

import useSWR from "swr";
import { v2 } from "./v2";

const STABLE = { revalidateOnFocus: false, shouldRetryOnError: false } as const;

export const useStats2 = () => useSWR("v2-stats", v2.stats, { ...STABLE, refreshInterval: 30_000 });
export const useConfig2 = () => useSWR("v2-config", v2.config, STABLE);
export const useCases2 = () => useSWR("v2-cases", () => v2.cases(0, 200), { ...STABLE, refreshInterval: 20_000 });
export const useCase2 = (id: number | null) =>
  useSWR(id ? ["v2-case", id] : null, () => v2.case(id as number), { ...STABLE, refreshInterval: 15_000 });
export const useApps2 = () => useSWR("v2-apps", v2.apps, { ...STABLE, refreshInterval: 30_000 });
export const useRecord2 = (url: string | null) => useSWR(url ? ["v2-record", url] : null, () => v2.record(url as string), STABLE);
export const useConsumerRecord = (url: string | null) =>
  useSWR(url ? ["v2-consumer", url] : null, () => v2.consumerRecord(url as string), STABLE);
export const useDeveloper = (url: string | null) =>
  useSWR(url ? ["v2-dev", url] : null, () => v2.developer(url as string), STABLE);
export const useTimeline = (url: string | null, offset = 0, limit = 20) =>
  useSWR(url ? ["v2-timeline", url, offset, limit] : null, () => v2.timeline(url as string, offset, limit), STABLE);
export const useByApp = (url: string | null) =>
  useSWR(url ? ["v2-byapp", url] : null, () => v2.byApp(url as string), STABLE);
export const useBalance2 = (addr: string | null) =>
  useSWR(addr ? ["v2-balance", addr.toLowerCase()] : null, () => v2.balance(addr as string), { ...STABLE, refreshInterval: 20_000 });
export const useVerify2 = (id: number | null, on: boolean) =>
  useSWR(on && id ? ["v2-verify", id] : null, () => v2.verify(id as number), STABLE);
