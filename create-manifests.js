
const fs = require('fs');

const x402Manifest = {
  "$schema": "https://x402.org/schema/v1.json",
  "name": "AgentWebExtract and Signal API",
  "description": "Autonomous AI agent microservice providing clean web content extraction and crypto technical signals via x402 payment protocol.",
  "version": "1.0.0",
  "url": "https://agent-x402-service.onrender.com",
  "openapi": "https://agent-x402-service.onrender.com/openapi.json",
  "author": "Levi Aberle",
  "repository": "https://github.com/leviaberle-maker/agent-x402-service",
  "payment": {
    "protocol": "x402",
    "version": "1.0",
    "schemes": [
      {
        "type": "crypto",
        "network": "solana",
        "asset": "USDT",
        "mint": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
        "recipient": "ByYciwFcvK6vr4WWv7tWMDfDuokoYSK45bv2AfyHKP2T",
        "decimals": 6,
        "default_cost": "0.05"
      }
    ]
  },
  "endpoints": [
    {
      "path": "/api/extract",
      "method": "POST",
      "summary": "AI web scraping and clean markdown extraction",
      "pricing": {
        "amount": "0.05",
        "asset": "USDT",
        "network": "solana"
      }
    },
    {
      "path": "/api/market-signal",
      "method": "GET",
      "summary": "Real-time crypto momentum and technical sentiment analysis",
      "pricing": {
        "amount": "0.05",
        "asset": "USDT",
        "network": "solana"
      }
    }
  ]
};

const agentManifest = {
  "name": "agent-web-extract-signals",
  "version": "1.0.0",
  "description": "Autonomous microservice offering anti-bot web scraping and real-time crypto technical signals.",
  "endpoint": "https://agent-x402-service.onrender.com",
  "frameworks": ["langchain", "crewai", "autonolas", "x402"],
  "pricing": {
    "model": "per_call",
    "currency": "USDT",
    "network": "solana",
    "rate": 0.05,
    "destination": "ByYciwFcvK6vr4WWv7tWMDfDuokoYSK45bv2AfyHKP2T"
  },
  "capabilities": [
    "web_scraping",
    "markdown_extraction",
    "crypto_signals",
    "market_analysis"
  ],
  "contact": {
    "repository": "https://github.com/leviaberle-maker/agent-x402-service"
  }
};

fs.writeFileSync('C:/agent-x402-service/x402.json', JSON.stringify(x402Manifest, null, 2), 'utf8');
fs.writeFileSync('C:/agent-x402-service/agent.json', JSON.stringify(agentManifest, null, 2), 'utf8');

let serverJs = fs.readFileSync('C:/agent-x402-service/server.js', 'utf8');
if (!serverJs.includes('x402.json')) {
  const routes = [
    "// Standardized Agent & x402 Discovery Manifests",
    "app.get(['/x402.json', '/.well-known/x402.json'], (req, res) => {",
    "  res.sendFile(require('path').join(__dirname, 'x402.json'));",
    "});",
    "",
    "app.get(['/agent.json', '/.well-known/agent.json'], (req, res) => {",
    "  res.sendFile(require('path').join(__dirname, 'agent.json'));",
    "});",
    ""
  ].join('\n');

  serverJs = serverJs.replace("app.get('/', (req, res) => {", routes + "\napp.get('/', (req, res) => {");
  fs.writeFileSync('C:/agent-x402-service/server.js', serverJs, 'utf8');
  console.log('server.js updated successfully');
} else {
  console.log('server.js already contains manifest routes');
}
console.log('Manifests written successfully');

