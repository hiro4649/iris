---
name: product-change-safety
description: Use when changing product code, runtime behavior, integrations, external APIs, crypto, YouTube, voice, Live2D, persistence, package files, workflows, or security-sensitive behavior.
---

# Product Change Safety

Use this skill before product, integration, package, workflow, or security-sensitive changes.

1. Identify the product area, runtime path, external integration, and user-visible behavior affected.
2. List forbidden side effects and boundaries for the repo before editing.
3. Choose the smallest relevant verification from `AGENTS.md` or repo metadata.
4. Do not change package files or lockfiles without explicit owner scope.
5. Do not claim production, runtime, legal, deployment, or readiness approval without explicit real-evidence scope.
6. Do not expose secrets, endpoints, wallet/RPC values, private paths, raw payloads, or raw logs.
7. Report verification evidence and residual risk plainly.
