# v0.3.0
# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }
import genlayer as gl
from genlayer import *

import json
import re


def _digest(html):
	out = []
	for m in re.finditer(r'<meta[^>]+(?:property|name)="(og:title|og:url|author)"[^>]*content="([^"]*)"', html):
		out.append("META " + m.group(1) + " = " + m.group(2))
	for m in re.finditer(r'<a([^>]*)href="(https?://[^"]*)"([^>]*)>(.{0,400}?)</a>', html, re.S):
		inner = re.sub(r'<[^>]+>', ' ', m.group(4))
		inner = " ".join(inner.split())[:80]
		attrs = (m.group(1) + m.group(3))
		al = re.search(r'aria-label="([^"]*)"', attrs)
		out.append("A " + m.group(2)[:200] + " :: " + inner + ((" [aria " + al.group(1) + "]") if al else ""))
	return "\n".join(out)

# Throwaway diagnostic for the v2 milestone, NOT part of AppAudit. Measures
# what a validator sees for: a text render, an html render, and a plain GET
# (status + body), so the v2 extractors are written against real bytes.


class ProbeV2(gl.contract.Contract):
	pages: gl.storage.TreeMap[str, str]
	metas: gl.storage.TreeMap[str, str]

	def __init__(self):
		pass

	@gl.public.write
	def probe(self, url: str, mode: str) -> None:
		target = str(url)
		how = str(mode)

		def leader_fn() -> dict:
			try:
				if how == "get":
					r = gl.nondet.web.get(target)
					body = r.body if r.body is not None else b""
					txt = body.decode("utf-8", errors="replace")
					if "<html" in txt[:3000].lower():
						txt2 = _digest(txt)
					else:
						txt2 = txt
					return {"ok": True, "text": txt2[:90000], "len": len(txt), "status": int(r.status), "err": ""}
				txt = str(gl.nondet.web.render(target, mode=how, wait_after_loaded="3s"))
				if how == "html":
					return {"ok": True, "text": _digest(txt)[:90000], "len": len(txt), "status": 0, "err": ""}
				return {"ok": True, "text": txt[:90000], "len": len(txt), "status": 0, "err": ""}
			except Exception as e:
				return {"ok": False, "text": "", "len": 0, "status": -1, "err": str(e)[:600]}

		def validator_fn(leader_result) -> bool:
			return isinstance(leader_result, gl.vm.Return)

		res = gl.vm.run_nondet(leader_fn, validator_fn)
		key = how + "|" + target
		self.pages[key] = str(res.get("text", ""))
		self.metas[key] = json.dumps({"len": res.get("len", 0), "status": res.get("status", 0), "err": res.get("err", "")})

	@gl.public.view
	def window(self, key: str, start: int, count: int) -> str:
		t = self.pages.get(str(key)) or ""
		return json.dumps({"meta": self.metas.get(str(key)) or "", "stored": len(t),
			"text": t[int(start):int(start) + int(count)]})
