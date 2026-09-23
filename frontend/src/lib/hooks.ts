"use client";

import useSWR from "swr";
import {
  getAppRecord,
  getApps,
  getChallenge,
  getChallenges,
  getConfig,
  getRefund,
  getStats,
  verifyJudgment,
} from "./contract";

const STABLE = { revalidateOnFocus: false, shouldRetryOnError: false } as const;

export const useStats = () => useSWR("stats", getStats, { ...STABLE, refreshInterval: 30_000 });
export const useConfig = () => useSWR("config", getConfig, STABLE);
export const useChallenges = () =>
  useSWR("challenges", () => getChallenges(0, 200), { ...STABLE, refreshInterval: 20_000 });
export const useApps = () => useSWR("apps", () => getApps(0, 200), { ...STABLE, refreshInterval: 30_000 });
export const useAppRecord = (key: string | null) =>
  useSWR(key ? ["app", key] : null, () => getAppRecord(key as string), STABLE);
export const useChallenge = (id: number | null, live = false) =>
  useSWR(id ? ["challenge", id] : null, () => getChallenge(id as number), {
    ...STABLE,
    refreshInterval: live ? 15_000 : 0,
  });
export const useVerification = (id: number | null, enabled: boolean) =>
  useSWR(enabled && id ? ["verify", id] : null, () => verifyJudgment(id as number), STABLE);
export const useRefund = (address: string | null) =>
  useSWR(address ? ["refund", address.toLowerCase()] : null, () => getRefund(address as string), {
    ...STABLE,
    refreshInterval: 30_000,
  });
