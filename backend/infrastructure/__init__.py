"""
infrastructure/

The outermost-but-one Clean Architecture layer — concrete implementations
of domain/ ports (databases, external APIs, framework-specific plumbing).
Depends inward on domain/, never the other way. api.py (routes) depends
on this layer; this layer never depends back on api.py.

Currently home to: ai_providers/ (the AI vendor adapters). More
infrastructure gets organized here as the Clean Architecture reorg
continues.
"""
