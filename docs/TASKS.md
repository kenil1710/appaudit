# AppAudit v2 — task list

Ticked as each item lands. v1 (contracts/AppAudit.py, AppTrustConsumer.py)
is frozen: its files are byte-identical to what is deployed at the v1
addresses, and its 492-test suite still runs on every push.

## Measurement
- [x] v2 probe contract (`contracts/_probe_v2.py`): text render, html render, plain GET
- [x] `web.get` works on Studio Dev (listing HTML 0.9–1.3 MB in ~15 s)
- [x] listing identity fields located in the real HTML (title, developer, website, policy link)
- [x] transfer delivery measured (`contracts/_probe_pay.py`): neither `on="decided"` nor the default executes on Studio Dev
- [x] dry-run of the extraction on 24 popular apps, both stores (docs/PROBE_V2.md)
- [x] 14 linked privacy policies rendered and sized

## Contract (contracts/AppAuditV2.py)
- [x] LABEL kind = v1 claim type, v1 bracket, unchanged rules
- [x] 1 CROSS_STORE: both listings, canonical form, code comparison, silence = INCONCLUSIVE
- [x] 1 same-app binding at filing (title word + developer name or website domain)
- [x] 2 POLICY_LABEL: policy URL read off the listing; fixed enum + verbatim quote; code comparison
- [x] 2 policy size limit / truncation → never VERIFIED; filing refused
- [x] 2 prompt injection: delimited, defanged, instruction after; enum + verbatim quote only
- [x] 3 verified developer: `.well-known/appaudit.txt` on the listing's website host
- [x] 3 only the verified wallet responds / contests; "respondent unverified" otherwise
- [x] 3 re-verification with cooldown, history kept; permissionless recheck / revoke
- [x] 4 evidence frozen at filing (hash + compact canonical copy)
- [x] 4 CORRECTED (contradiction at filing, fixed and edited by judgment)
- [x] 4 snapshot(app) + timeline(app) with code diffs, per-listing daily cap
- [x] 5 pull payouts: claimable balances, withdraw(), withdraw_fees(); no push transfer
- [x] 5 ledger identity balance == locked + claimable + protocol
- [x] 6 AppTrustConsumerV2.app_record(app); custody false, zero payable

## Tests
- [x] test/test_v2.py — every threat-model item has an offline test
- [x] invariant checked after every transaction against an independent chain balance
- [x] v1 suite untouched and green

## Chain
- [ ] deploy v2 CANONICAL, DEMO, CONSUMER from committed HEAD
- [ ] ADDRESSES.md (full addresses, commit, sha256)
- [ ] seeds (docs/SEEDS.md), every model-decided seed run twice
- [ ] verify_source: code read back from Studio Dev for all 3 v2 contracts

## Frontend
- [ ] file cross-store / policy cases
- [ ] side-by-side labels; policy quote vs label
- [ ] verified-developer badge + registration flow with exact file content
- [ ] timeline page with diffs
- [ ] claimable balance + withdraw
- [ ] app record page
- [ ] docs / how-it-works updated for v2

## Docs
- [ ] docs/THREAT_MODEL_V2.md
- [ ] docs/AUDIT_V2.md
- [ ] docs/PROBE_V2.md
- [ ] README v2 section, v1 + v2 addresses
