// Shipment Tracking API - zero dependencies (plain Node.js)
const http = require("http");

const PORT = process.env.PORT || 3000;
const startedAt = Date.now();
let requestCount = 0;

// In-memory "database" (swap for DynamoDB/RDS in Future Work)
const shipments = {
  "SHP1001": { status: "In Transit", origin: "Kolkata", destination: "Delhi", eta: "2 days" },
  "SHP1002": { status: "Delivered", origin: "Mumbai", destination: "Pune", eta: "-" },
  "SHP1003": { status: "Out for Delivery", origin: "Chennai", destination: "Bengaluru", eta: "today" },
};

function send(res, code, body) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  requestCount++;
  const url = new URL(req.url, `http://${req.headers.host}`);
  const log = (code) =>
    console.log(JSON.stringify({ t: new Date().toISOString(), method: req.method, path: url.pathname, status: code }));

  // Health check (used by monitoring + TTR measurement)
  if (req.method === "GET" && url.pathname === "/health") {
    log(200);
    return send(res, 200, { status: "ok", uptime_s: Math.round((Date.now() - startedAt) / 1000), requests: requestCount });
  }

  // GET /track/:id
  const m = url.pathname.match(/^\/track\/([A-Za-z0-9]+)$/);
  if (req.method === "GET" && m) {
    const s = shipments[m[1].toUpperCase()];
    if (!s) { log(404); return send(res, 404, { error: "Shipment not found" }); }
    log(200);
    return send(res, 200, { id: m[1].toUpperCase(), ...s });
  }

  // POST /track  { "id": "SHP2000", "status": "...", "origin": "...", "destination": "..." }
  if (req.method === "POST" && url.pathname === "/track") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const d = JSON.parse(body);
        if (!d.id) throw new Error("id required");
        shipments[String(d.id).toUpperCase()] = {
          status: d.status || "Created", origin: d.origin || "-", destination: d.destination || "-", eta: d.eta || "-",
        };
        log(201);
        send(res, 201, { message: "Shipment added", id: String(d.id).toUpperCase() });
      } catch (e) {
        log(400);
        send(res, 400, { error: e.message });
      }
    });
    return;
  }

  // Failure injection for the demo (simulates an application crash)
  if (req.method === "GET" && url.pathname === "/crash") {
    log(200);
    send(res, 200, { message: "Crashing on purpose..." });
    return setTimeout(() => process.exit(1), 100);
  }

  log(404);
  send(res, 404, { error: "Not found" });
});

server.listen(PORT, () => console.log(`Shipment Tracker listening on port ${PORT}`));
