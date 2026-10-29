# research/math

Tooling for frontmatter-markdown mathematical research libraries.

A *research program* is a directory of YAML-frontmatter markdown notes (concepts, objects, morphisms, theorems, examples, narratives, questions, references) with typed relations between them (`depends-on`, `introduces`, `recaps`, `discusses`, `instantiates`, `see-also`, `realizes`, `closes`, `chapters`, `explores`).
Each program declares its own `research.toml` at its root.

## Packages

- `research-corpus/` — library: parse, graph, resolve.
  No CLI.
- `program-validator/` — CLI: pass/fail checks (parse, refs, citations, cycles, status consistency, proofs, Lean).
- `program-planner/` — CLI: research demands (question readiness, enablement frontier, demand clusters, …).
- `program-auditor/` — CLI: structural-risk analysis (body-vs-deps, load-bearing ranking, foundation distance).
- `monograph-composer/` — CLI: compose the program into a single markdown monograph.

## Run

This is a uv workspace; once the local environment supports it:

```
uv run program-validator
uv run monograph-composer
```

Without uv (or pipx/venv), set PYTHONPATH directly:

```
TOOLS=/path/to/operations/engineering/tools/research/math
export PYTHONPATH=$TOOLS/research-corpus/src:$TOOLS/program-validator/src:$TOOLS/monograph-composer/src
cd /path/to/research-program          # contains research.toml
python3 -m program_validator          # writes <root>/tools/build/wip-report.md
python3 -m program_planner            # writes <root>/tools/build/research-program.md
python3 -m program_auditor            # writes <root>/tools/build/dependency-audit.md
python3 -m monograph_composer         # writes the configured monograph path
```

Both CLIs walk up from CWD to find `research.toml`; pass `--root <path>` to override.
`program-validator --no-lean` skips the `lake build` step.
`monograph-composer --no-pandoc` skips the citeproc pass.
