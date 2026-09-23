#!/usr/bin/env python3
"""The rejection ledger, made mechanical.

Every pattern that has cost a previous project a rejection is a check here,
walked over the SOURCE AS SYNTAX (never grepped: this contract's own comments
mention `str.replace()` and `raise` in order to warn about them). Plus the one
check that ties the repository to the chain: the sha256 of each contract file
must equal what deployments.json recorded at deploy time.

    python3 tools/audit.py          # exit 1 on any failure
"""

import ast
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AUDIT = ROOT / "contracts" / "AppAudit.py"
CONSUMER = ROOT / "contracts" / "AppTrustConsumer.py"
SRC = AUDIT.read_text(encoding="utf8")
CSRC = CONSUMER.read_text(encoding="utf8")
TREE = ast.parse(SRC)
CTREE = ast.parse(CSRC)
DEP = json.loads((ROOT / "deployments.json").read_text())["deployments"]["studiodev"]

results = []


def check(n, name, ok, detail=""):
    results.append((n, name, bool(ok), detail))


def cls(tree, name):
    return [n for n in tree.body if isinstance(n, ast.ClassDef) and n.name == name][0]


def methods(tree, name):
    return {f.name: f for f in cls(tree, name).body if isinstance(f, ast.FunctionDef)}


def decos(fn):
    return [ast.unparse(d) for d in fn.decorator_list]


def writes(tree, name):
    return {k: f for k, f in methods(tree, name).items()
            if any(d.startswith("gl.public.write") for d in decos(f))}


def payable(tree, name):
    return sorted(k for k, f in writes(tree, name).items()
                  if any(d.endswith("payable") for d in decos(f)))


def text(fn):
    return ast.unparse(fn)


M = methods(TREE, "AppAudit")
W = writes(TREE, "AppAudit")

# 1 consensus binds all stored values: every Challenge judgment field is
#   written only inside _write_judgment, which reads only the re-derived dict.
jw = text(M["_write_judgment"])
check(1, "consensus binds every stored judgment field (written only from derive output)",
      "d[" in jw and "out.get(" not in jw and all(
          f in jw for f in ("outcome", "evidence_strength", "section_hash", "content_hash",
                            "categories_csv", "tracking_csv", "sharing_csv", "collection_csv")))
# 2 leader can't forge: _coherent recomputes via _derive and compares every field
coh = ast.unparse([n for n in TREE.body if isinstance(n, ast.FunctionDef) and n.name == "_coherent"][0])
check(2, "leader cannot forge: _coherent re-derives and compares the full vector",
      "_derive(" in coh and "VECTOR_STRS" in coh and "privacy_text" in coh)
# 3 validators compare more than the verdict
agr = ast.unparse([n for n in TREE.body if isinstance(n, ast.FunctionDef) and n.name == "_agrees"][0])
vs = [n for n in TREE.body if isinstance(n, ast.Assign) and getattr(n.targets[0], "id", "") == "VECTOR_STRS"][0]
compared = ast.literal_eval(vs.value)
check(3, "validators compare the findings vector, not just the verdict",
      len(compared) >= 8 and "section_hash" in compared and "outcome" in compared and "VECTOR_INTS" in agr,
      ", ".join(compared))
# 4 fee snapshotted
fc = text(W["file_challenge"])
check(4, "fee split, stakes, windows and fee recipient snapshotted at filing",
      all(s in fc for s in ("ch.winner_bps", "ch.protocol_bps", "ch.contest_stake_wei",
                            "ch.response_window_s", "ch.contest_window_s", "ch.stall_ttl_s",
                            "ch.fee_recipient")))
# 5 zero raise
raises = [n.lineno for n in ast.walk(TREE) if isinstance(n, ast.Raise)]
check(5, "zero raise statements in AppAudit", not raises, str(raises))
check(6, "zero raise statements in AppTrustConsumer",
      not [n for n in ast.walk(CTREE) if isinstance(n, ast.Raise)])
# 7 refund on reject: every write banks first; _refuse credits nothing
def _first(f):
    body = f.body
    if isinstance(body[0], ast.Expr) and isinstance(body[0].value, ast.Constant):
        body = body[1:]
    return ast.unparse(body[0])


first_bank = all("self._bank()" in _first(f) for f in W.values())
check(7, "refund-on-reject: every write books value to the sender first (_bank)", first_bank)
# 8 no counter before refusal
bad = []
for name, f in W.items():
    ev = []
    for sub in ast.walk(f):
        if isinstance(sub, ast.Assign):
            for t in sub.targets:
                if isinstance(t, ast.Attribute) and t.attr.startswith("total_"):
                    ev.append((sub.lineno, "c"))
        if isinstance(sub, ast.Return) and sub.value is not None and "_refuse" in ast.unparse(sub.value):
            ev.append((sub.lineno, "r"))
    ev.sort()
    seen = False
    for _, k in ev:
        if k == "c":
            seen = True
        elif seen:
            bad.append(name)
            break
check(8, "no counter moves before a refusal", not bad, ", ".join(bad))
# 9 no mutation after freeze: every mutating write goes through _live, except claims
live_users = sorted(k for k, f in W.items() if "self._live(" in text(f))
check(9, "no state mutation after a terminal status (every lifecycle write gated by _live)",
      set(live_users) >= {"respond", "judge", "default_judgment", "withdraw_challenge",
                          "contest", "settle_stalled", "finalize"}, ", ".join(live_users))
# 10 owner can't freeze funds: only file_challenge reads paused
paused_readers = sorted({k for k, f in W.items() for s in ast.walk(f)
                         if isinstance(s, ast.Attribute) and s.attr == "paused" and isinstance(s.ctx, ast.Load)})
check(10, "owner cannot freeze funds: pause gates only new filings", paused_readers == ["file_challenge"],
      ", ".join(paused_readers))
check(11, "no owner withdraw/sweep/rescue method",
      not any(k in M for k in ("withdraw", "sweep", "rescue", "drain", "emergency_withdraw")))
# 12 content hash present and covers URL + text + findings
ch_fn = ast.unparse([n for n in TREE.body if isinstance(n, ast.FunctionDef) and n.name == "_content_hash"][0])
check(12, "content hash = URL + claim + fetched privacy text + findings + verdict",
      all(s in ch_fn for s in ("'fetch_url'", "'claim'", "privacy_text", "matched", "outcome")))
# 13 settle_stalled exists and ignores paused
check(13, "settle_stalled exists and works while paused",
      "settle_stalled" in W and "paused" not in text(W["settle_stalled"]))
# 14 no str.replace
reps = [n.lineno for tree in (TREE, CTREE) for n in ast.walk(tree)
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and n.func.attr == "replace"]
check(14, "no str.replace() calls in either contract", not reps, str(reps))
# 15 conservative on unreadable
check(15, "unreadable / not-provided pages are pinned to INCONCLUSIVE with no model call",
      "CASE_UNREADABLE: 0" in SRC and "return ([V_INCONCLUSIVE], (pin, pin), (pin, pin))" in SRC)
# 16 leader-supplied non-compared fields cannot affect storage: judge re-derives
jd = text(W["judge"])
check(16, "judge stores only the re-derived record (4 chosen values in, everything else recomputed)",
      "_derive(task, out.get('page_state'), out.get('privacy_text'), out.get('outcome'), out.get('evidence_strength'))" in jd
      and "self._write_judgment(ch, d, now)" in jd)
# 17 deposit lifecycle: claim_refund + claim_payout exist; payout pays every owed party
cp = text(W["claim_payout"])
check(17, "every GEN in is withdrawable: claim_payout pays advocate, respondent and protocol; claim_refund sweeps refusals",
      "claim_refund" in W and all(s in cp for s in ("owed_advocate", "owed_respondent", "owed_protocol")))
# 18 ledger identity published
check(18, "ledger identity balance == locked + refundable published by get_stats",
      "booked == locked + refundable" in text(M["get_stats"]))
# 19 consumer custody false
check(19, "consumer: custody false, zero payable methods, no transfers",
      payable(CTREE, "AppTrustConsumer") == [] and "emit_transfer" not in CSRC)
# 20 payable set
check(20, "exactly three payable methods: file_challenge, respond, contest",
      payable(TREE, "AppAudit") == ["contest", "file_challenge", "respond"])
# 21 mutable content: canonicalised section hash compared
check(21, "mutable pages handled: canonical (sorted) section hashed and compared exactly",
      "_sorted_unique" in SRC and "section_hash" in compared)
# 22 header
lines = SRC.split("\n")
check(22, "v0.6 header: '# v0.3.0' then the pinned Depends line, then imports",
      lines[0] == "# v0.3.0" and lines[1].startswith('# { "Depends": "py-genlayer:')
      and lines[2] == "import genlayer as gl" and lines[3] == "from genlayer import *")
check(23, "runner hash pinned (no :test / :latest)",
      "py-genlayer:test" not in SRC and "py-genlayer:latest" not in SRC)
check(24, "class AppAudit(gl.contract.Contract) with gl.storage.TreeMap / DynArray",
      "class AppAudit(gl.contract.Contract)" in SRC and "gl.storage.TreeMap" in SRC and "gl.storage.DynArray" in SRC)
check(25, "time from gl.message.raw, allow-listed storage structs",
      'gl.message.raw.get("datetime"' in SRC and "@gl.storage.allow" in SRC)
# 26 transfers only in _pay, via emit_transfer
callers = sorted({f.name for f in ast.walk(TREE) if isinstance(f, ast.FunctionDef)
                  for s in ast.walk(f) if isinstance(s, ast.Call) and isinstance(s.func, ast.Attribute)
                  and s.func.attr == "emit_transfer"})
check(26, "money leaves only through _pay (emit_transfer)", callers == ["_pay"])
# 27 fee-estimable: no write both reads the clock and posts a transfer
both = [k for k, f in W.items() if "self._now()" in text(f) and ("_pay(" in text(f))]
check(27, "no write both reads the block clock and posts a transfer (Studio fee-simulator clock is stale)",
      not both, ", ".join(both))
# 28 closures don't capture self
leaks = [inner.name for f in M.values() for inner in ast.walk(f)
         if isinstance(inner, ast.FunctionDef) and inner is not f
         and "self" in {n.id for n in ast.walk(inner) if isinstance(n, ast.Name)}]
check(28, "nondet closures capture no storage (no `self`)", not leaks, ", ".join(leaks))
# 29 contest novelty
check(29, "contest evidence must be novel against claim + response + policy",
      "_novel(new_evidence, prior)" in text(W["contest"]))
# 30 one live claim per app+signature, rate limit
check(30, "duplicate live claim refused and one filing per wallet per cooldown",
      "live_claims" in fc and "last_filed_at" in fc)
# 31 source matches deployed byte-for-byte
sha = hashlib.sha256(AUDIT.read_bytes()).hexdigest()
csha = hashlib.sha256(CONSUMER.read_bytes()).hexdigest()
check(31, "AppAudit source == deployed (sha256, canonical + demo)",
      DEP["AppAudit"]["source_sha256"] == sha and DEP["AppAuditDemo"]["source_sha256"] == sha, sha[:16])
check(32, "AppTrustConsumer source == deployed (sha256)",
      DEP["AppTrustConsumer"]["source_sha256"] == csha, csha[:16])
check(33, "canonical instance enforces the brief (0.5 / 0.3 GEN, 48h, 24h, 48h, 300s)",
      DEP["AppAudit"]["min_stake_wei"] == str(5 * 10 ** 17)
      and DEP["AppAudit"]["contest_stake_wei"] == str(3 * 10 ** 17)
      and DEP["AppAudit"]["response_window_s"] == 172800 and DEP["AppAudit"]["contest_window_s"] == 86400
      and DEP["AppAudit"]["stall_ttl_s"] == 172800 and DEP["AppAudit"]["file_cooldown_s"] == 300)

width = max(len(r[1]) for r in results)
for n, name, ok, detail in results:
    print(("  ✔ " if ok else "  ✘ ") + str(n).rjust(2) + "  " + name.ljust(width) + ("   " + detail if detail and not ok else ""))
failed = [r for r in results if not r[2]]
print("\n" + str(len(results) - len(failed)) + "/" + str(len(results)) + " checks pass")
sys.exit(1 if failed else 0)
