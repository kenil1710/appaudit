# AppAudit

**An app's privacy declarations, tested against each other — and against the claims made about them.**

| | |
|---|---|
| **Network** | GenLayer Studio Dev (chain `61997`), [explorer](https://explorer-studio-dev.genlayer.com/) |
| **AppAudit v2 — demo** (the app and the seeds; 10-minute windows) | `0xC7502668d39e8BEA9795F1cEBd705cc267420793` |
| **AppAudit v2 — canonical** (48h / 24h / 48h, 300s cooldown) | `0x088beDF9fB702C94f140A8c6d4e619d8B53da102` |
| **AppTrustConsumerV2** (custody false, zero payable methods) | `0xc9a0928A910d59F23AD612fAABaEd041FE5c0294` |
| **AppAudit v1 — demo / canonical** | `0x060cFC326B19F3DD4B839dEa75924Fd2935be61C` / `0xbbdf68A0616e44Fb57d64386b19fa80b055d6257` |
| **AppTrustConsumer v1** | `0x5b6F3FBCD4f4aFAA763Fa13Bd9eD39AfD2C5773F` |
| **Live app** | https://appaudit-genlayer.vercel.app |
| **Offline tests** | v2: `python3 test/test_v2.py` · v1: `python3 test/test_logic.py` (492) — stdlib only |
| **Audits** | `python3 tools/audit_v2.py` (39) · `python3 tools/audit.py` (33) · `node tools/verify_source.mjs` |

Full addresses, deploy transactions, commit and sha256: [`ADDRESSES.md`](ADDRESSES.md).

## v2

### What's new

1. **Cross-store mismatch.** One data type, both store listings of the same
   app. Validators render both labels and reduce each to v1's canonical form;
   **code** compares: one store declares the type collected/shared, the other
   states in terms that nothing is → CONTRADICTED; one store silent →
   INCONCLUSIVE (silence is never evidence). Both listings' HTML is read at
   filing and the case is **refused unless they are the same app** (same first
   title word, and the same normalised developer name or website domain).
2. **Policy vs label.** The privacy policy **linked from the listing** — found
   by validators in its HTML at filing, never supplied — is read by the model
   into a fixed enum per data type (SHARED / COLLECTED / NOT_MENTIONED) plus one
   sentence; **code** checks the sentence appears verbatim in the fetched policy
   (else NOT_MENTIONED) and compares with the label. Only the enum and a hash of
   the sentence are stored. Oversized or truncated policies are refused at
   filing and INCONCLUSIVE at judgment, never VERIFIED. The policy is untrusted
   data: delimited, with marker lines defanged; an obeyed injection can at worst
   make a reading INCONCLUSIVE.
3. **Verified developer.** `register_developer(app)`: validators fetch
   `https://<website from the listing>/.well-known/appaudit.txt`, which must
   name the caller's wallet. Then only that wallet may respond or contest for
   that listing; apps without one keep v1 behaviour and every case shows
   "respondent unverified". Re-verification after a cooldown, history kept,
   permissionless `recheck_developer` revokes if the website or file changed.
4. **Evidence frozen at filing + label timeline.** Every filing is a consensus
   round that stores the evidence's hash and a compact canonical copy.
   Contradiction at filing and at judgment → CONTRADICTED; at filing, fixed and
   edited by judgment → **CORRECTED** (the advocate wins; both snapshots and
   dates are on the record). `snapshot(app)` (fee, no stake, 4 per listing per
   day) and `timeline(app)` with diffs computed by code.
5. **Pull payouts.** Every v2 payout, refund and fee is a claimable balance;
   `withdraw()` zeroes it, then sends. `balance == open stakes + claimable +
   protocol fees` is published and checked after every offline transaction.
6. **`AppTrustConsumerV2.app_record(app)`**: final CONTRADICTED / VERIFIED /
   CORRECTED / INCONCLUSIVE counts, the verified-developer flag, the last
   snapshot time. Still no value, no payable methods.

v1's claim type is kept inside v2 unchanged (`file_challenge`), now with
frozen evidence and CORRECTED.

### What the model never decides

Which pages are fetched · whether two listings are the same app · who the
developer is · whether a label declares, denies or is silent about a type ·
whether a quote is real · any cross-store or policy verdict · CORRECTED · the
timeline · any amount, balance or transfer. The model does two things: v1's
claim reading inside v1's evidence bracket, and filling the policy enum.

### Seeded on chain (real apps only)

<!-- SEEDS -->

Everything above is read back from the chain into [`docs/SEEDS.md`](docs/SEEDS.md)
(explorer links, model agreement across two runs, snapshots, withdrawals,
consumer reads). Measurements that shaped v2: [`docs/PROBE_V2.md`](docs/PROBE_V2.md)
(24 popular apps dry-run on both stores). Threats and their tests:
[`docs/THREAT_MODEL_V2.md`](docs/THREAT_MODEL_V2.md). Own audit:
[`docs/AUDIT_V2.md`](docs/AUDIT_V2.md).

### Known limits

- **Self-declared evidence.** v2 compares the developer's declarations with
  each other; a developer consistent everywhere is not caught.
- **Tracking stands in for sharing on the App Store**, which publishes no
  sharing declaration. Both real cross-store contradictions rest on it; each
  case says so.
- **The identity success path runs only in tests.** No real app's website
  publishes `/.well-known/appaudit.txt`; live, only the refusals run (file
  served but wallet absent: Temu, Pinterest; no file: Snapchat).
- **CORRECTED is proven offline only.** It needs a real label to change inside
  a 10-minute window; none did during the seeds.
- **Model disagreement stalls, it never decides.** Validators must agree on the
  enum exactly; if they do not, nothing is stored and `settle_stalled` returns
  both stakes after the window.
- **The policy quote is shown by locating its hash in the live policy.** For
  script-rendered policies (CapCut's US section) the site cannot locate it and
  shows the hash only.
- **Studio Dev does not execute value transfers** (measured for both stages,
  PROBE_V2 §5): `withdraw()` books the payment and zeroes the balance;
  `get_stats.undelivered_wei` reports what the network has not delivered.
- **Studio Dev can finalize a round with no state applied** when validators
  time out; scripts and the app read state back rather than trusting receipts.

---

## v1

**Mobile app privacy claims, tested against the app's own store listing.**

Apps claim privacy practices. Their store listings — the data-safety forms the
developer filled in themselves — often say otherwise. **A privacy advocate**
challenges a claim like *"This app does not collect location data"* and stakes
GEN on the listing contradicting it. **An app developer** defends the claim by
staking against them. GenLayer validators each render the listing
independently and decide whether it contradicts the claim. Whoever was right
takes the pot, by arithmetic.

| | |
|---|---|
| **Network** | GenLayer Studio Dev (chain `61997`) |
| **AppAudit — demo instance** (the app reads this; windows in minutes) | `0x060cFC326B19F3DD4B839dEa75924Fd2935be61C` |
| **AppAudit — canonical instance** (the brief: 48h / 24h / 48h, 300s cooldown) | `0xbbdf68A0616e44Fb57d64386b19fa80b055d6257` |
| **AppTrustConsumer** (custody false, zero payable methods) | `0x5b6F3FBCD4f4aFAA763Fa13Bd9eD39AfD2C5773F` |
| **Live app** | https://appaudit-genlayer.vercel.app |
| **Offline tests** | 492, stdlib only — `python3 test/test_logic.py` |
| **Rejection audit** | 33 mechanical checks — `python3 tools/audit.py` |
| **Evidence** | [`docs/EVIDENCE.md`](docs/EVIDENCE.md), generated by reading the chain |

### Seeded on chain — every path of the state machine

Driven through real consensus rounds by `test/seed.mjs`, then read back by
`test/collect.mjs` into [`docs/EVIDENCE.md`](docs/EVIDENCE.md):

| # | app | claim | outcome | settlement (advocate / developer / protocol GEN) |
|---|---|---|---|---|
| 1 | WhatsApp · Google Play | "does not collect location data" | **CONTRADICTED** — listing declares *Location: Approximate location* | 0.9 / 0.05 / 0.05 |
| 2 | Instagram · App Store | "collects user content" | **CLAIM_VERIFIED** — *User Content* under Data Linked to You | 0.05 / 0.9 / 0.05 |
| 3 | Spotify · Google Play | "shares browsing history with advertisers" | **INCONCLUSIVE** — never mentioned; pinned, no model call | 0.5 / 0.5 / 0 |
| 4 | TikTok · Google Play | "does not share photos or videos" | **CONTRADICTED**, developer contested, **held** — contest stake to the advocate | 1.2 / 0.05 / 0.05 |
| 5 | Facebook · Google Play | "does not collect your contacts" | **DEFAULTED** — no response | 0.5 / — / 0 |
| 6 | Telegram · Google Play | "does not share location…" | **WITHDRAWN** before response | 0.5 / — / 0 |
| 7 | Snapchat · Google Play | "does not collect photos or videos" | **STALLED**, settled **while paused** | 0.5 / 0.5 / 0 |

Also refused live: a duplicate claim, a non-store URL, the advocate responding
to themselves, a contest that copied the response, a contest by the winner, a
filing while paused, and a payout before finalization. Every judged challenge's
`verify_judgment` recomputes; after all payouts the contract's own books read
**balance 0 · locked 0 · refundable 0**.

---

## The line

**GenLayer does exactly one thing:** it reads a privacy claim written in
English against the privacy declarations the app's own store listing
publishes, and decides whether the listing **contradicts** it, **supports** it,
or **does not address** it. That is semantic interpretation — "approximate
location" against "does not know where you are", a defence that reframes the
claim, new evidence on contest — and it has no closed form.

**Deterministic code does everything else:**

- reduces the URL to an app key and **rebuilds** the page validators render
  (Google Play's full `/datasafety` page; the App Store's US App Privacy label);
- extracts the privacy section and **canonicalises** it (Google Play shuffles
  its entries on every render — measured, [docs/PROBE.md §3](docs/PROBE.md));
- lists every declared category, tracking, sharing and collection entry;
- measures whether the claimed data type appears on the claimed axis, and from
  that fixes the **set of verdicts the model is allowed to choose from**;
- hashes what was read (the content hash);
- splits the stakes 80/10/10, refunds, handles contests, and pays.

**Every piece of money math is deterministic.** No model output reaches a
transfer; the model picks a verdict from a set the evidence already permits,
and every validator must pick the same one.

---

## How a challenge runs

```
FILED ──respond──▶ RESPONDED ──judge──▶ SETTLED ──(contest window)──▶ FINALIZED
  │                    │                   └──contest──▶ FINALIZED (held / flipped)
  ├─withdraw──▶ WITHDRAWN                  INCONCLUSIVE ──▶ FINALIZED at once
  └─48h, no response──▶ DEFAULTED
                       └─48h, no agreed judgment──▶ STALLED (both refunded)
```

1. **A privacy advocate files** — `file_challenge(app_url, platform, claim)`,
   stake ≥ 0.5 GEN. The claim must be 20–500 characters and name a data type a
   listing can declare (location, contacts, photos, browsing history…). One
   filing per wallet per 300s; the same claim about the same app cannot be live
   twice. `preview_claim` shows the page validators will render and how the
   claim is read, before anything is staked.
2. **An app developer responds** within 48h — `respond(id, text, policy_url)`,
   counter-stake ≥ 0.5 GEN. Anyone but the advocate may respond. Until then the
   advocate may `withdraw_challenge` for a full refund.
3. **Anyone judges** — `judge(id)`. Validators render the listing, extract the
   privacy section, and agree on the findings vector.
4. **Settlement** — see below. The loser may `contest` once within 24h.
5. **Anyone finalizes and pays** — `finalize(id)` after the window,
   `claim_payout(id)` sends each share to the address it belongs to.

### The bracket — computed before a model is asked

| evidence case | allowed verdicts | model called |
|---|---|---|
| **Direct** — the claimed type is declared on the claimed axis | Contradicted (for a denial) / Verified (for an assertion), or Inconclusive | yes |
| **Explicit none** — "No data collected / shared" | the mirror verdict, or Inconclusive | yes |
| **Elsewhere** — declared, but on a different axis | Inconclusive only | no |
| **Absent** — the listing never mentions it | Inconclusive only | no |
| **Unreadable** — no section, 404, "No Details Provided" | Inconclusive only | no |

Silence in a self-declared listing is not evidence, so no leader and no model
can ever call a silent listing "contradicted".

### What validators compare

Not the verdict alone. The compared vector is: platform, page state, **hash of
the canonical privacy section each node read**, evidence case, allowed-verdict
set, strength ranges, matched data types, the categories / tracking / sharing /
collection buckets, facts hash, content hash and verdict — all **exactly** —
and evidence strength within one bucket (every range is two wide, so agreement
on the verdict implies agreement on strength). A leader's payload is first
re-derived from the four values it chose (page state, privacy text, verdict,
strength); any field that does not match is refused before a validator renders
anything. After consensus, **every stored field is recomputed** from the
agreed values; nothing the leader sent is stored as sent.

---

## Settlement — every wei by integer arithmetic

Stakes, the split and the fee recipient are **snapshotted onto the challenge
when it is filed**.

| outcome | advocate | developer | protocol |
|---|---|---|---|
| **CONTRADICTED** | own stake + 80% of developer's | keeps 10% of own | 10% of developer's |
| **CLAIM_VERIFIED** | keeps 10% of own | own stake + 80% of advocate's | 10% of advocate's |
| **INCONCLUSIVE** | full stake back | full stake back | 0 |
| **DEFAULTED** (no response) | full stake back | — | 0 |
| **WITHDRAWN** | full stake back | — | 0 |
| **STALLED** | full stake back | full stake back | 0 |

With 0.5 GEN each, CONTRADICTED pays **0.9 / 0.05 / 0.05**. Shares floor and
the dust stays with the loser; the three always sum to exactly what the
challenge holds.

**Contest (recovery path):** the losing party stakes exactly 0.3 GEN with new
evidence. Sentences already in the claim, response or policy URL are removed
first, and at least 20 new characters must remain — a copy of the response is
refused and refunded. Validators re-render the listing and re-judge with the
evidence in the prompt; the evidence cannot widen the bracket. **Flipped** →
settlement recomputed, contest stake returned. **Held** → contest stake to the
winner. **Unheard** (no agreed reading, or the page is unreadable) → nothing
changes, the stake returns, and the contest may be filed again. An unreadable
page can never flip a verdict.

**Other recovery paths:** `default_judgment` after 48h with no response;
`settle_stalled` refunds both sides if no judgment is agreed within 48h of the
response — **and works while paused**; `claim_refund` returns any value sent
with a refused call.

---

## Safety properties, and where they are enforced

| property | how |
|---|---|
| Consensus binds every stored value | `_agrees` compares the full vector; `judge` stores only `_derive(...)` output |
| Leader cannot forge | `_coherent` re-derives from the leader's four chosen values; 24 forgery tests |
| Refund-on-reject, **zero `raise`** | `_bank` books value to the sender first; `_refuse` returns `REJECTED` |
| No counter before a refusal | AST check in tests and audit |
| Frozen after terminal status | `_live` gate on every lifecycle write; 28 freeze tests |
| Owner cannot freeze funds | pause gates `file_challenge` only; no withdraw method exists |
| Content hash | URL + claim + canonical privacy text + findings + verdict |
| Conservative when unreadable | INCONCLUSIVE, both refunded; validators must *agree* it was unreadable |
| No trapped funds | `balance == locked + refundable` asserted after every offline transaction and published by `get_stats`; the full seed drains to 0 |
| Fee-estimable on Studio | no write both reads the clock and posts a transfer (`finalize` / `claim_payout` split) |
| Source = deployed | `deployments.json` records sha256; `tools/audit.py` recomputes it |

`python3 tools/audit.py` walks both contracts as syntax and checks all of the
above plus the brief's format rules (33 checks).

---

## Composability — AppTrustConsumer

An app marketplace calls this before listing an app. It holds no money
(**custody: false, zero payable methods, zero `raise`**) and counts only
**FINALIZED** verdicts, because a verdict inside its contest window can flip
and a default was never a reading of the listing.

```
is_contradicted(app_url) -> bool
get_trust_score(app_url) -> { trust_score, counts, badge }   # 70 + 10·verified − 35·contradicted − 5·defaulted
check_listing(app_url)   -> { listed, reason }
record_listing(app_url)  -> records the decision on chain
```

---

## Honest limitations

- **Listings are self-declared.** AppAudit tests a claim against what the
  developer told the store, not against the app's real network traffic. A
  developer who lies consistently in both places is not caught.
- **The page is read at judgment time.** A developer may edit their data-safety
  form between filing and judging; the judged text is stored with its hash so
  what was judged is always visible, but the edit wins. If it changes between
  two validators' fetches, nothing settles and judge() is re-run.
- Anyone except the advocate may respond, because the contract cannot verify
  developer identity on-chain. A second wallet could take the respondent slot
  before the real developer. The listing still decides which verdicts are
  possible, and the attacker loses 10% as protocol fee.
- **Vocabulary decides the data type.** Claims are mapped to data types by a
  published keyword list (`get_config().topics`); a claim outside it is refused
  before staking rather than guessed at. Negation is word-level (`not`, `never`,
  `n't`…); a double negative is read as a denial.
- **Axis substitutions.** Google Play publishes no tracking section and the App
  Store no sharing section; each uses the other's closest declaration, with a
  narrower strength range, and the finding says so.
- **Studio Dev** queues `on="finalized"` transfers without executing them
  (measured by earlier projects); `get_stats.undelivered_wei` reports the gap.
  Its render service also fails intermittently; a failed round stores nothing
  and is retried.
- **Two instances.** The canonical instance enforces the brief's windows and
  cannot be watched end to end in a day; the demo instance runs byte-identical
  source with minute-scale windows, and is what the app and the seed use.

---

## Repository

```
contracts/AppAuditV2.py          v2: LABEL, CROSS_STORE, POLICY_LABEL, identity, snapshots, pull payouts
contracts/AppTrustConsumerV2.py  v2 consumer: app_record(app)
contracts/AppAudit.py            v1 (unchanged, byte-identical to its deployments)
contracts/AppTrustConsumer.py    v1 consumer
contracts/NOTES.md               v1 design reasoning
contracts/_render_probe.py · _probe_v2.py · _probe_pay.py   measurement contracts
test/test_v2.py                  v2 offline suite (every threat-model item)
test/test_logic.py               v1 offline suite (492)
test/fixtures/, test/fixtures/v2 real pages rendered by Studio validators / served by the stores
test/deploy_v2.mjs · seed_v2.mjs · collect_v2.mjs   deploy from HEAD, seed, read back
test/deploy.mjs · seed.mjs · collect.mjs            v1
tools/audit_v2.py · audit.py     rejection ledgers (39 / 33 checks)
tools/verify_source.mjs          code read back from Studio Dev == HEAD, all six contracts
tools/shots.mjs                  screenshots + console / 390px overflow audit
docs/SEEDS.md · PROBE_V2.md · THREAT_MODEL_V2.md · AUDIT_V2.md · TASKS.md   v2
docs/EVIDENCE.md · PROBE.md      v1
ADDRESSES.md                     every address, commit and sha256
frontend/                        Next.js app (v2 under /v2, v1 pages kept)
```

```bash
python3 test/test_v2.py && python3 test/test_logic.py       # offline suites
python3 tools/audit_v2.py && python3 tools/audit.py         # rejection ledgers + source == deployed
node tools/verify_source.mjs                                # read code back from the chain
cd test && npm ci && node deploy_v2.mjs --all && caffeinate -dims node seed_v2.mjs && node collect_v2.mjs
cd frontend && npm ci && cp .env.example .env.local && npm run dev
```
