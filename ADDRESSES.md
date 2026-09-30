# Addresses

GenLayer Studio Dev — RPC `https://studio-dev.genlayer.com/api`, chain **61997**, explorer https://explorer-studio-dev.genlayer.com/

## v2 (current)

The two AppAudit v2 instances were deployed from commit `5e7c6b42d0082c8a8484cec8d35544af574ebfd4` (round 2); the consumer from `26a32841ccab5cb2fdbce04920a982e2286cdc40` (distinct-question counting), all with the local test key (`test/.accounts.json`, role `client`, no password). The source sent was read with `git show HEAD:<file>`; `node tools/verify_source.mjs` reads it back from the chain.

| contract | address | deploy tx | source | commit | bytes | sha256 |
|---|---|---|---|---|---|---|
| AppAudit v2 — **canonical** (0.5 / 0.3 GEN, 48h respond, 24h contest, 48h stall, 300s cooldown, 0.01 GEN snapshot, 24h re-verify) | [`0xB5F63383ED934e8eAa11cCc0510266481038092F`](https://explorer-studio-dev.genlayer.com/address/0xB5F63383ED934e8eAa11cCc0510266481038092F) | [`0xe3cce2f527…`](https://explorer-studio-dev.genlayer.com/tx/0xe3cce2f527a61af2cef3f7864b41b6f888285180dda1c87aa80dd88036a471a8) | `contracts/AppAuditV2.py` | `5e7c6b4` | 218,447 | `774e7b1d96a3e85968174c02d001ea214e4650b92f9ccb3b2e62879f66833862` |
| AppAudit v2 — **demo** (same source; 10-minute windows, no cooldown, 5-minute re-verify; the app and the seeds use it) | [`0xb9141A125Ec557e77BDF7F97B409b460Cf44cd53`](https://explorer-studio-dev.genlayer.com/address/0xb9141A125Ec557e77BDF7F97B409b460Cf44cd53) | [`0x30879c67d9…`](https://explorer-studio-dev.genlayer.com/tx/0x30879c67d962e851f40298ad26cd002af5d07e9a18e7d6b16db212c67f7f7451) | `contracts/AppAuditV2.py` | `5e7c6b4` | 218,447 | `774e7b1d96a3e85968174c02d001ea214e4650b92f9ccb3b2e62879f66833862` |
| AppTrustConsumerV2 (reads the demo; counts each distinct question once; custody false, zero payable methods) | [`0xFc6fA4B816387fbbf28e73B01B67cEC710513239`](https://explorer-studio-dev.genlayer.com/address/0xFc6fA4B816387fbbf28e73B01B67cEC710513239) | [`0xbaf3964004…`](https://explorer-studio-dev.genlayer.com/tx/0xbaf396400461d0616be8b6939309d27338af04c0a298ce5885621a8692cb9593) | `contracts/AppTrustConsumerV2.py` | `26a3284` | 14,763 | `c6d05a584faf75f93967e32fcc045ec357a38d3b084acf1b601fd11322249fba` |

## v1 (accepted; unchanged, still live)

`contracts/AppAudit.py` and `contracts/AppTrustConsumer.py` are byte-identical to these deployments.

| contract | address | deploy tx | bytes | sha256 |
|---|---|---|---|---|
| AppAudit v1 — canonical | [`0xbbdf68A0616e44Fb57d64386b19fa80b055d6257`](https://explorer-studio-dev.genlayer.com/address/0xbbdf68A0616e44Fb57d64386b19fa80b055d6257) | [`0x021675a088…`](https://explorer-studio-dev.genlayer.com/tx/0x021675a088ee5b583089b84fc8a2fcf98ca68652595dc3b1a2fa684a468bf6b6) | 127,385 | `9f64a7fc22eac0abe6b374e1e0a28283aea1d978d313242e3be4c0e789e55fd3` |
| AppAudit v1 — demo | [`0x060cFC326B19F3DD4B839dEa75924Fd2935be61C`](https://explorer-studio-dev.genlayer.com/address/0x060cFC326B19F3DD4B839dEa75924Fd2935be61C) | [`0x2626d8bd16…`](https://explorer-studio-dev.genlayer.com/tx/0x2626d8bd1681bb80ea8c86f25dcb44fb44ae9c6d2aaa4baf495a4aa2e91959f1) | 127,385 | `9f64a7fc22eac0abe6b374e1e0a28283aea1d978d313242e3be4c0e789e55fd3` |
| AppTrustConsumer v1 | [`0x5b6F3FBCD4f4aFAA763Fa13Bd9eD39AfD2C5773F`](https://explorer-studio-dev.genlayer.com/address/0x5b6F3FBCD4f4aFAA763Fa13Bd9eD39AfD2C5773F) | [`0x1380780b35…`](https://explorer-studio-dev.genlayer.com/tx/0x1380780b35bd7351821dafc23dca4843d1876c0020d0473655cd422d7e71ed4f) | 9,410 | `3f35348c183b20fb608ba13f0aaa021b5d5d8cebe4c7c9e5bc8e113e3332c3da` |

## Superseded (still on chain, no longer used)

| contract | address | why |
|---|---|---|
| v2 r1 — canonical | `0x088beDF9fB702C94f140A8c6d4e619d8B53da102` | replaced after the attack round ([details](docs/superseded/v2-r1/README.md)) |
| v2 r1 — demo | `0xC7502668d39e8BEA9795F1cEBd705cc267420793` | replaced after the attack round ([details](docs/superseded/v2-r1/README.md)) |
| AppTrustConsumerV2 r1 | `0xc9a0928A910d59F23AD612fAABaEd041FE5c0294` | replaced after the attack round ([details](docs/superseded/v2-r1/README.md)) |
| AppTrustConsumerV2 r2 | `0x18a81690aF1f3485fF7d14eFfef03AcFE3522719` | counted every case; refiling a question inflated its record |

## Owner

Every contract above was deployed by `0x4D628402a7358e646674075d479f5Dd36f92b2B3`. The owner can pause new filings and snapshots and name the fee recipient for future cases; nothing else.
