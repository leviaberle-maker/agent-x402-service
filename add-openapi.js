const fs = require('fs');
let content = fs.readFileSync('C:\\agent-x402-service\\server.js', 'utf8');

const openApiCode = `
// OpenAPI 3.0 Machine Discovery Specification
app.get('/openapi.json', (req, res) => {
  res.json({
    openapi: "3.0.3",
    info: {
      title: "AgentWebExtract and Crypto Signal API",
      version: "1.0.0",
      description: "Decentralized autonomous AI agent utility providing web extraction and real-time market signals gated by Solana x402 USDT micropayments."
    },
    servers: [
      { url: "http://127.0.0.1:4020", description: "Local Service Engine" }
    ],
    paths: {
      "/api/v1/extract": {
        post: {
          summary: "Extract clean readable text and markdown from web pages",
          operationId: "extractWebContent",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { url: { type: "string", format: "uri" } },
                  required: ["url"]
                }
              }
            }
          },
          responses: {
            "200": { description: "Clean structured content extracted successfully" },
            "402": { description: "Payment Required - 0.05 USDT on Solana" }
          }
        }
      },
      "/api/v1/market-signals": {
        get: {
          summary: "Get multi-pair crypto market telemetry, spreads, and volume",
          operationId: "getMarketSignals",
          responses: {
            "200": { description: "Real-time market signals for BTC, ETH, SOL" },
            "402": { description: "Payment Required - 0.05 USDT on Solana" }
          }
        }
      }
    }
  });
});
`;

if (!content.includes('/openapi.json')) {
  content = content.replace("app.listen(PORT", openApiCode + "\napp.listen(PORT");
  fs.writeFileSync('C:\\agent-x402-service\\server.js', content, 'utf8');
  console.log("OpenAPI endpoint successfully added to server.js");
} else {
  console.log("OpenAPI endpoint already present");
}

