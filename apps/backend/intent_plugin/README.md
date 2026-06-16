# Intent Plugin

This package isolates prompt-to-topology generation behind a small provider interface.

## Why this shape

- It is a standalone Django app.
- It exposes its own URLs under `/api/intent-plugin/`.
- The generation provider is selected with `INTENT_PLUGIN_PROVIDER`.
- The rest of the platform only sees a neutral `topology` payload.

## Current provider

The default provider is deterministic:

- `intent_plugin.providers.heuristic.HeuristicIntentProvider`

It is useful for wiring the end-to-end flow before adding an LLM-backed provider.

## Environment variables

- `INTENT_PLUGIN_ENABLED=1`
- `INTENT_PLUGIN_PROVIDER=intent_plugin.providers.heuristic.HeuristicIntentProvider`
- `INTENT_PLUGIN_DEFAULT_REGION=us-east-1`
- `INTENT_PLUGIN_MAX_WORKLOADS=6`

## Next step

Create a new provider class with `manifest()` and `generate(request)` and point
`INTENT_PLUGIN_PROVIDER` to that import path.

