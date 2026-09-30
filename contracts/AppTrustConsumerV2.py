# v0.3.0
# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }
import genlayer as gl
from genlayer import *
from dataclasses import dataclass
import typing

# AppTrustConsumerV2 - the block an app marketplace copies, reading AppAudit v2.
#
# Before listing an app, a marketplace asks one question: what is this app's
# record? `app_record(app)` answers with a free cross-contract read of
# AppAuditV2: how many FINAL verdicts were CONTRADICTED, CLAIM_VERIFIED,
# CORRECTED and INCONCLUSIVE, whether the listing has a verified developer, and
# when its label was last snapshotted. This contract judges nothing, stores no
# verdict of its own and HOLDS NO MONEY.
#
# CUSTODY: FALSE. Not one payable method, no transfer anywhere, zero `raise`.
#
# WHAT COUNTS. Only FINALIZED verdicts (AppAuditV2 counts them that way): a
# verdict inside its contest window can flip.
#
# The trust score is this marketplace's own policy, integer arithmetic:
#
#     score = 70 + 10 x verified - 35 x contradicted - 10 x corrected
#             + 5 if the listing has a verified developer
#             clamped to 0..100; an app nobody has audited scores 70.
#
# CORRECTED costs less than CONTRADICTED: the developer fixed the declaration
# after an advocate proved it wrong, which is better than never fixing it and
# worse than never being wrong.

BASE_SCORE = 70
VERIFIED_BONUS = 10
CONTRADICTED_PENALTY = 35
CORRECTED_PENALTY = 10
DEVELOPER_BONUS = 5
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


def _score(rec: typing.Any) -> int:
    """The marketplace's trust policy. Pure integers, published above."""
    if not isinstance(rec, dict):
        return BASE_SCORE
    s = BASE_SCORE
    s += VERIFIED_BONUS * _as_int(rec.get("verified"), 0)
    s -= CONTRADICTED_PENALTY * _as_int(rec.get("contradicted"), 0)
    s -= CORRECTED_PENALTY * _as_int(rec.get("corrected"), 0)
    if rec.get("verified_developer") is True:
        s += DEVELOPER_BONUS
    return _clamp(s, 0, 100)


@gl.storage.allow
@dataclass
class Listing:
    """One listing decision, copied from what AppAudit v2 said at that moment
    so a later change of policy cannot rewrite why an app was admitted."""
    app_key: str
    decided_by: Address
    listed: bool
    trust_score: u32
    contradicted: u32
    verified: u32
    corrected: u32
    verified_developer: bool
    reason: str


class AppTrustConsumerV2(gl.contract.Contract):
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
            got = gl.contract.get_at(self.audit).view().app_record(str(app_url))
        except Exception as e:
            return {"reachable": False, "error": "AppAudit v2 could not be "
                    "read: " + _short(e)}
        if not isinstance(got, dict):
            return {"reachable": False,
                    "error": "AppAudit v2 returned nothing usable"}
        got["reachable"] = True
        return got

    @gl.public.view
    def app_record(self, app_url: str) -> typing.Any:
        """The app's record: final verdict counts, verified-developer flag and
        last snapshot time, exactly as AppAudit v2 reports them."""
        r = self._ask(app_url)
        if not r.get("reachable") or r.get("error"):
            return {"reachable": bool(r.get("reachable")), "found": False,
                    "error": str(r.get("error", ""))}
        return {
            "reachable": True,
            "found": bool(r.get("found")),
            "app_key": str(r.get("app_key", "")),
            "contradicted": _as_int(r.get("contradicted"), 0),
            "verified": _as_int(r.get("verified"), 0),
            "corrected": _as_int(r.get("corrected"), 0),
            "inconclusive": _as_int(r.get("inconclusive"), 0),
            "verified_developer": r.get("verified_developer") is True,
            "developer_wallet": str(r.get("developer_wallet", "")),
            "last_snapshot_at": _as_int(r.get("last_snapshot_at"), 0),
            "snapshots": _as_int(r.get("snapshots"), 0),
            "trust_score": _score(r),
        }

    @gl.public.view
    def is_contradicted(self, app_url: str) -> bool:
        """Has a FINAL verdict found this app's declarations contradicting
        themselves or a claim, and never fixed? False when unreachable is NOT
        safe; prefer check_listing, which says which it was."""
        r = self._ask(app_url)
        return _as_int(r.get("contradicted"), 0) > 0

    def _decide(self, app_url: str) -> dict:
        r = self._ask(app_url)
        if not r.get("reachable") or r.get("error"):
            return {"ok": False, "listed": False,
                    "reason": str(r.get("error", "unreachable"))}
        score = _score(r)
        contradicted = _as_int(r.get("contradicted"), 0)
        listed = contradicted == 0 and score >= int(self.min_score)
        if contradicted > 0:
            why = ("refused: " + str(contradicted) + " final CONTRADICTED "
                   "verdict(s) against this app")
        elif score < int(self.min_score):
            why = ("refused: trust score " + str(score) + " is below this "
                   "marketplace's minimum of " + str(int(self.min_score)))
        else:
            why = "listed: no CONTRADICTED verdict; trust score " + str(score)
        return {"ok": True, "listed": listed, "trust_score": score,
                "contradicted": contradicted,
                "verified": _as_int(r.get("verified"), 0),
                "corrected": _as_int(r.get("corrected"), 0),
                "verified_developer": r.get("verified_developer") is True,
                "app_key": str(r.get("app_key", "")), "reason": why}

    @gl.public.view
    def check_listing(self, app_url: str) -> typing.Any:
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
        row.listed = bool(d["listed"])
        row.trust_score = u32(int(d["trust_score"]))
        row.contradicted = u32(int(d["contradicted"]))
        row.verified = u32(int(d["verified"]))
        row.corrected = u32(int(d["corrected"]))
        row.verified_developer = bool(d["verified_developer"])
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
                        "corrected": int(row.corrected),
                        "verified_developer": bool(row.verified_developer),
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
                           "corrected_penalty": CORRECTED_PENALTY,
                           "developer_bonus": DEVELOPER_BONUS}}
