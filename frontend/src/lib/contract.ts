/**
 * Typed access to the deployed AppAudit contract.
 *
 *  1. Views return decoded calldata. Depending on the SDK path a contract dict
 *     can arrive as a `Map`; `plain()` normalises every read to plain objects so
 *     no screen has to care.
 *  2. No write ever throws on the contract side. Every refusal comes back as
 *     `{status: "REJECTED", reason}` with any value sent left on a refund
 *     ledger, so the UI reads `status` rather than catching.
 *  3. Every write is fee-estimated before it is sent; the two that post a
 *     transfer are SIMULATED, because they need a message allocation a generic
 *     estimate lacks (see `estimateFees`).
 */
import { CONSUMER_ADDRESS, CONTRACT_ADDRESS, getReadClient, getWalletClient } from "./genlayer";
import type {
  AppSummary,
  Challenge,
  ChallengeCard,
  Config,
  Preview,
  Stats,
  Verification,
  WriteResult,
} from "./types";

export type TransactionHash = `0x${string}`;

export class ContractReadError extends Error {
  constructor(
    readonly method: string,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ContractReadError";
  }
}

/** Maps to objects, bigints to strings - recursively. */
export function plain(value: unknown): unknown {
  if (value instanceof Map) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of value.entries()) out[String(k)] = plain(v);
    return out;
  }
  if (Array.isArray(value)) return value.map(plain);
  if (typeof value === "bigint") {
    return value <= BigInt(Number.MAX_SAFE_INTEGER) && value >= -BigInt(Number.MAX_SAFE_INTEGER)
      ? Number(value)
      : value.toString();
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = plain(v);
    return out;
  }
  return value;
}

const READ_TIMEOUT_MS = 30_000;

async function read<T>(method: string, args: unknown[] = [], address: string = CONTRACT_ADDRESS): Promise<T> {
  try {
    const result = await Promise.race([
      getReadClient().readContract({
        address: address as `0x${string}`,
        functionName: method,
        args: args as never,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`timed out after ${READ_TIMEOUT_MS / 1000}s`)), READ_TIMEOUT_MS),
      ),
    ]);
    return plain(result) as T;
  } catch (error) {
    throw new ContractReadError(
      method,
      `Could not read ${method} from the contract. Check your connection and that Studio Dev is up.`,
      error,
    );
  }
}

/* --- reads ------------------------------------------------------------- */

export const getStats = () => read<Stats>("get_stats");
export const getConfig = () => read<Config>("get_config");
export const getChallenge = (id: number) => read<Challenge>("get_challenge", [id]);
export const getChallenges = (offset = 0, count = 100) =>
  read<{ total: number; offset: number; items: ChallengeCard[] }>("get_challenges", [offset, count]);
export const getOpenChallenges = () => read<{ items: ChallengeCard[] }>("get_open_challenges");
export const getApps = (offset = 0, count = 100) =>
  read<{ total: number; items: AppSummary[] }>("get_apps", [offset, count]);
export const getAppRecord = (key: string) =>
  read<AppSummary & { found: boolean; challenges: ChallengeCard[] }>("get_app_record", [key]);
export const getByAdvocate = (address: string) =>
  read<{ items: ChallengeCard[] }>("get_challenges_by_advocate", [address]);
export const getByRespondent = (address: string) =>
  read<{ items: ChallengeCard[] }>("get_challenges_by_respondent", [address]);
export const previewClaim = (url: string, platform: string, claim: string) =>
  read<Preview>("preview_claim", [url, platform, claim]);
export const verifyJudgment = (id: number) => read<Verification>("verify_judgment", [id]);
export const getRefund = (address: string) => read<{ refund_wei: string }>("get_refund", [address]);

export const consumerTrust = (url: string) => {
  if (!CONSUMER_ADDRESS) return Promise.reject(new Error("No consumer contract configured."));
  return read<{ reachable: boolean; app_key: string; trust_score: number; badge: string; policy: string }>(
    "get_trust_score",
    [url],
    CONSUMER_ADDRESS,
  );
};

/* --- writes ------------------------------------------------------------ */

/**
 * Only the two writes that POST A TRANSFER are simulated: they need a message
 * allocation naming the recipient, which only a simulation produces. Every
 * other write takes the generic estimate - in particular judge() and contest(),
 * whose simulation would render the store listing yet again on Studio's shared
 * render service, which was measured failing under exactly that load.
 */
const TRANSFER_WRITES = new Set(["claim_payout", "claim_refund"]);

async function estimateFees(
  client: ReturnType<typeof getWalletClient>,
  params: { address: `0x${string}`; functionName: string; args: unknown[]; value: bigint },
) {
  try {
    const est = TRANSFER_WRITES.has(params.functionName)
      ? await client.estimateTransactionFeesForWrite({
          address: params.address,
          functionName: params.functionName,
          args: params.args as never,
          value: params.value,
        })
      : await client.estimateTransactionFees();
    if (!est?.distribution) return undefined;
    return {
      distribution: est.distribution,
      ...(est.messageAllocations ? { messageAllocations: est.messageAllocations } : {}),
      feeValue: est.feeValue,
    };
  } catch {
    // A pricing endpoint having a bad minute must not block a write; the node
    // then applies its own default.
    return undefined;
  }
}

async function write(
  account: `0x${string}`,
  functionName: string,
  args: unknown[] = [],
  value: bigint = 0n,
): Promise<TransactionHash> {
  const client = getWalletClient(account);
  const fees = await estimateFees(client, { address: CONTRACT_ADDRESS, functionName, args, value });
  return (await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args: args as never,
    value,
    ...(fees ? { fees } : {}),
  })) as TransactionHash;
}

export const fileChallenge = (
  account: `0x${string}`,
  a: { url: string; platform: string; claim: string; stakeWei: bigint },
) => write(account, "file_challenge", [a.url, a.platform, a.claim], a.stakeWei);

export const respond = (
  account: `0x${string}`,
  a: { id: number; text: string; policyUrl: string; stakeWei: bigint },
) => write(account, "respond", [a.id, a.text, a.policyUrl], a.stakeWei);

export const judge = (account: `0x${string}`, id: number) => write(account, "judge", [id]);
export const defaultJudgment = (account: `0x${string}`, id: number) =>
  write(account, "default_judgment", [id]);
export const withdrawChallenge = (account: `0x${string}`, id: number) =>
  write(account, "withdraw_challenge", [id]);
export const contest = (account: `0x${string}`, a: { id: number; evidence: string; stakeWei: bigint }) =>
  write(account, "contest", [a.id, a.evidence], a.stakeWei);
export const finalize = (account: `0x${string}`, id: number) => write(account, "finalize", [id]);
export const settleStalled = (account: `0x${string}`, id: number) => write(account, "settle_stalled", [id]);
export const claimPayout = (account: `0x${string}`, id: number) => write(account, "claim_payout", [id]);
export const claimRefund = (account: `0x${string}`) => write(account, "claim_refund", []);

/* --- waiting for a transaction ---------------------------------------- */

/**
 * Wait until the write is ACCEPTED and read what the contract returned. The
 * return value is readable at acceptance; transfers post on finalization,
 * which is later, so balances move after the receipt does.
 */
export async function waitForResult(hash: TransactionHash): Promise<WriteResult> {
  const receipt = (await getReadClient().waitForTransactionReceipt({
    hash: hash as never,
    status: "ACCEPTED" as never,
    retries: 300,
    interval: 3000,
  })) as Record<string, unknown>;
  const consensus = receipt?.consensus_data as { leader_receipt?: Array<Record<string, unknown>> } | undefined;
  const leader = consensus?.leader_receipt?.[0];
  const result = leader?.result as { payload?: unknown } | undefined;
  const payload = result?.payload;
  if (payload && typeof payload === "object") {
    const readable = (payload as { readable?: string }).readable;
    if (typeof readable === "string") {
      const parsed = parseReadable(readable);
      if (parsed) return parsed as WriteResult;
    }
  }
  if (typeof payload === "string" && payload) return { status: "REJECTED", reason: payload };
  return { status: "OK" };
}

function parseReadable(text: string): unknown {
  for (const candidate of [text, repairReadable(text)]) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      /* try the repaired form next */
    }
  }
  return null;
}

/**
 * genlayer-js 2.0.0-rc.1 omits the comma between map entries in its readable
 * rendering (`{"a":"1""b":2}`). This re-inserts separators, tracking string
 * literals so a quote inside a value is never mistaken for the next key.
 */
export function repairReadable(text: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (const ch of text) {
    if (inString) {
      out += ch;
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      const prev = out.replace(/\s+$/, "").slice(-1);
      if (prev && !"{[,:".includes(prev)) out += ",";
      out += ch;
      inString = true;
      continue;
    }
    out += ch;
  }
  return out;
}
