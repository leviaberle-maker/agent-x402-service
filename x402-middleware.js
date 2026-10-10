const { ethers } = require('ethers');

// Minimal ERC20 ABI to inspect Transfer events
const ERC20_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

// In-memory set of used transaction hashes to prevent replay attacks
const processedTransactions = new Set();

function createX402Middleware(config) {
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const merchantAddress = config.merchantAddress.toLowerCase();
  const usdcAddress = config.usdcAddress.toLowerCase();
  const expectedAmountUnits = BigInt(config.priceUnits);

  return async function x402Middleware(req, res, next) {
    // Check for payment transaction hash in custom header or auth header
    const txHash = req.headers['x-payment-tx-hash'] || req.headers['x-402-payment'];

    if (!txHash) {
      // Return HTTP 402 Payment Required with machine-readable payment instructions
      return res.status(402).json({
        error: "Payment Required",
        protocol: "x402/1.0",
        pricing: {
          asset: "USDC",
          amount: config.priceUsdc,
          amount_units: config.priceUnits,
          decimals: 6,
          chain: "Base Mainnet",
          chain_id: config.chainId
        },
        recipient: {
          address: config.merchantAddress,
          token_contract: config.usdcAddress
        },
        instructions: "Transfer the specified USDC amount on Base to recipient.address. Then retry this request including the transaction hash in the 'X-Payment-Tx-Hash' header."
      });
    }

    // Verify transaction format
    if (!/^0x([A-Fa-f0-9]{64})$/.test(txHash)) {
      return res.status(400).json({ error: "Invalid transaction hash format" });
    }

    // Prevent replay
    if (processedTransactions.has(txHash.toLowerCase())) {
      return res.status(409).json({ error: "Transaction hash has already been redeemed" });
    }

    try {
      // Query on-chain transaction receipt from Base RPC
      const receipt = await provider.getTransactionReceipt(txHash);

      if (!receipt) {
        return res.status(402).json({
          error: "Transaction not found or pending",
          tx_hash: txHash,
          instructions: "Wait for transaction to confirm on Base, then retry."
        });
      }

      if (receipt.status !== 1) {
        return res.status(402).json({
          error: "Transaction reverted on-chain",
          tx_hash: txHash
        });
      }

      // Check if receipt contains a Transfer event on the USDC contract to our merchant wallet
      let validPaymentFound = false;
      let actualValueTransferred = 0n;

      const usdcInterface = new ethers.Interface(ERC20_ABI);

      for (const log of receipt.logs) {
        if (log.address.toLowerCase() === usdcAddress) {
          try {
            const parsed = usdcInterface.parseLog(log);
            if (parsed && parsed.name === 'Transfer') {
              const to = parsed.args[1].toLowerCase();
              const value = BigInt(parsed.args[2]);

              if (to === merchantAddress) {
                actualValueTransferred += value;
                if (actualValueTransferred >= expectedAmountUnits) {
                  validPaymentFound = true;
                  break;
                }
              }
            }
          } catch (e) {
            // Ignore non-matching event logs
          }
        }
      }

      if (!validPaymentFound) {
        return res.status(402).json({
          error: "Payment verification failed",
          detail: `Transaction did not contain an eligible USDC transfer of at least ${config.priceUsdc} USDC to ${config.merchantAddress}`,
          tx_hash: txHash
        });
      }

      // Mark transaction as redeemed
      processedTransactions.add(txHash.toLowerCase());
      req.verifiedPayment = {
        txHash,
        paidUnits: actualValueTransferred.toString(),
        payer: receipt.from
      };

      // Proceed to the core monetized service
      next();

    } catch (err) {
      console.error("Payment verification error:", err.message);
      return res.status(500).json({
        error: "Internal error verifying on-chain payment",
        message: err.message
      });
    }
  };
}

module.exports = { createX402Middleware };

