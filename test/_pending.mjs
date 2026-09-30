const r = await fetch("https://studio-dev.genlayer.com/api", { method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: process.argv[2], params: JSON.parse(process.argv[3] ?? "[]") }) });
console.log(JSON.stringify(await r.json()));
