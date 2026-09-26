# AI Services (future)

This is the reserved home for the optional Gemini-based analysis layer
described in the Step 0 specification:

```text
Calculated Metrics / Business Rules
    ↓
AI Context Builder
    ↓
Gemini
    ↓
Natural-language analysis
```

Nothing is implemented here yet. Per the Step 0 spec and Step 1 scope:

- No Gemini client is configured.
- No API key is present anywhere in this repository.
- The application must remain fully usable without this layer.

When this layer is built, it should only ever _read_ already-calculated
metrics from the domain layer — it must never become a source of truth for
financial state.
