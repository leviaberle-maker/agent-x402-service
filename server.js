const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { createSolanaX402Middleware } = require('./solana-x402-middleware');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4020;
const KRAKEN_SOLANA_WALLET = "ByYciwFcvK6vr4WWv7tWMDfDuokoYSK45bv2AfyHKP2T";
const PRICE_USDT = 0.05; // 5 cents per request

// Configure Solana x402 payment gateway
const solanaPaymentGate = createSolanaX402Middleware({
  merchantAddress: KRAKEN_SOLANA_WALLET,
  priceUsdt: PRICE_USDT,
  rpcUrl: "https://api.mainnet-beta.solana.com"
});

// 1. Public Health & Discovery Endpoint
app.get('/', (req, res) => {
  res.json({
    name: "AgentWebExtract & Signal API",
    description: "Decentralized autonomous AI agent service providing anti-bot web scraping, structured extraction, and crypto market intelligence.",
    protocol: "x402",
    accepted_payments: [
      {
        asset: "USDT",
        network: "Solana",
        token_mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
        recipient: KRAKEN_SOLANA_WALLET,
        cost_per_call: PRICE_USDT
      }
    ],
    endpoints: {
      scrape: {
        path: "/api/v1/extract",
        method: "POST",
        description: "Extract clean readable text and structured markdown from any URL.",
        cost: "0.05 USDT"
      },
      market_intel: {
        path: "/api/v1/market-signals",
        method: "GET",
        description: "Aggregated crypto market momentum, hourly volatility, and volume indicators.",
        cost: "0.05 USDT"
      }
    }
  });
});

// 2. Monetized Service: Clean Web Extractor for AI Agents
app.post('/api/v1/extract', solanaPaymentGate, async (req, res) => {
  const { url } = req.body;

  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: "Please provide a valid http/https url parameter" });
  }

  try {
    const fetchResp = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 AgentService/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 10000
    });

    const rawHtml = fetchResp.data;
    // Strip scripts, styles, and tags for clean agent markdown consumption
    let cleanText = typeof rawHtml === 'string' ? rawHtml
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() : JSON.stringify(rawHtml);

    // Truncate to reasonable context window if huge
    const snippet = cleanText.substring(0, 15000);

    return res.json({
      status: "success",
      url: url,
      content_length: cleanText.length,
      extracted_content: snippet,
      payment_verified: req.verifiedPayment,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    return res.status(502).json({
      error: "Failed to extract target URL",
      detail: err.message,
      payment_verified: req.verifiedPayment
    });
  }
});

// 3. Monetized Service: Real-Time Market Intelligence
app.get('/api/v1/market-signals', solanaPaymentGate, async (req, res) => {
  try {
    // Query public ticker data for aggregate analysis
    const krakenResp = await axios.get("https://api.kraken.com/0/public/Ticker?pair=XBTUSD,SOLUSD,ETHUSD", { timeout: 5000 });
    const result = krakenResp.data.result;

    const btc = result.XXBTZUSD;
    const sol = result.SOLUSD;
    const eth = result.XETHZUSD;

    return res.json({
      status: "success",
      signals: {
        BTC: {
          price: Number(btc.c[0]),
          volume_24h: Number(btc.v[1]),
          vwap_24h: Number(btc.p[1]),
          high_24h: Number(btc.h[1]),
          low_24h: Number(btc.l[1]),
          spread: Number(btc.a[0]) - Number(btc.b[0])
        },
        SOL: {
          price: Number(sol.c[0]),
          volume_24h: Number(sol.v[1]),
          high_24h: Number(sol.h[1]),
          low_24h: Number(sol.l[1])
        },
        ETH: {
          price: Number(eth.c[0]),
          volume_24h: Number(eth.v[1]),
          high_24h: Number(eth.h[1]),
          low_24h: Number(eth.l[1])
        }
      },
      payment_verified: req.verifiedPayment,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    return res.status(502).json({
      error: "Failed to fetch market data",
      detail: err.message,
      payment_verified: req.verifiedPayment
    });
  }
});


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

app.listen(PORT, '0.0.0.0', () => {
  console.log("Agent x402 Payment Service running on port " + PORT);
  console.log("USDT Solana Recipient Wallet: " + KRAKEN_SOLANA_WALLET);
});

