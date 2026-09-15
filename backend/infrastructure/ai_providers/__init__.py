"""
infrastructure/ai_providers/

Concrete AIProvider adapters (domain/ai_provider.py is the port these
implement) plus the AI-vendor-specific circuit breaker. See README.md in
this directory for which providers are live vs. stubbed, and factory.py
for how the app gets a provider instance — always through get_provider(),
never by constructing a provider class directly.
"""
from infrastructure.ai_providers.factory import get_provider

__all__ = ['get_provider']
