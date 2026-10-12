from setuptools import setup, find_packages

setup(
    name='agent-x402-tools',
    version='1.0.0',
    description='LangChain and CrewAI tools for autonomous x402 Solana payments',
    author='Levi Aberle',
    packages=find_packages(),
    install_requires=['requests>=2.28.0'],
    python_requires='>=3.8'
)