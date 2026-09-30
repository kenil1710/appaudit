# Addresses

GenLayer Studio Dev — RPC `https://studio-dev.genlayer.com/api`, chain **61997**, explorer https://explorer-studio-dev.genlayer.com/

## v2 (current)

Deployed from commit `8f9db859eddea3455b4558651cea8cab2660165f` with the local test key (`test/.accounts.json`, role `client`, no password). The source sent was read with `git show HEAD:<file>`; `node tools/verify_source.mjs` reads it back from the chain.

| contract | address | deploy tx | source | bytes | sha256 |
|---|---|---|---|---|---|
| AppAudit v2 — **canonical** (0.5 / 0.3 GEN, 48h respond, 24h contest, 48h stall, 300s cooldown, 0.01 GEN snapshot, 24h re-verify) | [`0x088beDF9fB702C94f140A8c6d4e619d8B53da102`](https://explorer-studio-dev.genlayer.com/address/0x088beDF9fB702C94f140A8c6d4e619d8B53da102) | [`0x55c0a4915f…`](https://explorer-studio-dev.genlayer.com/tx/0x55c0a4915f1ca183dcd46a6e7e0166cca4f6f0a68f66c14cec298eb9a387f858) | `contracts/AppAuditV2.py` | 196,574 | `6ce579c9e9fb8ad1545f5d3b21d1a2a6176e272556cc5930c2ac7cde92a92b5e` |
| AppAudit v2 — **demo** (same source; 10-minute windows, no cooldown, 5-minute re-verify; the app and the seeds use it) | [`0xC7502668d39e8BEA9795F1cEBd705cc267420793`](https://explorer-studio-dev.genlayer.com/address/0xC7502668d39e8BEA9795F1cEBd705cc267420793) | [`0x5130a4cc4b…`](https://explorer-studio-dev.genlayer.com/tx/0x5130a4cc4bc15ae71291015d062613fe10ff7d1af33257be1260daa1a6d11c56) | `contracts/AppAuditV2.py` | 196,574 | `6ce579c9e9fb8ad1545f5d3b21d1a2a6176e272556cc5930c2ac7cde92a92b5e` |
| AppTrustConsumerV2 (reads the demo; custody false, zero payable methods) | [`0xc9a0928A910d59F23AD612fAABaEd041FE5c0294`](https://explorer-studio-dev.genlayer.com/address/0xc9a0928A910d59F23AD612fAABaEd041FE5c0294) | [`0x9b2e211c88…`](https://explorer-studio-dev.genlayer.com/tx/0x9b2e211c8812f6a7d6e59cfd3a79d9a62533541d586f6acd02f9c8be23ea8e85) | `contracts/AppTrustConsumerV2.py` | 10,076 | `d8c3c291477d6b33f41f1e21d2725f4570f21c57f63b275c4cdad9e0b7b8833f` |

## v1 (accepted; unchanged, still live)

`contracts/AppAudit.py` and `contracts/AppTrustConsumer.py` are byte-identical to these deployments.

| contract | address | deploy tx | bytes | sha256 |
|---|---|---|---|---|
| AppAudit v1 — canonical | [`0xbbdf68A0616e44Fb57d64386b19fa80b055d6257`](https://explorer-studio-dev.genlayer.com/address/0xbbdf68A0616e44Fb57d64386b19fa80b055d6257) | [`0x021675a088…`](https://explorer-studio-dev.genlayer.com/tx/0x021675a088ee5b583089b84fc8a2fcf98ca68652595dc3b1a2fa684a468bf6b6) | 127,385 | `9f64a7fc22eac0abe6b374e1e0a28283aea1d978d313242e3be4c0e789e55fd3` |
| AppAudit v1 — demo | [`0x060cFC326B19F3DD4B839dEa75924Fd2935be61C`](https://explorer-studio-dev.genlayer.com/address/0x060cFC326B19F3DD4B839dEa75924Fd2935be61C) | [`0x2626d8bd16…`](https://explorer-studio-dev.genlayer.com/tx/0x2626d8bd1681bb80ea8c86f25dcb44fb44ae9c6d2aaa4baf495a4aa2e91959f1) | 127,385 | `9f64a7fc22eac0abe6b374e1e0a28283aea1d978d313242e3be4c0e789e55fd3` |
| AppTrustConsumer v1 | [`0x5b6F3FBCD4f4aFAA763Fa13Bd9eD39AfD2C5773F`](https://explorer-studio-dev.genlayer.com/address/0x5b6F3FBCD4f4aFAA763Fa13Bd9eD39AfD2C5773F) | [`0x1380780b35…`](https://explorer-studio-dev.genlayer.com/tx/0x1380780b35bd7351821dafc23dca4843d1876c0020d0473655cd422d7e71ed4f) | 9,410 | `3f35348c183b20fb608ba13f0aaa021b5d5d8cebe4c7c9e5bc8e113e3332c3da` |

## Owner

All six were deployed by `0x4D628402a7358e646674075d479f5Dd36f92b2B3`. The owner can pause new filings and snapshots and name the fee recipient for future cases; nothing else.
