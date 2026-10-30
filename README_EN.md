**中文** · [README.md](./README.md)

<p align="center">
  <a href="https://github.com/huanweide/family-showcase"><img src="https://img.shields.io/badge/Engineering%20Health%20Family-18%20axes-22c55e" alt="Engineering Health Family"></a>
  <a href="https://github.com/huanweide/track-capped/stargazers"><img src="https://img.shields.io/github/stars/huanweide/track-capped" alt="Stars"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/huanweide/track-capped" alt="License"></a>
</p>

# track-capped · Engineering Health Family capstone portal generator

> The "capstone" portal generator for the **Engineering Health Family** (a collection of zero-dependency code-checkup tools) — "capstone" because the family's checkup tools have already covered the main dimensions, and this tool aggregates the archived members into one offline-browsable navigation portal.

Zero-dependency, single-file Node CLI. It scans your locally archived Engineering Health Family directory and dynamically generates a **self-contained** navigation portal HTML (family map + decision tree + archived list + list self-check badge).

The data comes from the real archive on your disk, not from hardcoded showcase data — re-run it and the portal updates.

- Zero-dependency / zero-network / zero-config, pure read-only `fs`.
- Single-file HTML artifact, **zero external requests** (no CDN / remote fonts / external scripts — CI asserts this line).
- Cross-platform: verified on both Linux and Windows CI.

## Quick start

Zero-dependency, no install, just run:

```bash
node index.js ./family-archive                    # generate ./family-archive/_family-portal.html
node index.js --root ./family-archive --out portal.html
node index.js --check                      # family-list self-check (for CI gate)
node index.js --root ./family-archive --json      # output only the scan-result JSON
node index.js --help
```

Each subdirectory under the scan root is treated as one family project: it reads its `README.md` for the title and first-paragraph description, checks whether it has an `index.js` / `index.html` entry, and classifies it by a built-in governance-layer table.

## Who should use this

- You keep a local archive of the Engineering Health Family tools and want a single offline portal to navigate them.
- You want a self-contained HTML (no external requests) you can open anywhere, including CI artifacts.

## Who should NOT use this

- You want a live, auto-updating public website — this generates a static file from a local directory; re-run it to refresh.
- You are not working with the Engineering Health Family toolset — the classification and decision tree are family-specific.

## Parameters

| Parameter | Description |
| --- | --- |
| `root` / `--root <dir>` | The archived directory to scan (defaults to the current working directory). Exit code `2` if it does not exist or is not a directory |
| `--out <file>` | Output HTML path (defaults to `<root>/_family-portal.html`) |
| `--json` | Output only the scanned project-list JSON, with no other text mixed in |
| `--check` | Family-list consistency self-check; exit code `3` on drift |
| `--help` / `-h` | Help |

Exit-code contract: `0` success · `2` argument/path error · `3` list self-check failed.

## Why it exists

The Engineering Health Family's twenty-plus members are scattered across several local archive directories, with no dynamic entry point tying them together. A static showcase drifts from the real archive; this tool scans the real directory, so re-running updates it.

## List-consistency gate (--check)

The tool keeps two hand-maintained tables internally: `LAYER_MAP` (governance-layer classification) and `DECISION_TREE` (selection decision tree). They are really two views of the same family list — historically there was a real incident where "a new axis was added, the decision tree was updated but the classification table was not", with the consequence that the axis was silently classified as "uncategorized" and nobody noticed.

`--check` turns that drift into a deterministic failure: the two tables must cover each other bidirectionally, and slugs must not be defined twice. So **adding a family axis requires updating both tables at once** — miss one and CI goes red. The portal page also shows a self-check badge and the family axis count at the top.

## Design discipline

- CLI output to the user uses no emoji, only plain text.
- `--json` outputs pure JSON only; gate results are expressed via exit codes, never extra text written to stdout.
- Path arguments are verified for existence and directory-ness up front, avoiding falsely reporting "passed" on a wrong path.
- The "uncategorized" directory in the portal is explicitly warned about, not silently dropped.

## Tests

```bash
node --test test.js        # 18 unit tests
node scripts/smoke-cli.js  # 13 end-to-end assertions, including a "artifact has zero external requests" check
```

CI (`.github/workflows/verify.yml`) runs, on both ubuntu and windows: unit tests → `--check` self-check → end-to-end smoke.

## Family capstone note

As of 2026-08-16, the Engineering Health Family's horizontal coverage is exhausted: SonarQube TOP static smells, the git four-piece set, dependency & structure, config layer, orchestration layer, and presentation layer are all covered; the five new axes err / file-hygiene / i18n / timezone / CI are all already occupied by free tools. `track-capped` marks the encapsulation endpoint of the family's current phase.

## License

[MIT](LICENSE)

---

Maintained by **huanweide** · [GitHub](https://github.com/huanweide)

← [Back to the code-health family overview](https://github.com/huanweide/family-showcase)
