/**
 * Typed access to AppAudit v2 (demo instance) and AppTrustConsumerV2.
 *
 * Same rules as lib/contract.ts: views are normalised with `plain()`, writes
 * never revert (a refusal is `{status: "REJECTED"}`), and only the two writes
 * that POST A TRANSFER (withdraw, withdraw_fees) are fee-simulated. Every
 * write that runs a consensus round (filings, judge, contest, snapshot,
 * identity) takes the generic estimate: simulating it would make the render
 * service fetch every page one extra time.
 */
import { getReadClient, getWalletClient } from "./genlayer";
import { ContractReadError, plain, type TransactionHash } from "./contract";

const isAddr = (v: string | undefined): v is string => Boolean(v && /^0x[0-9a-fA-F]{40}$/.test(v));

/** Deployed from commit 8f9db85 (ADDRESSES.md). Overridable per environment. */
export const V2_ADDRESS = (isAddr(process.env.NEXT_PUBLIC_V2_ADDRESS)
  ? process.env.NEXT_PUBLIC_V2_ADDRESS
  : "0xC7502668d39e8BEA9795F1cEBd705cc267420793") as `0x${string}`;
export const V2_CANONICAL_ADDRESS = isAddr(process.env.NEXT_PUBLIC_V2_CANONICAL_ADDRESS)
  ? process.env.NEXT_PUBLIC_V2_CANONICAL_ADDRESS
  : "0x088beDF9fB702C94f140A8c6d4e619d8B53da102";
export const V2_CONSUMER_ADDRESS = isAddr(process.env.NEXT_PUBLIC_V2_CONSUMER_ADDRESS)
  ? process.env.NEXT_PUBLIC_V2_CONSUMER_ADDRESS
  : "0xc9a0928A910d59F23AD612fAABaEd041FE5c0294";

export type Kind = "LABEL" | "CROSS_STORE" | "POLICY_LABEL";
export type Outcome = "CONTRADICTED" | "CLAIM_VERIFIED" | "INCONCLUSIVE" | "CORRECTED" | "";

export type CaseCard = {
  challenge_id: number;
  kind: Kind;
  advocate: string;
  platform: string;
  app_key: string;
  app_label: string;
  app_key2: string;
  app_label2: string;
  topic: string;
  axis: string;
  claim: string;
  status: string;
  phase: string;
  outcome: Outcome;
  filing_result: string;
  judgment_result: string;
  filed_at: number;
  respond_by: number;
  judged_at: number;
  advocate_stake_wei: string;
  respondent_stake_wei: string;
  respondent: string;
  respondent_verified: boolean;
  respondent_label: string;
  app_has_verified_developer: boolean;
  winner: string;
  content_hash: string;
  axis_note?: string;
};

export type Evidence = {
  at: number;
  page_state: string;
  label: string;
  hash: string;
  status: string;
  page_state2: string;
  label2: string;
  hash2: string;
  status2: string;
  result: string;
  policy_url?: string;
  policy_state: string;
  policy_enum: string;
  quote_hash: string;
  quote_len: number;
  policy_hash?: string;
  confirmed?: boolean;
  confirmed_listings?: boolean[];
  confirmed_at?: number;
  binding?: {
    why: string;
    play: { title: string; developer: string; website: string };
    app_store: { title: string; developer: string; website: string };
  };
  filing_outcome?: string;
  evidence_strength?: number;
  case?: string;
  allowed?: string[];
  matched?: string[];
  model_called?: boolean;
};

export type Case = CaseCard & {
  response: string;
  policy_url: string;
  responded_at: number;
  judge_attempts: number;
  reason: string;
  verified_developers: string[];
  fetch_url: string;
  fetch_url2: string;
  filing: Evidence;
  judgment: Evidence;
  claim_reading: { negative: boolean; topics: string[] };
  contest: {
    by: string; evidence: string; stake_wei: string; at: number; result: string;
    original_outcome: string; outcome: string; window_ends: number; stake_required_wei: string; loser: string;
  };
  settlement: {
    owed_advocate_wei: string; owed_respondent_wei: string; owed_protocol_wei: string;
    credited_to_balances: boolean; locked_wei: string; winner_bps: number; protocol_bps: number; fee_recipient: string;
  };
  windows: { response_s: number; contest_s: number; stall_s: number; min_stake_wei: string };
  closed_at: number;
  found: boolean;
};

export type AppRecord = {
  found: boolean;
  app_key: string;
  label: string;
  platform: string;
  counts: Record<string, number>;
  contradicted: number;
  verified: number;
  corrected: number;
  inconclusive: number;
  verified_developer: boolean;
  developer_wallet: string;
  last_snapshot_at: number;
  snapshots: number;
  last_judged_at: number;
  error?: string;
};

export type DevRecord = {
  status: string; wallet: string; website: string; host: string; file_url: string;
  file_hash: string; at: number; by: string; note: string;
};

export type Developer = {
  found: boolean; app_key: string; verified: boolean; current: DevRecord | null;
  history: DevRecord[]; next_change_at: number; file_content: string; error?: string;
};

export type Diff = Record<"collected" | "shared" | "none", { added: string[]; removed: string[] }>;

export type SnapshotRow = {
  snapshot_id: number; at: number; source: string; case_id: number; by: string;
  page_state: string; hash: string; label: string;
  declared: { collected: string[]; shared: string[]; none: string[] };
  changed: boolean; diff: Diff | null;
};

export type Timeline = {
  found: boolean; app_key: string; label: string; count: number; total: number; offset: number;
  limit: number; changes: number; last_snapshot_at: number; items: SnapshotRow[]; error?: string;
};

export type Stats2 = {
  cases: number; judgments: number; snapshots: number; verifications: number; refusals: number; apps: number;
  status_counts: Record<string, number>; verdict_counts: Record<string, number>;
  balance_wei: string; locked_wei: string; claimable_wei: string; protocol_wei: string;
  ledger_balanced: boolean; identity: string; chain_balance_wei: string; undelivered_wei: string;
  total_withdrawn_wei: string; paused: boolean;
};

export type Topic = { key: string; label: string; claim_words: string[]; page_words: string[] };
export type Config2 = {
  rubric_version: string; min_stake_wei: string; contest_stake_wei: string; snapshot_fee_wei: string;
  snapshot_cap_per_day: number; response_window_s: number; contest_window_s: number; stall_ttl_s: number;
  reverify_cooldown_s: number; max_policy_chars: number; topics: Topic[]; well_known_path: string;
};

export type Verification2 = {
  found: boolean; kind: string; verified: boolean;
  checks: { field: string; stored: string; recomputed: string; match: boolean }[];
};

export type ConsumerRecord = {
  reachable: boolean; found: boolean; app_key: string; contradicted: number; verified: number;
  corrected: number; inconclusive: number; verified_developer: boolean; developer_wallet: string;
  last_snapshot_at: number; snapshots: number; trust_score: number; error?: string;
};

const READ_TIMEOUT_MS = 30_000;

async function read<T>(method: string, args: unknown[] = [], address: string = V2_ADDRESS): Promise<T> {
  try {
    const result = await Promise.race([
      getReadClient().readContract({ address: address as `0x${string}`, functionName: method, args: args as never }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timed out")), READ_TIMEOUT_MS)),
    ]);
    return plain(result) as T;
  } catch (error) {
    throw new ContractReadError(method, `Could not read ${method} from AppAudit v2. Check that Studio Dev is up.`, error);
  }
}

export const v2 = {
  stats: () => read<Stats2>("get_stats"),
  config: () => read<Config2>("get_config"),
  cases: (offset = 0, count = 100) => read<{ total: number; items: CaseCard[] }>("get_cases", [offset, count]),
  case: (id: number) => read<Case>("get_case", [id]),
  byApp: (url: string) => read<{ app_key: string; items: CaseCard[]; error?: string }>("get_cases_by_app", [url]),
  apps: () => read<{ total: number; items: AppRecord[] }>("get_apps", [0, 200]),
  record: (url: string) => read<AppRecord>("app_record", [url]),
  developer: (url: string) => read<Developer>("get_developer", [url]),
  timeline: (url: string, offset = 0, limit = 20) => read<Timeline>("timeline", [url, offset, limit]),
  balance: (addr: string) => read<{ claimable_wei: string; fees_wei: string }>("get_balance", [addr]),
  verify: (id: number) => read<Verification2>("verify_case", [id]),
  preview: (kind: string, a: string, b: string, t: string, axis: string, advocate = "") =>
    read<{ ok: boolean; problems: string[]; app_key?: string; app_key2?: string; fetch_url?: string; fetch_url2?: string; identity_url?: string; identity_url2?: string; duplicate_of: number }>(
      "preview", [kind, a, b, t, axis, advocate]),
  consumerRecord: (url: string) => read<ConsumerRecord>("app_record", [url], V2_CONSUMER_ADDRESS),
};

const TRANSFER_WRITES = new Set(["withdraw", "withdraw_fees"]);

async function write(account: `0x${string}`, functionName: string, args: unknown[] = [], value = 0n): Promise<TransactionHash> {
  const client = getWalletClient(account);
  let fees: Record<string, unknown> | undefined;
  try {
    const est = TRANSFER_WRITES.has(functionName)
      ? await client.estimateTransactionFeesForWrite({ address: V2_ADDRESS, functionName, args: args as never, value })
      : await client.estimateTransactionFees();
    if (est?.distribution) {
      fees = { distribution: est.distribution, ...(est.messageAllocations ? { messageAllocations: est.messageAllocations } : {}), feeValue: est.feeValue };
    }
  } catch {
    fees = undefined;
  }
  return (await client.writeContract({
    address: V2_ADDRESS, functionName, args: args as never, value, ...(fees ? { fees: fees as never } : {}),
  })) as TransactionHash;
}

export const tx2 = {
  fileCross: (a: `0x${string}`, p: { play: string; apple: string; topic: string; axis: string; stake: bigint }) =>
    write(a, "file_cross_store", [p.play, p.apple, p.topic, p.axis], p.stake),
  filePolicy: (a: `0x${string}`, p: { url: string; topic: string; axis: string; stake: bigint }) =>
    write(a, "file_policy", [p.url, "", p.topic, p.axis], p.stake),
  fileLabel: (a: `0x${string}`, p: { url: string; claim: string; stake: bigint }) =>
    write(a, "file_challenge", [p.url, "", p.claim], p.stake),
  respond: (a: `0x${string}`, p: { id: number; text: string; stake: bigint }) =>
    write(a, "respond", [p.id, p.text, ""], p.stake),
  judge: (a: `0x${string}`, id: number) => write(a, "judge", [id]),
  confirmFiling: (a: `0x${string}`, id: number) => write(a, "confirm_filing", [id]),
  defaultJudgment: (a: `0x${string}`, id: number) => write(a, "default_judgment", [id]),
  withdrawCase: (a: `0x${string}`, id: number) => write(a, "withdraw_challenge", [id]),
  contest: (a: `0x${string}`, p: { id: number; evidence: string; stake: bigint }) =>
    write(a, "contest", [p.id, p.evidence], p.stake),
  finalize: (a: `0x${string}`, id: number) => write(a, "finalize", [id]),
  settleStalled: (a: `0x${string}`, id: number) => write(a, "settle_stalled", [id]),
  withdraw: (a: `0x${string}`) => write(a, "withdraw", []),
  withdrawFees: (a: `0x${string}`) => write(a, "withdraw_fees", []),
  snapshot: (a: `0x${string}`, url: string, fee: bigint) => write(a, "snapshot", [url], fee),
  register: (a: `0x${string}`, url: string) => write(a, "register_developer", [url]),
  recheck: (a: `0x${string}`, url: string) => write(a, "recheck_developer", [url]),
};

/* --- presentation helpers -------------------------------------------------- */

export const OUTCOME_LABEL: Record<string, string> = {
  CONTRADICTED: "Contradicted",
  CLAIM_VERIFIED: "Consistent",
  INCONCLUSIVE: "Inconclusive",
  CORRECTED: "Corrected",
};

export const OUTCOME_COLOR: Record<string, string> = {
  CONTRADICTED: "var(--hot)",
  CLAIM_VERIFIED: "var(--green)",
  INCONCLUSIVE: "var(--grey)",
  CORRECTED: "var(--amber)",
};

export const KIND_LABEL: Record<string, string> = {
  LABEL: "Claim vs label",
  CROSS_STORE: "Cross-store",
  POLICY_LABEL: "Policy vs label",
};

export const LABEL_STATE: Record<string, { text: string; color: string }> = {
  DECLARED: { text: "declared", color: "var(--cyan)" },
  DECLARED_NONE: { text: "declares none", color: "var(--lavender)" },
  SILENT: { text: "silent", color: "var(--grey)" },
  UNREADABLE: { text: "unreadable", color: "var(--grey)" },
};

/** Canonical label lines ("shared | Location | Approximate location") into
 *  groups for display. The canonical form is the contract's, not ours. */
export function parseLabel(text: string): { group: string; category: string; types: string }[] {
  return (text || "").split("\n").filter(Boolean).map((line) => {
    const [group, category = "", types = ""] = line.split(" | ");
    return { group, category, types };
  });
}

/** Does a canonical row mention the topic, by the contract's own page words? */
export function rowHits(row: { category: string; types: string }, topic: Topic | undefined): boolean {
  if (!topic) return false;
  const low = `${row.category}: ${row.types}`.toLowerCase();
  return topic.page_words.some((w) => low.includes(w));
}

export function appUrlFromKey(key: string): string {
  if (key.startsWith("google_play:")) return `https://play.google.com/store/apps/details?id=${key.slice(12)}`;
  if (key.startsWith("app_store:")) return `https://apps.apple.com/us/app/id${key.slice(10)}`;
  return key;
}
