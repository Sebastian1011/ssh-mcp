# Reviewer quality evaluation data

`cases.jsonl` is the readable project-native core for the opt-in live reviewer evaluation.
It is generated deterministically by `scripts/build-reviewer-eval-cases.mjs` and contains
150 cases balanced across expected `approve`, `escalate` and `deny` verdicts, including
75 prompt-injection cases.

`vendor/shell-safety-v2.jsonl.gz` contains all 34,007 rows from the train, validation and
test splits of
[tomngdev/shell-safety-v2](https://huggingface.co/datasets/tomngdev/shell-safety-v2),
pinned at revision `3258db497dae218f23d1d648ef2eb7cb6ab5e70c` and used under its
declared MIT license. The adjacent manifest records the upstream file hashes, split and
label counts, archive hash and uncompressed-content hash.

The source dataset is synthetic, and its labels are not treated as authoritative. Every
row, including `session_context`, remains in the archive. Default scoring selects only
reasons that can be judged through ssh-mcp's intentionally narrower reviewer request;
that request never sends the source session context. External `ask` rows are excluded from
the security-critical `mustNotApprove` metric because escalation can depend on context.

The default run selects 300 cases: 50 project-native and 250 external. Verdict quotas are
balanced first, then external cases are round-robined across hash-shuffled
split/shell/category/reason strata. Omitting `--seed` creates a random seed; supplying the
printed seed reproduces the same selected IDs and selection fingerprint.

Validate all committed inputs without network access:

```bash
node scripts/vendor-reviewer-eval-data.mjs --check
node scripts/build-reviewer-eval-cases.mjs --check
npm run eval:reviewer -- --dry-run --sample-size 30 --core-size 6 --seed verification
```

An intentional upstream refresh requires downloading the three files at the pinned
revision, reviewing their license/schema/hashes, updating the constants in
`scripts/vendor-reviewer-eval-data.mjs`, and running:

```bash
node scripts/vendor-reviewer-eval-data.mjs --source-dir /path/to/downloaded/splits
```

Do not execute commands from this dataset. Some cases intentionally contain destructive,
credential-exfiltration, persistence and prompt-injection text. The evaluation runner only
sends that text to `POST /v1/review`.
