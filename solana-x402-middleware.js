const axios = require('axios');

const processedSignatures = new Set();
const USDT_SOLANA_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";

function createSolanaX402Middleware(config) {
  const rpcUrl = config.rpcUrl || "https://api.mainnet-beta.solana.com";
  const merchantAddress = config.merchantAddress;
  const expectedAmount = Number(config.priceUsdt || 0.05);

  return async function solanaX402Middleware(req, res, next) {
    const signature = req.headers['x-payment-signature'] || 
                      req.headers['x-payment-tx-hash'] || 
                      req.headers['x-402-payment'];

    if (!signature) {
      return res.status(402).json({
        error: "Payment Required",
        protocol: "x402/solana",
        pricing: {
          asset: "USDT",
          amount: expectedAmount,
          token_mint: USDT_SOLANA_MINT,
          chain: "Solana Mainnet",
          decimals: 6
        },
        recipient: {
          address: merchantAddress,
          network: "Solana (SPL)"
        },
        instructions: "Transfer " + expectedAmount + " USDT (SPL) on Solana to " + merchantAddress + ". Then include the transaction signature in the 'X-Payment-Signature' header."
      });
    }

    if (processedSignatures.has(signature)) {
      return res.status(409).json({ error: "Transaction signature has already been redeemed" });
    }

    try {
      const response = await axios.post(rpcUrl, {
        jsonrpc: "2.0",
        id: 1,
        method: "getTransaction",
        params: [
          signature,
          {
            encoding: "jsonParsed",
            maxSupportedTransactionVersion: 0,
            commitment: "confirmed"
          }
        ]
      }, { timeout: 10000 });

      if (response.data.error) {
        return res.status(402).json({
          error: "Invalid or unrecognized Solana transaction signature",
          detail: response.data.error.message,
          signature: signature
        });
      }

      const txData = response.data.result;

      if (!txData) {
        return res.status(402).json({
          error: "Transaction not found or unconfirmed on Solana",
          signature: signature,
          instructions: "Transaction must be confirmed on Solana mainnet before calling this endpoint."
        });
      }

      if (txData.meta && txData.meta.err !== null) {
        return res.status(402).json({
          error: "Transaction failed/reverted on Solana",
          signature: signature
        });
      }

      let paymentVerified = false;
      let transferredAmount = 0;

      const instructions = txData.transaction.message.instructions || [];
      const innerInstructions = (txData.meta.innerInstructions || []).flatMap(i => i.instructions || []);
      const allInstructions = [...instructions, ...innerInstructions];

      for (const ix of allInstructions) {
        if (ix.program === "spl-token" || (ix.parsed && ix.parsed.type)) {
          const parsed = ix.parsed;
          if (parsed && (parsed.type === "transfer" || parsed.type === "transferChecked")) {
            const info = parsed.info;
            if (info.destination === merchantAddress || info.owner === merchantAddress || info.wallet === merchantAddress) {
              const amount = Number(info.tokenAmount ? info.tokenAmount.uiAmount : (info.amount / 1e6));
              if (amount >= expectedAmount) {
                paymentVerified = true;
                transferredAmount = amount;
                break;
              }
            }
          }
        }
      }

      if (!paymentVerified && txData.meta.postTokenBalances) {
        for (const post of txData.meta.postTokenBalances) {
          if (post.mint === USDT_SOLANA_MINT && (post.owner === merchantAddress || post.accountIndex !== undefined)) {
            const pre = (txData.meta.preTokenBalances || []).find(p => p.accountIndex === post.accountIndex);
            const preAmount = pre ? (pre.uiTokenAmount.uiAmount || 0) : 0;
            const postAmount = post.uiTokenAmount.uiAmount || 0;
            const diff = postAmount - preAmount;
            if (diff >= expectedAmount * 0.99) {
              paymentVerified = true;
              transferredAmount = diff;
              break;
            }
          }
        }
      }

      if (!paymentVerified) {
        return res.status(402).json({
          error: "Payment verification failed",
          detail: "Transaction did not contain an eligible transfer of at least " + expectedAmount + " USDT to " + merchantAddress,
          signature: signature
        });
      }

      processedSignatures.add(signature);
      req.verifiedPayment = {
        signature: signature,
        amount: transferredAmount,
        asset: "USDT",
        network: "Solana"
      };

      next();

    } catch (err) {
      console.error("Solana verification error:", err.message);
      return res.status(502).json({
        error: "Network error verifying Solana payment with RPC",
        message: err.message
      });
    }
  };
}

module.exports = { createSolanaX402Middleware };

