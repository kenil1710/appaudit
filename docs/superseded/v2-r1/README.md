# Superseded: AppAudit v2, first deployment (r1)

These three contracts were the first v2 deployment. An independent attack
round found ten weaknesses in them (docs/AUDIT_V2.md, "Round 2"); all were
fixed and v2 was redeployed. The r1 contracts stay on chain, with their
seeded cases, and are no longer used by the app.

| contract | address |
|---|---|
| AppAudit v2 r1 — canonical | `0x088beDF9fB702C94f140A8c6d4e619d8B53da102` |
| AppAudit v2 r1 — demo | `0xC7502668d39e8BEA9795F1cEBd705cc267420793` |
| AppTrustConsumerV2 r1 | `0xc9a0928A910d59F23AD612fAABaEd041FE5c0294` |

They were deployed from commit `8f9db85`. The repository's history was later
rewritten to remove commit-message trailers (file contents unchanged); the
same tree is now commit `d52d5e1`, where `contracts/AppAuditV2.py` has
sha256 `6ce579c9e9fb8ad1545f5d3b21d1a2a6176e272556cc5930c2ac7cde92a92b5e`.

`ADDRESSES.md`, `SEEDS.md` and `seed-v2.json` here are the r1 records as they
were.
