# AppAudit — design notes

The contract documents its rules where they live. This file is for the
reasoning: choices made against an alternative, and the hazards a reader will
otherwise rediscover.

## 1. Why a bracket, and why silence pins to INCONCLUSIVE

A store listing is a **self-declaration**. When it declares a data type, that
is the developer's own admission and strong evidence. When it says nothing,
that is not evidence that the app does not handle the data, and it is not
evidence that it does. So the contract classifies the evidence into a case
before any model sees it:

| case | meaning | allowed verdicts | strength |
|---|---|---|---|
| DIRECT | claimed type declared on the claimed axis | the matching verdict or INCONCLUSIVE | 6–7 (5–6 on an analogue axis) / 3–4 |
| EXPLICIT_NONE | listing states nothing collected/shared on that axis | the mirror verdict or INCONCLUSIVE | 5–6 / 2–3 |
| ELSEWHERE | type declared, but on another axis | INCONCLUSIVE only | 2, no model |
| ABSENT | type never mentioned | INCONCLUSIVE only | 1, no model |
| UNREADABLE | no privacy section / no details provided | INCONCLUSIVE only | 0, no model |

A leader cannot call a silent listing "contradicted". The model's job is the
part that has no closed form: qualifiers ("precise" vs "approximate"), a
defence that reframes the claim, a contest's new evidence.

## 2. Why every strength range is exactly two wide

The strength is compared with a tolerance of one bucket. With a range three
wide, two validators who agree on the verdict could still be two apart and
refuse each other. At two wide, agreement on the verdict implies agreement on
the strength, so the only thing that can stop an honest round settling is a
genuine disagreement about the verdict. (`TestAgrees.test_every_range_is_two_wide`.)

## 3. Canonical text, not raw text

Google Play reorders data-safety entries on every render (docs/PROBE.md §3).
The first live judgment failed for exactly this reason. The section is parsed
into entries, sorted within each group, and the hash is taken over that form.
The same declaration always yields the same bytes; a changed declaration never
does. `|` inside page text is replaced before canonicalising so a category name
cannot forge a field.

## 4. The two axis substitutions

Google Play publishes no tracking declaration, and the App Store publishes no
separate sharing declaration. Tracking claims on Play use Play's *shared* list;
sharing claims on the App Store use Apple's *tracking* list ("data used to
track you across apps and websites owned by other companies"). Both are the
closest thing each store publishes, both are disclosed in the finding's
reason, and both narrow the polar strength range by one.

## 5. Why `finalize` is not inside `claim_payout`

Studio's fee simulator runs on a stale block clock (~664 days behind, measured
by GrantJudge). A write that reads the clock AND posts a transfer is simulated
on the wrong side of its own time gate, budgets no message fee, and reverts.
`finalize` reads the clock and moves nothing; `claim_payout` moves money and
reads no clock. The first seed run would have hit this on its first claim; it
was caught before that claim was sent.

## 6. The contest cannot flip on an unreadable page

If a contest re-read finds the page unreadable, the contest is "unheard": the
stake stays on the contester's refund ledger and the verdict stands.
Otherwise a developer could delete their listing and contest a CONTRADICTED
verdict into INCONCLUSIVE. An original judgment on an unreadable page is
INCONCLUSIVE with both stakes back, which is the conservative direction.

## 7. What a default is not

A default judgment reads no listing. The advocate is refunded in full (there
is no respondent stake to split, so no fee), and the app's record counts it as
a default, never as a contradiction. The consumer contract docks 5 points for
a default and 35 for a final contradiction.

## 8. Hazards inherited

- The runner header is exactly two comment lines; nothing may sit between
  line 1 and the imports.
- `emit_transfer` on `gl.chain.Account` is the spelling that pays.
- A nondet closure that captures `self` pickles storage; `_facts` is the one
  boundary where plain values are copied out.
- `str.replace()` is rejected by the runner; `_no_bar` rebuilds strings by hand.
- `TreeMap[key]` on a missing key raises; `get_or_insert_default` inserts.
- The runner pin in the brief (`…fyey1s9qg2qng`) was missing its middle
  segment; the full hash `…fyey1s9qz928sz2nbrd9mg4sxqg2qng` is the one every
  previous studio-dev deploy used.
