# PROBE V2 — what was measured before v2 was written

Everything here was measured on GenLayer Studio Dev (chain 61997) through real
validators, with the throwaway contracts `contracts/_probe_v2.py` (text render,
html render, plain GET) and `contracts/_probe_pay.py` (transfer delivery), driven
by `test/probe_v2.mjs` and `test/probe_pay.mjs`. Raw captures: `docs/probe/v2/`.
The v2 extractors were written against these bytes.

## 1. `gl.nondet.web.get` works, and listing HTML carries identity

| request | status | bytes | time |
|---|---|---|---|
| GET `apps.apple.com/us/app/instagram/id389801252` | 200 | 929,297 | 17 s |
| GET `play.google.com/store/apps/details?id=com.instagram.android&hl=en&gl=US` | 200 | 1,333,574 | 16 s |
| GET `signal.org/.well-known/appaudit.txt` | 404 | 7,450 | 13 s |

The rendered TEXT of a listing has no link targets, so identity cannot come from
it. The HTML does, on markup each store prints for exactly one field:

| field | Google Play (`/details`) | App Store (US product page) |
|---|---|---|
| title | `itemprop="name">…<` | the `<h1>` |
| developer | the `/store/apps/developer?id=` (or `/dev?id=`) link | `<dt>Seller</dt>` … `</dd>` |
| website | `<a aria-label="Website https://…">` | the product-page link whose text is exactly `Developer Website` and which carries **no** aria-label (the accessibility shelf has a second, labelled one pointing elsewhere — WhatsApp's goes to its FAQ) |
| privacy policy | `<a aria-label="Privacy Policy https://…">` | `<a aria-label="Developer’s Privacy Policy">` |

`test_v2.py` proves, on the full served pages (gzipped fixtures), that each field
has exactly one candidate anchor.

## 2. Dry run: 24 popular apps, both stores, through validators

48 label renders (text) and 48 listing pages. Each row is the v2 code
(`_extract`, `_listing_meta`, `_bind`, `_label_status`, `_cross_result`) run on
what validators returned. "Consistent" counts (type, axis) pairs both stores
answer the same explicit way.

| app | Play / App Store | same app? | Play: shared | App Store: used to track you | cross-store contradictions | consistent |
|---|---|---|---|---|---|---|
| WhatsApp | `com.whatsapp` / `id310633997` | yes — same developer name: whatsapp | no data shared | — | — | 9 |
| Instagram | `com.instagram.android` / `id389801252` | yes — same developer name: instagram | Device or other IDs, Personal info | Contact Info, Identifiers, Other Data | — | 13 |
| Facebook | `com.facebook.katana` / `id284882215` | yes — same developer name: meta platforms | Device or other IDs, Personal info | Contact Info, Identifiers, Other Data | — | 13 |
| Messenger | `com.facebook.orca` / `id454638411` | yes — same developer name: meta platforms | Device or other IDs, Personal info | — | — | 11 |
| TikTok | `com.zhiliaoapp.musically` / `id835599320` | yes — same developer name: tiktok | App activity, Audio, Personal info, Photos and videos | Contact Info, Identifiers | — | 11 |
| Snapchat | `com.snapchat.android` / `id447188370` | yes — same developer name: snap | no data shared | Contact Info, Identifiers | personal (share), identifiers (share) | 9 |
| Spotify | `com.spotify.music` / `id324684580` | yes — same developer name: spotify | Device or other IDs, Location, Personal info | Contact Info, Identifiers, Usage Data | — | 11 |
| Netflix | `com.netflix.mediaclient` / `id363590051` | yes — same developer name: netflix | no data shared | — | — | 6 |
| Telegram | `org.telegram.messenger` / `id686449807` | yes — same developer name: telegram | no data shared | — | — | 3 |
| Signal | `org.thoughtcrime.securesms` / `id874139669` | yes — same developer website domain: signal.org | no data shared | — | — | 1 |
| Zoom | `us.zoom.videomeetings` / `id546505307` | **no** — the developers differ ('zoom.com' / zoom.us vs 'Zoom Communications, Inc.' / zoom.com) | no data shared | — | — | 6 |
| Duolingo | `com.duolingo` / `id570060128` | yes — same developer name: duolingo | App activity, App info and performance, Device or other IDs | Contact Info, Diagnostics, Identifiers, Location, Other Data, Purchases, Usage Data, User Content | — | 11 |
| Uber | `com.ubercab` / `id368677368` | yes — same developer name: uber technologies | App activity | Contact Info, Identifiers, Other Data, Purchases, Search History, Usage Data | — | 10 |
| Airbnb | `com.airbnb.android` / `id401626263` | yes — same developer name: airbnb | App activity, Device or other IDs, Financial info, Location, Personal info | — | — | 7 |
| Pinterest | `com.pinterest` / `id429047995` | yes — same developer name: pinterest | App activity, Device or other IDs, Financial info, Location, Personal info, Web browsing | Contact Info, Identifiers, Location, Purchases | — | 14 |
| Reddit | `com.reddit.frontpage` / `id1064216828` | yes — same developer name: reddit | App activity, App info and performance, Audio, Files and docs, Financial info, Messages, Personal info, Photos and videos | Identifiers, Usage Data | — | 9 |
| Discord | `com.discord` / `id985746746` | yes — same developer name: discord | Device or other IDs | Identifiers | — | 8 |
| LinkedIn | `com.linkedin.android` / `id288429040` | yes — same developer name: linkedin | no data shared | — | — | 9 |
| Shazam | `com.shazam.android` / `id284993459` | yes — same developer name: apple | no data shared | — | — | 6 |
| Threads | `com.instagram.barcelona` / `id6446901002` | yes — same developer name: instagram | Device or other IDs, Personal info | — | — | 11 |
| Temu | `com.einnovation.temu` / `id1641486558` | yes — same developer website domain: temu.com | Device or other IDs | — | — | 8 |
| Waze | `com.waze` / `id323229106` | yes — same developer name: waze | Device or other IDs | — | — | 7 |
| CapCut | `com.lemon.lvoverseas` / `id1500855883` | yes — same developer name: bytedance | no data shared | Identifiers | identifiers (share) | 5 |
| Proton Mail | `ch.protonmail.android` / `id979659905` | yes — same developer name: proton | no data shared | — | — | 1 |

**Real contradictions: Snapchat and CapCut.** Both Google Play listings state
"No data shared with third parties"; both App Store labels list data under "Data
Used to Track You" — Identifiers (and, for Snapchat, Contact Info), which Apple
defines as data linked with other companies' data for advertising or shared with
data brokers. The App Store has no separate sharing declaration, so its tracking
list is the closest one; every such case carries that note.

**Collection-axis contradictions: none.** None of the 24 declares "No data
collected" on one store while the other lists data; they are rare among large apps.

**Binding refused Zoom**, honestly: Play says developer `zoom.com` / website
`zoom.us`, the App Store says `Zoom Communications, Inc.` / `zoom.com`. No common
name or domain, so a cross-store case about Zoom is refused. Conservative by design.

**Silent is not "none".** WhatsApp's App Store label has no tracking section at
all; against Play's "No data shared" that is INCONCLUSIVE, not consistent.

## 3. Linked privacy policies, rendered by validators

The policy URL each Play listing links (Section 1), rendered in text mode:

| policy | characters |
|---|---|
| https://www.capcut.com/clause/privacy-policy | 19,347 |
| http://www.snapchat.com/privacy | 35,273 |
| https://www.linkedin.com/legal/privacy-policy | 41,255 |
| http://www.netflix.com/privacy | 70,592 |
| https://www.whatsapp.com/legal/privacy-policy | 26,355 |
| http://zoom.us/privacy/ | 55,658 |
| https://www.spotify.com/legal/privacy-policy/ | 41,732 |
| https://www.temu.com/privacy-and-cookie-policy.html | 31,964 |
| https://www.duolingo.com/privacy | 30,674 |
| https://policy.pinterest.com/privacy-policy | 24,856 |
| https://telegram.org/privacy | 32,809 |
| https://signal.org/privacy | 13,658 |
| https://discordapp.com/privacy/ | 35,706 |
| http://www.waze.com/legal/privacy/ | 46,120 |

All are under the 120,000-character cap. Screening for sentences about sharing
data types with third parties (the contract's model does the real reading):

- **LinkedIn** (Play: "No data shared"): *"We do not share your personal data with
  any non-Affiliated third-party advertisers or ad networks except for: (i)
  hashed IDs or device identifiers…"*
- **CapCut** (Play: "No data shared"): *"we do “share” your information where
  defined under applicable law to include … disclosing your personal information
  to third parties for purposes of serving you advertisements"*
- **Snapchat** (Play: "No data shared"): *"We share your information, such as
  device and usage information, with industry partners working to prevent fraud."*
- **Pinterest** (Play declares Device IDs shared): *"we disclose information such
  as cookie IDs, your IP address, or a hashed version of your email address to
  third parties, such as Facebook Ads…"* — the consistent case.

A trial filing on a throwaway instance (LinkedIn, identifiers, sharing) reached
consensus with validators running three different model families; each
independently verified the leader's 349-character quote verbatim in its own fetch.

## 4. Identity files on real listing websites

`https://<listing website host>/.well-known/appaudit.txt` for every website above:
404 almost everywhere; redirects for Instagram/Netflix/Airbnb; **200** for
`www.temu.com` (2.9 KB page) and `www.pinterest.com` (1.3 MB single-page app) —
sites that answer every path. Those give an honest live refusal of the kind
"file served, wallet absent"; Snapchat and LinkedIn give "no file". No real
developer publishes an AppAudit file, so the success path is proven offline only.

## 5. Transfers on Studio Dev

`_probe_pay.py` holding 3 GEN sent 0.1 GEN with `emit_transfer(on="decided")`:
the transaction finalized, the recipient's balance moved by **0**. The runner
refuses `on="accepted"` ("invalid literal"). v1 had measured the default
(`finalized`) queued and never executed. So on Studio Dev **no** internal value
transfer is delivered, whatever the stage: v2's `withdraw()` zeroes the balance
and posts the transfer, and `get_stats.undelivered_wei` reports what the network
has not delivered.

## 6. Two behaviours of Studio Dev that shaped the scripts

- **A leader crash jams a contract's queue.** Four probe instances rendering in
  parallel produced `genvm_crash_handler` leader errors; later transactions to
  those instances stayed PENDING. Fresh instances processed in ~12 s. The probe
  driver now replaces an instance after a crash; the seed runs one transaction
  at a time per contract.
- **"FINALIZED" does not mean "applied".** A trial `file_cross_store` came back
  FINALIZED / FINISHED_WITH_RETURN with `status: OK` in the leader's return
  value — while every validator had voted `timeout` ("GenVM internal error") and
  no state was applied. The identical call 30 s later was ACCEPTED and stored.
  Every script therefore reads the chain after each write and never trusts a
  receipt's return value.
