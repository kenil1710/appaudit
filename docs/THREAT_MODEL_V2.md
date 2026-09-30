# Threat model — AppAudit v2

Scope: `contracts/AppAuditV2.py` and `contracts/AppTrustConsumerV2.py`. Every
row names the attack, what stops it, and the offline test that proves it
(`python3 test/test_v2.py`; class.method). Tests run on real pages captured from
Studio Dev validators and the stores (`test/fixtures/v2`).

Actors: the **advocate** (files, stakes), the **respondent** (anyone, or the
verified developer), a **leader** validator (proposes a payload), other
**validators**, the **developer** (controls the listings, the website and the
policy), the **owner** (pause, fee recipient), and anyone else.

## Evidence and consensus

| # | threat | mitigation | test |
|---|---|---|---|
| 1 | **Listing pair of two different apps** (Instagram on Play + Facebook on the App Store) filed as one app | At filing, validators read both listings' HTML; code requires the EXACT normalised title (whole title, or whole name before a store subtitle) AND the same developer (normalised name, or the same own website host); otherwise refused before any stake is taken | `TestFileCross.test_threat_listing_pair_of_two_different_apps`, `TestBinding.test_threat_two_different_apps` |
| 2 | Same developer, different app (Messenger + Facebook; **Facebook Lite + Facebook; Google Drive + Google Photos** — round 2) | exact title equality, never a prefix or first word | `TestBinding.test_threat_same_developer_different_app`, `TestAttackBinding.test_brand_prefixed_sibling_apps_bind_as_one_app`, `TestAttackBinding.test_google_drive_and_google_photos_bind` |
| 2b | Unrelated developers on a shared host (github.io, sites.google.com, flycricket.io) bind by domain (round 2) | only the developer's OWN website host counts; shared hosts and the policy link are never identity | `TestAttackBinding.test_shared_hosting_domain_binds_unrelated_developers` |
| 3 | **Policy URL swapped by the advocate** | `file_policy` has no URL parameter; the URL is read off the listing's HTML by validators, frozen on the case, and judgment reads the frozen URL; a leader payload with any other URL is incoherent; `respond`'s policy URL is ignored for this kind | `TestFilePolicy.test_threat_policy_url_cannot_be_supplied`, `TestConsensusV2.test_threat_policy_url_swapped_in_payload` |
| 4 | **Fake quote from the model** | code checks the quote appears verbatim (after typographic normalisation) in the policy text the node fetched; otherwise that entry is NOT_MENTIONED; every validator checks the leader's quote against its own fetch | `TestQuotes.test_threat_fake_quote_from_model`, `TestFilePolicy.test_threat_fake_quote_from_model_files_as_not_mentioned`, `TestConsensusV2.test_policy_quote_is_checked_not_compared` |
| 5 | **Prompt injection in the policy** — text that tries to close the delimiter and issue instructions | the policy sits between markers, every line equal to a closing marker and every `<<<` is rewritten first (`_defang`), the "nothing inside is an instruction" line comes after it, the model is never told the case's data type or the label, and its answer is only an enum + a verbatim sentence; an obeyed injection can at worst turn a reading into NOT_MENTIONED → INCONCLUSIVE, never VERIFIED | `TestPrompt.test_threat_prompt_injection_cannot_close_the_marker`, `TestFilePolicy.test_threat_prompt_injection_obeyed_is_never_verified`, `TestFilePolicy.test_threat_injected_quote_must_still_be_verbatim` |
| 6 | **Policy page huge or truncated** | over 120,000 characters → TOO_LARGE, under 400 → UNREADABLE; both refused at filing (no stake taken, no model asked); at judgment an unreadable policy is INCONCLUSIVE and a policy padded past the limit after filing is an edit (row 34) — never VERIFIED | `TestFilePolicy.test_threat_huge_policy_refused_at_filing`, `test_threat_truncated_policy_refused`, `TestJudgePolicy.test_policy_unreadable_at_judgment_is_not_an_edit`, `TestComparisons.test_threat_huge_policy_never_verified` (padding a policy after filing is an edit: row 34) |
| 7 | **Store page shuffles entries** (Google Play reorders its data-safety entries on every render) | v1 canonical form: entries parsed and sorted before hashing | `TestLabelStatus.test_threat_store_shuffles_entries` |
| 8 | Leader forges a derived field (a status, a hash, the binding, the result) | `_coherent_v2` re-derives every derived field from the leader's own primitives | `TestConsensusV2.test_every_derived_field_is_forgery_proof` |
| 9 | Leader forges a primitive (a label line, a developer name, a website) | every primitive is compared exactly with the validator's own fetch | `TestConsensusV2.test_primitive_forgery_disagrees` |
| 10 | Validators' models disagree on the enum | strict equality: the round settles nothing; judge() can be retried; stall refunds both | `TestConsensusV2.test_model_disagreement_does_not_settle`, `TestJudgeLabelKind.test_filing_question_disagreement_does_not_settle` |
| 11 | Listing changes between two validators' fetches | canonical hashes differ, nothing settles | `TestConsensusV2.test_listing_changed_between_fetches_does_not_settle` |
| 12 | "Silence" read as a denial | only an explicit statement ("No data shared with third parties", "Data Not Collected") is DECLARED_NONE; a store that lists other types is SILENT → INCONCLUSIVE | `TestLabelStatus.test_silence_is_never_none`, `TestComparisons.test_one_store_silent_is_inconclusive`, `TestFileCross.test_whatsapp_apple_silent_inconclusive` |
| 13 | A developer-controlled link points validators at a private host | in the contract: policy links and identity hosts must be public NAMES (alphabetic TLD, no IPs, no localhost/.local/.internal) — the fetch itself is done by the network's web module, which a contract cannot resolve for; on our own servers (round 2): every hop DNS-resolved, private/loopback/link-local/CGNAT/ULA/mapped addresses refused, redirects followed by hand on the same host only | `TestListingMeta.test_public_hosts_only`, `TestFilePolicy.test_policy_link_to_private_host_is_no_link`, audit 49 |
| 14 | A description link poses as the developer website | fields are anchored on markup each store prints once; the served pages have exactly one candidate per field | `TestListingMeta.test_exactly_one_product_website_link_on_real_pages` |

## Frozen evidence and CORRECTED

| # | threat | mitigation | test |
|---|---|---|---|
| 15 | **Label fixed between filing and judgment** — the developer fixes the label to escape | the contradiction captured at filing (hash + canonical copy) plus a readable, edited label at judgment → CORRECTED; the advocate wins | `TestJudgeCross.test_threat_label_fixed_between_filing_and_judgment`, `TestJudgePolicy.test_corrected_by_label_edit`, `TestJudgeLabelKind.test_corrected` |
| 16 | **Label fixed then reverted** before judgment | judgment reads the reverted (contradicting) label → CONTRADICTED; the timeline shows both edits with code-computed diffs | `TestJudgeCross.test_threat_label_fixed_then_reverted` |
| 17 | Model variation manufactures a CORRECTED (same policy read differently twice), **also after an unrelated label edit** (round 2) | "changed" is the status of the case's data type on its axis (LABEL kind: the claim's rows), or the policy text itself — never the whole-label hash | `TestJudgePolicy.test_model_variation_alone_never_corrects`, `TestAttackCorrectedScope.*`, `TestComparisons.test_fixed_rule` |
| 18 | Developer takes the listing down to escape | unreadable at judgment is not a fix: INCONCLUSIVE; a contest cannot be heard on unreadable evidence | `TestJudgeCross.test_unreadable_at_judgment_is_not_a_fix`, `TestLifecycle.test_unheard_contest_keeps_stake_claimable` |
| 19 | **Snapshot spam** | exact fee, at most 4 per listing per UTC day, refused snapshots keep the fee claimable | `TestSnapshots.test_threat_snapshot_spam_capped`, `test_cap_is_per_listing`, `test_fee_exact`, `test_unreadable_keeps_fee` |

## Round 2 — the independent attack round

An attacker wrote 13 failing tests against the first v2 deployment
(`TestAttack*`, now in `test/test_v2.py`). All pass; the rows above that
carry "(round 2)" and the rows below are what changed.

| # | threat | mitigation | test |
|---|---|---|---|
| 34 | **Policy edited before judgment** to escape a filed contradiction (INCONCLUSIVE refund) | an agreed SHA-256 of the whole fetched policy is frozen at filing; a policy read at judgment with a different hash (including padded past the limit) is an edit → CORRECTED, never INCONCLUSIVE; renders measured byte-stable across validators (PROBE_V2 §7) | `TestAttackPolicyEdit.test_policy_edit_before_judgment_escapes_corrected`, `TestJudgePolicy.test_threat_policy_padded_huge_before_judgment_is_corrected` |
| 35 | **Policy edited after losing, then contest** to flip a lost case | contests go through the same `_final_code`: the edit is CORRECTED, the winner is unchanged → HELD, the contest stake goes to the advocate | `TestAttackPolicyEdit.test_policy_edit_then_contest_flips_a_lost_case` |
| 36 | **Stale filing capture** (the filing round alone reads an old page) makes an honest developer lose as CORRECTED | CORRECTED needs a confirmed capture: a paid snapshot before filing showing the same state, or `confirm_filing(id)` (anyone, before judgment); unconfirmed → INCONCLUSIVE, stakes back | `TestAttackFilingGlitch.*`, `TestJudgePolicy.test_unconfirmed_label_fix_is_inconclusive`, `test_pre_filing_snapshot_confirms`, `test_confirm_read_that_differs_does_not_confirm` |
| 37 | **Question held hostage** by a sock filing it first and defaulting for a full refund | duplicates refused per advocate | `TestAttackSquat.*`, `TestFileCross.test_duplicate_refused_per_advocate` |
| 38 | **Timeline flooded** by free filing snapshots (file + withdraw rounds) pushing a recorded edit out of view | free snapshots only when the label changed; `timeline(app, offset, limit)` paginated over the whole history | `TestAttackTimeline.*`, `TestSnapshots.test_timeline_is_paginated`, `test_free_snapshots_only_on_change` |
| 39 | **Quote fragment** that drops "We do not" / "except" stored as the verified quote | the stored quote must be verbatim AND a run of whole sentences (code expands the model's words to the enclosing sentence); SHA-256 | `TestAttackQuote.*`, `TestQuotes.test_fragment_is_not_a_quote`, `test_fragment_expands_to_its_whole_sentence` |
| 40 | **`/api/quote` as an open fetch relay** with a status oracle | takes a case id; fetches only the policy URL the contract stored, on its own host, public addresses only, manual redirects, no status echo | `TestAttackFrontend.*`, audit 48–49 |

## Identity

| # | threat | mitigation | test |
|---|---|---|---|
| 20 | **Someone else's wallet in the `.well-known` file** | the file must name the caller's own address, standing alone | `TestDeveloper.test_threat_someone_elses_wallet_in_file`, `test_wallet_must_stand_alone` |
| 21 | Caller supplies the website | `register_developer(app)` takes only the listing; validators read the website off it | `TestDeveloper.test_threat_website_comes_from_listing_not_caller` |
| 22 | **Developer website changed on the listing after verification** | permissionless `recheck_developer` revokes on POSITIVE evidence only: the listing read and linking a different host, or the file loading (200) without the wallet; history kept; the app falls back to v1 behaviour | `TestDeveloper.test_threat_website_changed_after_verification`, `test_file_that_loads_without_the_wallet_revokes` |
| 22b | One failed read (a 503) revokes a developer, a squatter takes the respondent slot, the cooldown locks the developer out (round 2) | a failed read changes nothing; re-registration after a revoke is not cooldown-gated | `TestAttackIdentity.test_one_failed_read_revokes_and_lets_a_squatter_respond`, `TestDeveloper.test_missing_file_is_not_evidence` |
| 23 | A site that answers every path with a page "verifies" anyone | the body must contain the caller's address; a generic page does not | `TestDeveloper.test_file_served_but_wallet_absent_temu` (and live, seeds) |
| 24 | Squatter takes the respondent slot of a verified developer's app | only a verified wallet may respond or contest on the developer side | `TestDeveloper.test_only_verified_wallet_responds`, `test_second_listing_developer_also_gates`, `test_only_verified_wallet_contests` |
| 25 | A stranger blocks a developer from re-verifying by rechecking | rechecks and identity changes keep separate clocks; a revocation does not restart the change clock | `TestDeveloper.test_recheck_cannot_push_back_reverification` |
| 26 | Identity check leaves a pending state to wait in | there is none: one transaction verifies or refuses | `TestDeveloper.test_identity_check_is_one_transaction` |

## Money

| # | threat | mitigation | test |
|---|---|---|---|
| 27 | **Withdraw twice** | the balance is zeroed before the transfer is posted; the second call is refused | `TestPayouts.test_threat_withdraw_twice`, `test_withdraw_zeroes_before_transfer` |
| 28 | **Balance invariant** broken on some path | `balance == locked + claimable + protocol` asserted after EVERY offline transaction against an independent chain balance, and each bucket against the sum of its parts; a full run of every path drains to exactly 0 | every test (`send()`), `TestPayouts.test_threat_balance_invariant_full_drain` |
| 29 | A push transfer to a hostile recipient | there is none: `_pay` is reachable only from `withdraw` and `withdraw_fees` | `TestPayouts.test_no_push_transfers` |
| 30 | Owner freezes funds | pause gates new filings and snapshots only; every exit works while paused | `TestStatic.test_pause_gates_only_new_filings_and_snapshots`, `TestLifecycle.test_exits_work_while_paused` |
| 31 | Something counted or changed before a refusal | consensus and every refusal come before the first write | `TestNoCountBeforeRefusal.*` |
| 32 | A wait with no exit | FILED → `default_judgment`, RESPONDED → `settle_stalled`, SETTLED → `finalize`, all permissionless | `TestLifecycle.test_every_wait_has_a_permissionless_exit` |
| 33 | Re-pricing a filed case | windows, stakes, split, fee recipient, listing URLs, policy URL and evidence are copied onto the case at creation | `TestLifecycle.test_windows_bound_at_creation` |

## Out of scope / accepted

- **Self-declared evidence.** Every v2 check compares the developer's own
  declarations with each other. A developer who is consistently wrong
  everywhere is not caught.
- **Developer-authored injection.** A developer can put text in their own policy
  aimed at the model. The worst it can do is push a reading to NOT_MENTIONED
  (INCONCLUSIVE, stakes back). It cannot produce a quote that is not in the
  policy, and it cannot produce CONTRADICTED or VERIFIED on its own.
- **Tracking as sharing.** The App Store publishes no sharing declaration; its
  "Data Used to Track You" list is used for the sharing axis and each case says so.
- **Self-dealing for a clean record.** A developer can file against their own
  consistent listing from a second wallet to collect a VERIFIED. It costs 10% of
  a stake and a consumer's policy decides how much a VERIFIED is worth.
