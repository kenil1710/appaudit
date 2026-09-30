# AUDIT V2 — own review of AppAudit v2

Reviewed: `contracts/AppAuditV2.py`, `contracts/AppTrustConsumerV2.py`, the
v2 frontend (`frontend/src/app/v2`, `lib/v2.ts`, `lib/mirror.ts`, the two API
routes) and the scripts that deploy and seed them. Method: the brief's rules
and the past-rejection ledger as mechanical checks (`tools/audit_v2.py`,
39 checks), the offline suite (`test/test_v2.py`), a trial deployment driven
through real consensus rounds before the canonical deploy, and a line-by-line
read of every write path.

Every finding below was fixed before the contracts were deployed, except the
frontend ones, which were fixed before the frontend was deployed. The last
column is the test or check that now guards it.

## Findings

| # | severity | finding | fix | guarded by |
|---|---|---|---|---|
| 1 | **critical** | The judgment round of the code-decided kinds compared the vector with different defaults on each side for a key neither side had (`bound` exists only at filing): every cross-store judgment would have failed to reach agreement and every case would have stalled. | A key must be present on both sides or on neither, then compared with the same default. | `TestJudgeCross.*` (all judge through `_agrees_v2`); found by the suite on its first run |
| 2 | high | LABEL-kind CORRECTED was not re-derivable by `verify_case`: the judgment's own verdict (under CORRECTED) was not stored, so verification had to guess. | `j_result` stores the judgment-time verdict for every kind; `verify_case` re-derives the whole v1 record from it and the CORRECTED rule on top. | `TestJudgeLabelKind.test_corrected` (asserts `verify_case(...).verified`) |
| 3 | high | Griefing: `recheck_developer` (permissionless) shared the cooldown clock with registration, so a stranger rechecking every cooldown period could stop a developer from ever rotating their wallet. A revocation also restarted that clock. | Separate clocks (`dev_last_at` for identity changes, `dev_checked_at` for rechecks); only a VERIFIED event restarts the change clock. | `TestDeveloper.test_recheck_cannot_push_back_reverification`, audit check 29 |
| 4 | high | Developer-controlled links (the policy link, the website host) could name an IP address or a local host, sending validators' renderers at internal addresses. | `_full_host` accepts only public names (alphabetic TLD, no IPs, no `localhost` / `.local` / `.internal` / `.localhost`, no userinfo); a policy link that fails it is NO_LINK. | `TestListingMeta.test_public_hosts_only`, `TestFilePolicy.test_policy_link_to_private_host_is_no_link`, audit check 9 |
| 5 | high | A policy could contain a line equal to the closing marker and continue with "instructions" outside the delimited block. | `_defang` rewrites marker lines and every `<<<` before the text is placed between markers. | `TestPrompt.test_threat_prompt_injection_cannot_close_the_marker`, audit check 10 |
| 6 | medium | The identity vector allowed incoherent leader payloads (`names` true while `found` false; a body hash without a match). | `_coherent_v2` enforces the implications and types. | `TestDeveloper.test_register_payload_coherence` |
| 7 | medium | Listings touched only by a snapshot or an identity check were missing from `get_apps`, so they had no app page. | One `_known` registry used by cases, snapshots and registrations. | `TestDeveloper.test_known_apps_registry` |
| 8 | medium | A model answering `entries` as a list (instead of a map) was treated as no answer, refusing honest filings. | Both shapes are accepted; every entry still goes through the enum and verbatim-quote checks. | `TestFilePolicy.test_list_shaped_model_answer` |
| 9 | low | The cooldown message compared two storage proxies with `is`, which the runner does not guarantee. | The caller passes the label explicitly. | review |
| 10 | low | The App Store's tracking list silently stood in for "sharing". | Every case on the sharing axis involving the App Store carries `axis_note`; the UI shows it. | review; `get_case` |
| 11 | ops | On Studio Dev a round whose validators all time out can come back FINALIZED with the leader's return value `status: OK` — and no state applied (observed on the trial instance). A script trusting the receipt would record a case that does not exist. | Every seed step reads the chain after the write (`fileOnce`, `judgeUntil`), and retries when the view shows nothing changed. The frontend re-reads the chain after every transaction. | seeds (retries visible in `docs/seed-v2-run.log`) |
| 12 | ops | A crashed leader jams a contract's transaction queue (measured on probe instances). | The probe driver replaces a jammed instance; the seed sends one transaction at a time to each contract. | `test/probe_v2.mjs` |
| 13 | frontend | Two pages scrolled sideways at 390 px (long unbreakable hashes and badges in grid cells). | Grid children `min-width: 0`, hashes wrap anywhere, long badges wrap. | `tools/shots.mjs`: no overflow and no console errors at 1440 and 390 px on every v2 page |
| 14 | frontend | Google Play package names produced "Android" as an app's name (`com.linkedin.android`). | The name skips generic trailing segments; known apps are named explicitly. | screenshots |

## Round 2 — independent attack round

An attacker wrote `test/test_attacks_v2.py`: 13 tests, all failing against
the first v2 deployment. All ten findings were fixed, the 13 tests moved
into `test/test_v2.py` (section 14, verbatim), and the contracts redeployed.

| # | severity | finding | fix | guarded by |
|---|---|---|---|---|
| R1 | high | Binding on the FIRST title word let sibling apps (Facebook Lite / Facebook, Google Drive / Google Photos) bind as one app; the domain fallback (and the policy-link domain) let unrelated developers on shared hosts bind. | Exact equality of the whole normalised title (case, punctuation, ™/® removed) or of the whole name before a store subtitle, AND the same developer: normalised name, or the same own website host (a list of shared hosts never counts; the policy link is never identity). Re-run on the 24 dry-run apps: the seed apps still bind; Telegram ("Telegram" / "Telegram Messenger") is now refused. | `TestAttackBinding.*`, audit 14 |
| R2 | high | A policy edit (deleting the admission) escaped a filed contradiction as INCONCLUSIVE; after losing, the same edit plus a contest FLIPPED the case and refunded everything. | An agreed SHA-256 of the whole fetched policy at filing and judgment; a read policy whose hash changed counts as changed → CORRECTED, in judge and contest (`_final_code`), never INCONCLUSIVE. | `TestAttackPolicyEdit.*`, audit 40 |
| R3 | medium | "Changed" was the whole-label hash: any unrelated edit plus model variation became CORRECTED; in the LABEL kind it re-opened the filed text. | Changed = the case's data type status on its axis (LABEL kind: the claim's relevant rows); `_relevant`. | `TestAttackCorrectedScope.*`, audit 41 |
| R4 | medium | One agreed failed read (a 503) revoked a verified developer and the change cooldown then locked them out while a squatter responded. | Revoke only on positive evidence (listing read and a different host; file 200 without the wallet); re-registration after a revoke is not cooldown-gated. | `TestAttackIdentity.*`, audit 43 |
| R5 | medium | A global duplicate check let a sock hold a question hostage at zero cost. | Duplicates per advocate. | `TestAttackSquat.*`, audit 44 |
| R6 | low | Free filing snapshots could flood a listing's timeline past the 60-row window. | Free snapshots only on change; paginated `timeline(app, offset, limit)`. | `TestAttackTimeline.*`, audit 45 |
| R7 | low | A stale page read once at filing could make an honest developer lose as CORRECTED. | CORRECTED needs a confirmed capture (paid snapshot before filing with the same state, or `confirm_filing`); unconfirmed → INCONCLUSIVE. An edit to the policy itself needs no witness (its capture was verified sentence by sentence). | `TestAttackFilingGlitch.*`, audit 42 |
| R8 | low | The stored quote could be any verbatim fragment, cutting off a negation. | Code expands the model's words to the shortest run of whole sentences; validators require verbatim AND whole; SHA-256 (pure Python, FIPS 180-4, checked against hashlib). | `TestAttackQuote.*`, `TestQuotes.*`, audit 3, 46 |
| R9 | low | `/api/quote` fetched any URL from the query string, followed redirects and echoed the status. | Takes a case id, reads the policy URL from the contract, same-host only, no status. | `TestAttackFrontend.*`, audit 48 |
| R10 | low | Server fetch guard was name-only. | DNS-resolved, private ranges refused, manual redirects re-checked every hop (`lib/safefetch.ts`). The contract can only check names; the fetch itself is the network's web module. | audit 49 |
| R11 | found while fixing | The new sentence splitter was first named `_sentences`, silently shadowing v1's `_sentences` used by contest novelty — every contest raised. Caught by the suite before any deploy. | Renamed `_policy_sentences`; a static test and audit 47 forbid duplicate top-level definitions. | `TestStatic.test_no_duplicate_top_level_definitions` |

## What was checked and holds

- **Consensus binds every stored value.** Each op has primitives and derived
  fields; the leader's derived fields are re-derived (`_coherent_v2`) and the
  whole vector compared exactly (`_agrees_v2`). The one leader-chosen string
  kept — a policy quote — is stored only as a hash and a length, after every
  validator verified it verbatim in its own fetch. (Audit 1–4.)
- **Validators fetch the evidence themselves.** No typed URL is fetched: label
  and identity pages are rebuilt from the app key; the policy URL and the
  website are read off the listing; the identity file URL is built from the
  website host. (Audit 5–9.)
- **Nothing counted or changed before a possible refusal.** In every filing,
  snapshot and registration, consensus and every refusal it can produce come
  before the first write. (Audit 24; `TestNoCountBeforeRefusal`.)
- **No trapped funds.** `balance == locked + claimable + protocol` after every
  one of the 242 offline transactions in the suite, checked against an independently tracked
  chain balance; a full run of every path withdraws to exactly zero.
  (`TestPayouts.test_threat_balance_invariant_full_drain`.)
- **No push transfers; no double pay.** `_pay` is reachable only from
  `withdraw` / `withdraw_fees`, which zero the balance first. (Audit 16–17.)
- **Every wait has a deadline and a permissionless exit**, and pause cannot
  block any of them. (Audit 25–26.)
- **Deadlines and evidence bound at creation.** (Audit 27.)
- **Zero `raise`, no `str.replace`, pinned runner header, no storage captured
  by a nondet closure** in both v2 contracts. (Audit 31–34.)
- **Deployed == HEAD.** `tools/audit_v2.py` 36–38 compare the working file, the
  file at the recorded deploy commit, the file at HEAD and the recorded sha256;
  `tools/verify_source.mjs` reads the code back from Studio Dev and compares
  it byte for byte with HEAD for all six contracts (v1 and v2).
- **v1 untouched.** `contracts/AppAudit.py` and `AppTrustConsumer.py` are
  byte-identical to their v1 deployments; the v1 suite (492 tests) and v1
  audit (33 checks) still pass.

## Residual risks (accepted, documented in README "Known limits")

- Self-declared evidence; developer-authored injection can only push a reading
  to INCONCLUSIVE; tracking stands in for sharing on the App Store.
- Model disagreement between validators stalls a round (both stakes return);
  it cannot produce a wrong verdict.
- Studio Dev does not execute value transfers; balances and books are right,
  delivery is the network's.
- The verified-developer success path runs only offline: no real developer
  publishes the file.
