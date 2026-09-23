# v0.3.0
# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }
import genlayer as gl
from genlayer import *
from dataclasses import dataclass
import typing

# AppTrustConsumer - the block an app marketplace copies.
#
# Before listing an app, a marketplace asks AppAudit one question: has any
# privacy claim about this app been contradicted by its own store listing? This
# contract answers it with a free cross-contract read and records the listing
# decisions it made. It has no judging code, stores no verdict of its own, and
# HOLDS NO MONEY.
#
# CUSTODY: FALSE. There is not one payable method in this file and no transfer
# anywhere in it. An integration that held funds would need every one of
# AppAudit's rules over again; this one is a gate.
#
# ZERO `raise` STATEMENTS, like AppAudit. A refusal returns {"status":
# "REJECTED"} and changes nothing.
#
# WHAT COUNTS. Only FINALIZED verdicts - a verdict still inside its contest
# window can flip, and a default judgment was never a reading of the listing.
# The trust score is this marketplace's own policy, computed here from
# AppAudit's counts by integer arithmetic:
#
#     score = 70 + 10 x verified - 35 x contradicted - 5 x defaulted
#             clamped to 0..100; an app nobody has audited scores 70.

BASE_SCORE = 70
VERIFIED_BONUS = 10
CONTRADICTED_PENALTY = 35
DEFAULTED_PENALTY = 5
DEFAULT_MIN_SCORE = 50
MAX_LISTINGS = 1000


def _as_int(v: typing.Any, default: int = 0) -> int:
    if isinstance(v, bool):
        return default
    if isinstance(v, int):
        return v
    if isinstance(v, str):
        t = v.strip()
        if t != "" and t.isdigit():
            return int(t)
    return default


def _clamp(v: int, lo: int, hi: int) -> int:
    return lo if v < lo else (hi if v > hi else v)


def _short(s: typing.Any, n: int = 160) -> str:
    t = str(s)
    return t if len(t) <= n else t[:n]


def _score(counts: typing.Any) -> int:
    """The marketplace's trust policy. Pure integers, published above."""
    if not isinstance(counts, dict):
        return BASE_SCORE
    s = BASE_SCORE
    s += VERIFIED_BONUS * _as_int(counts.get("verified"), 0)
    s -= CONTRADICTED_PENALTY * _as_int(counts.get("contradicted"), 0)
    s -= DEFAULTED_PENALTY * _as_int(counts.get("defaulted"), 0)
    return _clamp(s, 0, 100)


@gl.storage.allow
@dataclass
class Listing:
    """One listing decision, copied from what AppAudit said at that moment so a
    later change of policy cannot rewrite why an app was admitted."""
    app_key: str
    decided_by: Address
    decided_at_index: u32
    listed: bool
    trust_score: u32
    contradicted: u32
    verified: u32
    reason: str


class AppTrustConsumer(gl.contract.Contract):
    owner: Address
    audit: Address
    min_score: u32
    listings: gl.storage.DynArray[Listing]
    total_listed: u256
    total_refused: u256

    def __init__(self, audit_address: str, min_score: int = DEFAULT_MIN_SCORE):
        self.owner = gl.message.sender_address
        self.audit = Address(str(audit_address).strip())
        self.min_score = u32(_clamp(_as_int(min_score, DEFAULT_MIN_SCORE),
                                    0, 100))
        self.total_listed = u256(0)
        self.total_refused = u256(0)

    def _ask(self, app_url: str) -> dict:
        """The cross-contract read, with a transport failure folded in: an
        auditor that cannot be reached is NOT an app that is clean."""
        try:
            got = gl.contract.get_at(self.audit).view().get_app_summary(
                str(app_url))
        except Exception as e:
            return {"reachable": False, "found": False,
                    "error": "AppAudit could not be read: " + _short(e)}
        if not isinstance(got, dict):
            return {"reachable": False, "found": False,
                    "error": "AppAudit returned nothing usable"}
        got["reachable"] = True
        return got

    def _decide(self, app_url: str) -> dict:
        s = self._ask(app_url)
        if not s.get("reachable"):
            return {"ok": False, "listed": False, "reason": str(s.get("error"))}
        if s.get("error"):
            return {"ok": False, "listed": False, "reason": str(s.get("error"))}
        counts = s.get("counts") if isinstance(s.get("counts"), dict) else {}
        score = _score(counts)
        contradicted = _as_int(counts.get("contradicted"), 0)
        listed = contradicted == 0 and score >= int(self.min_score)
        if contradicted > 0:
            why = ("refused: " + str(contradicted) + " privacy claim(s) about "
                   "this app were contradicted by its own store listing")
        elif score < int(self.min_score):
            why = ("refused: trust score " + str(score) + " is below this "
                   "marketplace's minimum of " + str(int(self.min_score)))
        else:
            why = ("listed: no contradicted privacy claim; trust score "
                   + str(score))
        return {"ok": True, "listed": listed, "trust_score": score,
                "contradicted": contradicted,
                "verified": _as_int(counts.get("verified"), 0),
                "app_key": str(s.get("app_key", "")),
                "badge": str(s.get("badge", "")), "reason": why}

    @gl.public.view
    def is_contradicted(self, app_url: str) -> bool:
        """Has any FINAL validator verdict found this app's listing
        contradicting a privacy claim? False when the auditor is unreachable is
        NOT safe, so integrators should prefer `check_listing`, which says
        which it was."""
        s = self._ask(app_url)
        counts = s.get("counts") if isinstance(s.get("counts"), dict) else {}
        return _as_int(counts.get("contradicted"), 0) > 0

    @gl.public.view
    def get_trust_score(self, app_url: str) -> typing.Any:
        s = self._ask(app_url)
        counts = s.get("counts") if isinstance(s.get("counts"), dict) else {}
        return {"reachable": bool(s.get("reachable")),
                "app_key": str(s.get("app_key", "")),
                "trust_score": _score(counts), "counts": counts,
                "badge": str(s.get("badge", "")),
                "policy": "70 + 10*verified - 35*contradicted - 5*defaulted, "
                          "clamped 0..100"}

    @gl.public.view
    def check_listing(self, app_url: str) -> typing.Any:
        """What `record_listing` would decide, without writing it."""
        return self._decide(app_url)

    @gl.public.write
    def record_listing(self, app_url: str) -> typing.Any:
        """Decide whether this marketplace lists the app, and record why.
        Non-payable, never raises, holds nothing."""
        if len(self.listings) >= MAX_LISTINGS:
            self.total_refused = u256(int(self.total_refused) + 1)
            return {"status": "REJECTED", "reason": "the registry is full"}
        d = self._decide(app_url)
        if not d.get("ok"):
            self.total_refused = u256(int(self.total_refused) + 1)
            return {"status": "REJECTED", "reason": str(d.get("reason"))}
        row = self.listings.append_new_get()
        row.app_key = str(d["app_key"])
        row.decided_by = gl.message.sender_address
        row.decided_at_index = u32(len(self.listings))
        row.listed = bool(d["listed"])
        row.trust_score = u32(int(d["trust_score"]))
        row.contradicted = u32(int(d["contradicted"]))
        row.verified = u32(int(d["verified"]))
        row.reason = str(d["reason"])
        if bool(d["listed"]):
            self.total_listed = u256(int(self.total_listed) + 1)
        else:
            self.total_refused = u256(int(self.total_refused) + 1)
        return {"status": "OK", "listed": bool(d["listed"]),
                "trust_score": int(d["trust_score"]),
                "reason": str(d["reason"]), "index": len(self.listings)}

    @gl.public.write
    def set_min_score(self, min_score: typing.Any) -> typing.Any:
        if gl.message.sender_address != self.owner:
            return {"status": "REJECTED", "reason": "only the owner can set "
                    "this marketplace's policy"}
        self.min_score = u32(_clamp(_as_int(min_score, DEFAULT_MIN_SCORE),
                                    0, 100))
        return {"status": "OK", "min_score": int(self.min_score)}

    @gl.public.view
    def get_listings(self) -> typing.Any:
        out = []
        for row in self.listings:
            out.append({"app_key": str(row.app_key),
                        "decided_by": row.decided_by.as_hex,
                        "listed": bool(row.listed),
                        "trust_score": int(row.trust_score),
                        "contradicted": int(row.contradicted),
                        "verified": int(row.verified),
                        "reason": str(row.reason)})
        return {"items": out, "listed": int(self.total_listed),
                "refused": int(self.total_refused)}

    @gl.public.view
    def get_config(self) -> typing.Any:
        return {"audit": self.audit.as_hex, "owner": self.owner.as_hex,
                "min_score": int(self.min_score), "custody": False,
                "payable_methods": 0,
                "policy": {"base": BASE_SCORE, "verified_bonus": VERIFIED_BONUS,
                           "contradicted_penalty": CONTRADICTED_PENALTY,
                           "defaulted_penalty": DEFAULTED_PENALTY}}
