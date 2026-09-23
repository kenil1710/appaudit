export type Verdict = "CONTRADICTED" | "CLAIM_VERIFIED" | "INCONCLUSIVE" | "";
export type Status =
  | "FILED"
  | "RESPONDED"
  | "SETTLED"
  | "FINALIZED"
  | "DEFAULTED"
  | "WITHDRAWN"
  | "STALLED";
export type Platform = "google_play" | "app_store";

/** The compact row every list view returns. */
export type ChallengeCard = {
  challenge_id: number;
  advocate: string;
  platform: Platform;
  app_key: string;
  app_label: string;
  fetch_url: string;
  claim: string;
  status: Status;
  phase: string;
  outcome: Verdict;
  evidence_strength: number;
  filed_at: number;
  respond_by: number;
  advocate_stake_wei: string;
  respondent_stake_wei: string;
  respondent: string;
  judged_at: number;
  contest_result: string;
  winner: string;
  matched: string[];
  content_hash: string;
};

/** The full record `get_challenge` returns. */
export type Challenge = ChallengeCard & {
  found: boolean;
  claim_reading: { negative: boolean; axis: string; topics: string[]; signature: string };
  response: string;
  policy_url: string;
  responded_at: number;
  judge_attempts: number;
  page_state: string;
  privacy_text: string;
  section_hash: string;
  case: string;
  allowed: string[];
  strength_ranges: string;
  findings: {
    categories: string[];
    tracking: string[];
    sharing: string[];
    collection: string[];
    categories_bucket: number;
    tracking_bucket: number;
    sharing_bucket: number;
    collection_bucket: number;
  };
  model_called: boolean;
  facts_hash: string;
  reason: string;
  contest: {
    by: string;
    evidence: string;
    stake_wei: string;
    at: number;
    result: string;
    original_outcome: string;
    outcome: string;
    strength: number;
    content_hash: string;
    section_hash: string;
    window_ends: number;
    stake_required_wei: string;
    loser: string;
  };
  settlement: {
    owed_advocate_wei: string;
    owed_respondent_wei: string;
    owed_protocol_wei: string;
    paid_advocate: boolean;
    paid_respondent: boolean;
    paid_protocol: boolean;
    locked_wei: string;
    winner_bps: number;
    protocol_bps: number;
    fee_recipient: string;
  };
  windows: { response_s: number; contest_s: number; stall_s: number; min_stake_wei: string };
  closed_at: number;
};

export type AppSummary = {
  app_key: string;
  label: string;
  platform: Platform | "";
  counts: {
    total: number;
    contradicted: number;
    verified: number;
    inconclusive: number;
    pending_verdicts: number;
    defaulted: number;
    withdrawn: number;
    stalled: number;
    open: number;
  };
  judged: number;
  badge: "CLEAN" | "FLAGGED" | "UNAUDITED";
  contradicted: boolean;
  last_judged_at: number;
};

export type Stats = {
  challenges: number;
  judgments: number;
  judge_attempts: number;
  unsettled_attempts: number;
  contests: number;
  flips: number;
  refusals: number;
  apps: number;
  status_counts: Record<string, number>;
  verdict_counts: Record<string, number>;
  total_staked_wei: string;
  total_protocol_wei: string;
  total_paid_wei: string;
  balance_wei: string;
  locked_wei: string;
  refundable_wei: string;
  ledger_balanced: boolean;
  chain_balance_wei: string;
  undelivered_wei: string;
  paused: boolean;
  owner: string;
  rubric_version: string;
};

export type Config = {
  rubric_version: string;
  owner: string;
  fee_recipient: string;
  paused: boolean;
  min_stake_wei: string;
  contest_stake_wei: string;
  response_window_s: number;
  contest_window_s: number;
  stall_ttl_s: number;
  file_cooldown_s: number;
  winner_bps: number;
  protocol_bps: number;
  loser_keep_bps: number;
  claim_chars: [number, number];
  response_chars: [number, number];
  evidence_chars: [number, number];
  bracket: Record<string, string>;
  topics: { key: string; label: string; claim_words: string[]; page_words: string[] }[];
};

export type Preview = {
  ok: boolean;
  problems: string[];
  platform: Platform | "";
  app_key: string;
  label: string;
  fetch_url: string;
  claim_reading: { negative: boolean; axis: string; topics: string[]; topic_labels: string[] };
  min_stake_wei: string;
  duplicate_of: number;
};

export type Verification = {
  found: boolean;
  judged: boolean;
  verified?: boolean;
  note?: string;
  checks?: { field: string; stored: string; recomputed: string; match: boolean }[];
};

export type WriteResult = { status: "OK" | "REJECTED"; reason?: string; [k: string]: unknown };
