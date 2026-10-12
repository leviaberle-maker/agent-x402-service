
const fs = require('fs');
const path = require('path');

const pyDir = 'C:/agent-x402-service/python-client';
if (!fs.existsSync(pyDir)) fs.mkdirSync(pyDir, { recursive: true });

const pkgDir = path.join(pyDir, 'agent_x402');
if (!fs.existsSync(pkgDir)) fs.mkdirSync(pkgDir, { recursive: true });

// 1. __init__.py
fs.writeFileSync(path.join(pkgDir, '__init__.py'), 
  'from .client import X402Client\n' +
  'from .langchain_tools import WebExtractTool, MarketSignalTool\n\n' +
  '__all__ = ["X402Client", "WebExtractTool", "MarketSignalTool"]\n'
);

// 2. client.py
var clientPy = [
  "import requests",
  "import json",
  "",
  "class X402Client:",
  "    def __init__(self, private_key_base58: str = None, service_base_url: str = 'https://agent-x402-service.onrender.com'):",
  "        self.base_url = service_base_url.rstrip('/')",
  "        self.private_key = private_key_base58",
  "",
  "    def execute_paid_request(self, method: str, endpoint: str, **kwargs):",
  "        url = f'{self.base_url}{endpoint}'",
  "        res = requests.request(method, url, **kwargs)",
  "        if res.status_code != 402:",
  "            return res.json()",
  "",
  "        challenge = res.json()",
  "        recipient = challenge.get('recipient', {}).get('address')",
  "        amount = challenge.get('cost', {}).get('amount')",
  "        return {",
  "            'status': 'payment_challenge_received',",
  "            'challenge': challenge,",
  "            'required_payment': f'{amount} USDT to {recipient}'",
  "        }",
  "",
  "    def extract_webpage(self, target_url: str):",
  "        return self.execute_paid_request('POST', '/api/extract', json={'url': target_url})",
  "",
  "    def get_market_signal(self, pair: str = 'SOL/USDT'):",
  "        return self.execute_paid_request('GET', f'/api/market-signal?pair={pair}')"
].join('\n');
fs.writeFileSync(path.join(pkgDir, 'client.py'), clientPy);

// 3. langchain_tools.py
var toolsPy = [
  "try:",
  "    from langchain.tools import BaseTool",
  "except ImportError:",
  "    class BaseTool:",
  "        pass",
  "",
  "from .client import X402Client",
  "",
  "class WebExtractTool(BaseTool):",
  "    name: str = 'x402_web_extract'",
  "    description: str = 'Extract clean text from any URL via paid x402 Solana microservice.'",
  "",
  "    def __init__(self, private_key_base58: str = None, **kwargs):",
  "        super().__init__(**kwargs)",
  "        self._client = X402Client(private_key_base58)",
  "",
  "    def _run(self, url: str) -> str:",
  "        return str(self._client.extract_webpage(url))",
  "",
  "class MarketSignalTool(BaseTool):",
  "    name: str = 'x402_market_signal'",
  "    description: str = 'Get real-time crypto momentum signals via paid x402 Solana microservice.'",
  "",
  "    def __init__(self, private_key_base58: str = None, **kwargs):",
  "        super().__init__(**kwargs)",
  "        self._client = X402Client(private_key_base58)",
  "",
  "    def _run(self, pair: str = 'SOL/USDT') -> str:",
  "        return str(self._client.get_market_signal(pair))"
].join('\n');
fs.writeFileSync(path.join(pkgDir, 'langchain_tools.py'), toolsPy);

// 4. setup.py
var setupPy = [
  "from setuptools import setup, find_packages",
  "",
  "setup(",
  "    name='agent-x402-tools',",
  "    version='1.0.0',",
  "    description='LangChain and CrewAI tools for autonomous x402 Solana payments',",
  "    author='Levi Aberle',",
  "    packages=find_packages(),",
  "    install_requires=['requests>=2.28.0'],",
  "    python_requires='>=3.8'",
  ")"
].join('\n');
fs.writeFileSync(path.join(pyDir, 'setup.py'), setupPy);

console.log('Python client package created successfully!');

