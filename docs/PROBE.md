# PROBE — what was measured, and how

Everything here was measured on GenLayer Studio Dev (chain 61997) by a
throwaway contract, `contracts/_render_probe.py`, which renders a URL through a
real validator (`gl.nondet.web.render(mode="text")`) and stores the text so it
can be read back in windows. The raw captures are in `docs/probe/`. The parser
in `contracts/AppAudit.py` was written against these bytes, not against what a
browser shows a human.

Probe contract: `0xe59Dc79D302Ecc2Ff0097bD0C0319cbcE020022C`.

---

## 1. Google Play: `/datasafety`, not `/details`

`https://play.google.com/store/apps/datasafety?id=com.whatsapp&hl=en&gl=US`
rendered **1,671 characters** in 19s (tx `0xccdf6158…`), and the whole
declaration is in them:

```
Data safety
…
No data shared with third parties
…
Data collected
Data this app may collect
App info and performance
Crash logs, Diagnostics, and Other app performance data
expand_more
…
Location
Approximate location
expand_more
…
Security practices
```

Each entry is a category line, a data-types line and `expand_more`. Spotify
(1,820 chars) and TikTok (2,042 chars) render the same shape with a `Data
shared` block. `/details` only carries a summary, so the contract always
rebuilds the `/datasafety` URL from the package id, whatever the user typed.

A package that does not exist renders **60 characters**:
`We're sorry, the requested URL was not found on this server.` — no
`Data safety` heading, so the contract reports `UNREADABLE`.

## 2. App Store: the App Privacy label is in the rendered text

`https://apps.apple.com/us/app/instagram/id389801252` rendered **10,580
characters** in 40s (tx `0x952aa56b…`). The privacy section starts at the line
`App Privacy` (around character 8,350, after the reviews) and ends at `Privacy
practices may vary…`:

```
App Privacy
…
Data Used to Track You
…
Contact Info
Identifiers
Other Data
Data Linked to You
…
Health & Fitness
Purchases
…
User Content
…
```

The reviews above it change constantly; the label does not. Three renders of
the same page were byte-identical within the section.

## 3. Google Play SHUFFLES its entries on every render — the finding that shaped the hash

The first live `judge()` went **UNDETERMINED**: the leader's verdict was right
(CONTRADICTED, strength 7) and two validators disagreed. The leader's category
list was in a different order from the probe's capture of the same page.

Three further renders of WhatsApp's data-safety page, seconds apart
(txs `0x693cf68b…`, `0x9593f407…`, `0x792dabf9…`), listed the same seven
categories in **three different orders**:

```
render 1: Contacts | Personal info | App info and performance | Device or other IDs | Location | …
render 2: Device or other IDs | Contacts | App info and performance | Financial info | Location | …
render 3: App info and performance | Personal info | Device or other IDs | Financial info | App activity | …
```

The content is identical; the order is not. Five validators hashing raw lines
would never agree. So the contract parses every entry and hashes a **canonical,
sorted form** (`collected | Location | Approximate location`, one line per
entry, sorted within each group). The three real renders are fixtures in
`test/fixtures/play_whatsapp_render{1,2,3}.txt`, and
`TestExtraction.test_real_shuffled_renders_hash_identically` requires them to
produce one hash. After the change, the next live judgment settled on its
first attempt in 40 seconds.

The App Store label was measured stable across renders; it is sorted anyway.

## 4. The faucet silently refused every large amount

`sim_fundAccount` with `Number(2000n * 10n**18n)` serialises the amount as
`2e+21`, which Studio answers with `amount must be a positive integer`. The
funding helper was non-fatal, so every account quietly stayed at zero until a
deploy ran on the last 0.1 GEN. The body is now written with a raw integer
literal (`test/harness.mjs`, `fundOnStudio`).

## 5. Studio's render service fails and stalls under load

Twice, on two different contract instances, the third `judge()` in a row (the
Spotify challenge) had its leader's GenVM crash three times with
`error sending request for url (http://studio-webdriver:4444/render?…)` —
Studio's own headless-browser service, not the page and not the contract (the
same URL rendered in 19s through the probe minutes later). A crashed leader
applies no state.

The retry that followed sat **PENDING for over twenty minutes** at queue
position 0 (`lifecycle: processing`), and then **finalized correctly**: tx
`0x2c99d88a…` on the first demo instance settled the Spotify challenge as
ABSENT → INCONCLUSIVE with no model call, exactly as the offline suite
predicts. While one transaction is pending, Studio holds every later write to
the same contract behind it.

What changed because of it:

- a judgment is five page loads, and a fee *simulation* of it is a sixth; the
  seed and the frontend now use the generic fee estimate for `judge` and
  `contest` (they post no transfer) and simulate only `claim_payout` /
  `claim_refund`;
- the seed pauses between judgments, and on a client-side give-up it watches
  the chain instead of queuing a duplicate;
- the frontend reports a long-pending write as pending, not failed;
- the seed is resumable: every step asks the chain whether it already happened.

## 6. Carried over from previous projects (not re-measured)

- Studio's fee simulator runs on a block clock ~664 days stale, so a write that
  both reads the clock and posts a transfer is under-budgeted and reverts with
  `out_of message_fee`. AppAudit therefore splits `finalize` (clock, no
  transfer) from `claim_payout` (transfer, no clock). `tools/audit.py` check 27
  enforces that no write does both.
- `emit_transfer` on `gl.chain.Account`, not proxy `emit`, is the spelling that
  posts a value transfer; Studio queues `on="finalized"` transfers without
  executing them, reported by `get_stats.undelivered_wei`.
- genlayer-js 2.0.0-rc.1 drops commas between map entries in its `readable`
  return rendering; the frontend and harness repair it and never depend on it.
