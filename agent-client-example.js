/**
 * Agent Caller Reference Client
 * Demonstrates how an external autonomous AI agent discovers, pays, and consumes the service.
 */
const axios = require('axios');

const SERVICE_BASE_URL = "http://127.0.0.1:4020";

async function runAgentClient() {
  console.log("1. Querying Service Discovery Endpoint...");
  const discovery = await axios.get(SERVICE_BASE_URL + "/");
  console.log("Service Discovered:", discovery.data.name);
  console.log("Accepted Payments:", discovery.data.accepted_payments);

  console.log("\n2. Attempting to consume market intelligence without payment...");
  try {
    await axios.get(SERVICE_BASE_URL + "/api/v1/market-signals");
  } catch (err) {
    if (err.response && err.response.status === 402) {
      console.log("Received Expected HTTP 402 Payment Required!");
      console.log("Payment Details Returned to Agent:");
      console.log(JSON.stringify(err.response.data, null, 2));
      
      console.log("\n3. Autonomous Agent Flow:");
      console.log("- Agent reads recipient wallet: " + err.response.data.recipient.address);
      console.log("- Agent reads price: " + err.response.data.pricing.amount + " " + err.response.data.pricing.asset);
      console.log("- Agent signs and broadcasts SPL transfer on Solana via its local wallet.");
      console.log("- Agent receives transaction signature, sets 'X-Payment-Signature: <sig>', and repeats the request.");
      console.log("- Server validates the transaction on Solana mainnet and releases the market signals / extracted data.");
    } else {
      console.error("Unexpected error:", err.message);
    }
  }
}

runAgentClient().catch(console.error);

