const axios = require('axios');
const processedSignatures = new Set();
const ACCEPTED_MINTS = {
  USDT: { mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6, symbol: 'USDT' },
  USDC: { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6, symbol: 'USDC' }
};
function createSolanaX402Middleware(options) {
  const { merchantAddress, price = 0.05, solanaRpcUrl = 'https://api.mainnet-beta.solana.com' } = options;
  return async (req, res, next) => {
    const sig = req.headers['x-payment-signature'] || req.headers['authorization']?.replace('Bearer ', '');
    if (!sig) {
      return res.status(402).json({
        status: 402,
        error: 'Payment Required',
        message: 'This autonomous endpoint requires an on-chain micropayment of ' + price + ' USDT or USDC via Solana.',
        protocol: 'x402',
        cost: { amount: price, currency: 'USD equivalent', units: Math.round(price * 1000000) },
        recipient: { address: merchantAddress, network: 'Solana (SPL)' },
        accepted_assets: [
          { symbol: 'USDT', mint: ACCEPTED_MINTS.USDT.mint, chain: 'Solana Mainnet', decimals: 6 },
          { symbol: 'USDC', mint: ACCEPTED_MINTS.USDC.mint, chain: 'Solana Mainnet', decimals: 6 }
        ],
        instructions: 'Transfer the required token amount to the recipient address and provide the transaction signature in the X-Payment-Signature header.'
      });
    }
    if (processedSignatures.has(sig)) {
      return res.status(402).json({ status: 402, error: 'Signature Already Used', message: 'This signature has already been consumed.' });
    }
    try {
      const response = await axios.post(solanaRpcUrl, {
        jsonrpc: '2.0', id: 1, method: 'getTransaction',
        params: [sig, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'confirmed' }]
      }, { timeout: 10000 });
      const tx = response.data?.result;
      if (!tx) return res.status(402).json({ status: 402, error: 'Transaction Not Found', message: 'Signature not confirmed on Solana mainnet.' });
      if (tx.meta?.err) return res.status(402).json({ status: 402, error: 'Transaction Failed', message: 'The provided transaction failed on-chain.' });
      const instructions = tx.transaction?.message?.instructions || [];
      const innerInstructions = (tx.meta?.innerInstructions || []).flatMap(i => i.instructions);
      const allInstructions = [...instructions, ...innerInstructions];
      let validPayment = false;
      const expectedUnits = Math.round(price * 1000000);
      for (const inst of allInstructions) {
        if (inst.program === 'spl-token' && (inst.parsed?.type === 'transfer' || inst.parsed?.type === 'transferChecked')) {
          const info = inst.parsed.info;
          const transferUnits = Number(info.amount || info.tokenAmount?.amount || 0);
          if (transferUnits >= expectedUnits) { validPayment = true; break; }
        }
      }
      if (!validPayment) return res.status(402).json({ status: 402, error: 'Insufficient Payment', message: 'Expected at least ' + price + ' USDT/USDC.' });
      processedSignatures.add(sig);
      req.payment = { signature: sig, amount: price };
      next();
    } catch (err) { 
      return res.status(500).json({ error: 'Verification Error', message: err.message }); 
    }
  };
}
module.exports = { createSolanaX402Middleware, ACCEPTED_MINTS };