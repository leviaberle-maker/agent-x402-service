import requests
import json

class X402Client:
    def __init__(self, private_key_base58: str = None, service_base_url: str = 'https://agent-x402-service.onrender.com'):
        self.base_url = service_base_url.rstrip('/')
        self.private_key = private_key_base58

    def execute_paid_request(self, method: str, endpoint: str, **kwargs):
        url = f'{self.base_url}{endpoint}'
        res = requests.request(method, url, **kwargs)
        if res.status_code != 402:
            return res.json()

        challenge = res.json()
        recipient = challenge.get('recipient', {}).get('address')
        amount = challenge.get('cost', {}).get('amount')
        return {
            'status': 'payment_challenge_received',
            'challenge': challenge,
            'required_payment': f'{amount} USDT to {recipient}'
        }

    def extract_webpage(self, target_url: str):
        return self.execute_paid_request('POST', '/api/extract', json={'url': target_url})

    def get_market_signal(self, pair: str = 'SOL/USDT'):
        return self.execute_paid_request('GET', f'/api/market-signal?pair={pair}')