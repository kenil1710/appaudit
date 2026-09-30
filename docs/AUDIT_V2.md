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
