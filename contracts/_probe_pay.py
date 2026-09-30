# v0.3.0
# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }
import genlayer as gl
from genlayer import *

# Throwaway diagnostic for the v2 milestone, NOT part of AppAudit. Does a
# pull-payment withdraw actually DELIVER on Studio Dev, and at which `on=`
# stage? v1 measured `on="finalized"` (the default) queued and never executed.


class ProbePay(gl.contract.Contract):
	last: str

	def __init__(self):
		self.last = ""

	@gl.public.write.payable
	def deposit(self) -> None:
		pass

	@gl.public.write
	def send(self, to: str, amount: int, stage: str) -> str:
		try:
			if stage == "default":
				gl.chain.Account(Address(to)).emit_transfer(u256(int(amount)))
			else:
				gl.chain.Account(Address(to)).emit_transfer(u256(int(amount)), on=stage)
			self.last = "ok " + stage
		except Exception as e:
			self.last = "err " + stage + " " + str(e)[:300]
		return self.last

	@gl.public.view
	def get_last(self) -> str:
		return self.last
