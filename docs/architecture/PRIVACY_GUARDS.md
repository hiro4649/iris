# Privacy Guards

Privacy guards provide shared local helpers for memory recall, stream lifecycle reflection, and candidate review summaries.

Current helpers:

```text
inferSensitivityLevel(text)
redactSensitiveText(text)
containsPrivateSignal(text)
```

## Sensitivity Levels

```text
sensitive
private
public
low
```

Sensitive/private signals include passwords, secrets, addresses, phone numbers, email, medical details, diagnosis, real names, and common Japanese equivalents such as `住所`, `電話`, `メール`, `病気`, `診断`, `本名`, and `秘密`.

## Runtime Use

- Phase21 memory recall uses sensitivity levels before selecting read-only memory references.
- Phase26 stream lifecycle uses private-signal detection before keeping next-stream seeds.
- Candidate review queue redacts sensitive/private words from public summaries.

The guard is conservative and local. It does not replace a production privacy classifier, but it keeps the MVP from scattering ad hoc privacy checks across unrelated modules.
