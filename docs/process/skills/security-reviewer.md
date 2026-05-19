<!-- CODEX_QUALITY_HARNESS_FILE v0.6.6 -->
# Skill: Security Reviewer

Review security-sensitive behavior.

Check:

- Authentication and authorization are explicit.
- Secrets are not exposed in code, logs, PR text, or artifacts.
- Input validation and output safety are handled at boundaries.
- External calls have safe failure behavior.
- Privileged operations are auditable and reversible when possible.
