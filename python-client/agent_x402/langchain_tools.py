try:
    from langchain.tools import BaseTool
except ImportError:
    class BaseTool:
        pass

from .client import X402Client

class WebExtractTool(BaseTool):
    name: str = 'x402_web_extract'
    description: str = 'Extract clean text from any URL via paid x402 Solana microservice.'

    def __init__(self, private_key_base58: str = None, **kwargs):
        super().__init__(**kwargs)
        self._client = X402Client(private_key_base58)

    def _run(self, url: str) -> str:
        return str(self._client.extract_webpage(url))

class MarketSignalTool(BaseTool):
    name: str = 'x402_market_signal'
    description: str = 'Get real-time crypto momentum signals via paid x402 Solana microservice.'

    def __init__(self, private_key_base58: str = None, **kwargs):
        super().__init__(**kwargs)
        self._client = X402Client(private_key_base58)

    def _run(self, pair: str = 'SOL/USDT') -> str:
        return str(self._client.get_market_signal(pair))