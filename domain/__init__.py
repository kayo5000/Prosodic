"""
domain/

The innermost Clean Architecture layer — interfaces and value objects
that describe WHAT the app needs, never HOW any particular vendor or
framework provides it. Nothing in this package imports Flask, sqlite3,
anthropic, or any other framework/infrastructure dependency. If a file
in here ever needs one of those, it's in the wrong layer.

Currently home to: ai_provider.py (the AI provider port). More ports
get added here as the Clean Architecture reorg continues — this is the
first real inhabitant of the pattern, not the whole reorg finished at
once (see docs/ARCHITECTURE.md for what's done vs. still outside this
layering).
"""
