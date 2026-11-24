---
name: "CORPUS STYLE GUIDE"
---

# Relationing Research Corpus Style Guide

**Version:** 1.0  
**Date:** November 9, 2025  
**Purpose:** Define reproducible Markdown formatting standards for the Relationing Research Program Repository

---

## Principles

1. **Consistency**: All documents follow the same structural patterns
2. **Parsability**: Frontmatter and citations must be machine-readable
3. **Reproducibility**: Agents and humans can create conformant documents
4. **Semantic clarity**: Structure reflects theoretical content
5. **Lakota-aligned**: Formatting respects the relational foundations
6. **Authorial clarity**: Use “I” for the author introducing concepts and inclusive “we/let’s” for using concepts with the reader

---

## 0. Authorial Voice (I / we)

For non-fiction, especially scientific research papers and technical concept-writing:
- Use first-person singular (“I”) when the author introduces, defines, motivates, or explains concepts (“I define…”, “I’ll show…”).
- Use inclusive first-person plural (“we”, “let’s”) when working with the reader through derivations, worked examples, and applications (“Now, let’s apply…”).
- Avoid ambiguous “we” (e.g., meaning “people in general”); name the subject if it isn’t the author+reader pair.
- Use second person (“you”) primarily for instructions and procedures, not research exposition.

## 1. File Naming

### Semantic IDs
- **Format**: `lowercase-with-hyphens-and-dots.md`
- **Structure**: `{verb}-{concept}[-{qualifier}].md`
- **Examples**:
  - `proposing-relationing.md`
  - `deriving-a-reflexive-infinity-topos.md`
  - `theorem-of-information-theoretic-stability.md`

### Uniqueness
- Each document ID must be unique across the entire repository
- Use descriptive, content-based names (not generic like `doc1.md`)
- Avoid version numbers in filenames (use Git for versioning)

---

## 2. Frontmatter (TOML)

### Required Structure

Every Markdown document MUST begin with TOML frontmatter enclosed in `+++`:

```markdown
+++
# ===== IDENTITY =====
id = "document-id"
title = "Human-Readable Title"
aliases = ["Alternative Title", "Short Name"]

# ===== AUTHORIAL =====
authors = ["emsenn", "collaborator-name"]
date_created = "2025-11-09"
date_modified = "2025-11-09"
status = "draft"
intended_audience = "academic"
authorial_voice = "scientific"

# ===== CLASSIFICATION =====
document_type = "note"
topics = ["relationing", "category-theory"]
disciplines = ["mathematics", "philosophy"]
rrpr_modalities = ["differentiation", "recognition"]

# ===== CITATIONS - INTERNAL =====
cites_internal = ["other-document-id"]
cited_by_internal = []

# ===== RELATIONAL METADATA =====
depends_on = ["foundational-concept"]

# ===== PUBLICATION =====
published = false
+++
```

**Note:** This template uses canonical enum values from `rsc/schema.py`. 
Copy this template verbatim to create conformant documents that will pass ingestor validation.

### Field Specifications

#### Identity Fields
- `id` (required): Unique semantic identifier matching filename (without `.md`)
- `title` (required): Human-readable title in title case
- `aliases` (optional): Array of alternative titles/names

#### Authorial Fields
- `authors` (required): Array of contributor names
- `date_created` (required): ISO 8601 date `YYYY-MM-DD`
- `date_modified` (required): ISO 8601 date `YYYY-MM-DD`
- `status` (required): One of `draft`, `working`, `canonical`, `archived`, `deprecated`
  - **Canonical values** (from `rsc/schema.py:DocumentStatus`):
    - `draft` - Early draft, unstable
    - `working` - Active development
    - `canonical` - Authoritative, stable reference
    - `archived` - Historical, not actively maintained
    - `deprecated` - Superseded by newer work
- `intended_audience` (optional): Target readership (`academic`, `general`, `civic`, `technical`)
- `authorial_voice` (optional): Writing style/perspective (`scientific`, `narrative`, `pedagogical`, `activist`)

**Note**: Use `intended_audience` and `authorial_voice` to separate scientific papers from civic/narrative content.

#### Classification Fields
- `document_type` (required): Document type (see section below)
- `topics` (optional): Array of topical keywords (see `docs/CONTROLLED_VOCABULARIES.md`)
- `disciplines` (optional): Array of academic disciplines (see `docs/CONTROLLED_VOCABULARIES.md`)
- `rrpr_modalities` (optional): Array of RRPR framework modalities engaged: `["differentiation", "recognition", "relation", "stabilization"]`

**Note**: Use controlled vocabulary values defined in `docs/CONTROLLED_VOCABULARIES.md` for consistency and queryability.

#### Citation Fields
- `cites_internal` (optional): Array of internal document IDs referenced
- `cited_by_internal` (optional): Array of documents citing this one (auto-populated)
- `cites_external` (optional): Array of `[cites_external](../../../../../../../../../../../../../../../public-services-section/services/personal-services-section/services/emsenn-services-section/lib/preservation/emsenn-archive-org/research/operations/engineering/triage/content/speculative/computing/from-sloppyresearch/research/docs/cites_external)` blocks (see below)

#### Relational Metadata
- `depends_on` (optional): Array of foundational concepts/documents required
- `builds_on` (optional): Array of document IDs this work extends or improves upon

#### Archival Metadata
- `superseded_by` (optional): Document ID that replaces this one (for archived drafts)
- `supersedes` (optional): Array of document IDs this work replaces (for canonical versions)
- `archival_reason` (optional): Explanation of why document was archived
- `archival_date` (optional): Date document was archived (YYYY-MM-DD format)

**Note**: See `docs/ARCHIVAL_POLICY.md` for detailed archival criteria and workflow.

#### Publication Metadata
- `published` (optional): Boolean indicating publication status (default: `false`)
- `publication_venue` (optional): Where published (journal, conference, etc.)
- `doi` (optional): Digital Object Identifier if published
- `license` (optional): Content license (e.g., "CC-BY-4.0", "MIT")
- `keywords` (optional): Array of keywords for discoverability

#### Git Provenance (Auto-populated)
- `git_repo` (optional): Repository URL (auto-populated by ingestor)
- `git_branch` (optional): Branch name (auto-populated)
- `git_commit` (optional): Commit hash (auto-populated)

#### Extensibility
- `extra` (optional): Dictionary for custom metadata not in schema

### Document Types

Use these standardized `document_type` values **(from `rsc/schema.py:DocumentType`)**:

- `foundational_treatise` - Core theoretical exposition
- `paper` - Formal research paper
- `theorem` - Formal mathematical theorem with proof
- `definition` - Formal definition of a concept
- `proof` - Standalone proof
- `experiment` - Experimental design or results
- `note` - Working notes and explorations
- `commentary` - Analysis of existing work
- `draft` - Early-stage draft content
- `synthesis` - Integration of multiple sources

**Note:** Do not use `research_note`, `civic_text`, or other unlisted types. 
They will fail validation. Use `note` or `commentary` instead.

### Term Definitions

For documents that define terms, add `[defines](../../../../../../../../../../../../../../../public-services-section/services/personal-services-section/services/emsenn-services-section/lib/preservation/emsenn-archive-org/research/operations/engineering/triage/content/speculative/computing/from-sloppyresearch/research/docs/defines)` blocks:

```toml
[defines](../../../../../../../../../../../../../../../public-services-section/services/personal-services-section/services/emsenn-services-section/lib/preservation/emsenn-archive-org/research/operations/engineering/triage/content/speculative/computing/from-sloppyresearch/research/docs/defines)
id = "term-id"
label = "Term Label"
description = "Clear, concise definition of the term"
aliases = ["Alternative Name", "Synonym"]

[defines](../../../../../../../../../../../../../../../public-services-section/services/personal-services-section/services/emsenn-services-section/lib/preservation/emsenn-archive-org/research/operations/engineering/triage/content/speculative/computing/from-sloppyresearch/research/docs/defines)
id = "another-term"
label = "Another Term"
description = "Definition goes here"
```

**Rules:**
- Use lowercase hyphenated IDs (no "term." or "virtual:" prefix)
- `id` (required): Lowercase term identifier
- `label` (required): Canonical display name
- `description` (optional but recommended): Definition text
- `aliases` (optional): Alternative names for the term
- Each term becomes a `virtual:term.{id}` cell in the knowledge graph
- **DEPRECATED**: Do not use `term_id` or `definition` fields (legacy schema)

### External Citations

For external references (books, papers, etc.), add `[cites_external](../../../../../../../../../../../../../../../public-services-section/services/personal-services-section/services/emsenn-services-section/lib/preservation/emsenn-archive-org/research/operations/engineering/triage/content/speculative/computing/from-sloppyresearch/research/docs/cites_external)` blocks:

```toml
[cites_external](../../../../../../../../../../../../../../../public-services-section/services/personal-services-section/services/emsenn-services-section/lib/preservation/emsenn-archive-org/research/operations/engineering/triage/content/speculative/computing/from-sloppyresearch/research/docs/cites_external)
key = "deloria:1999:spirit-and-reason"
authors = ["Vine Deloria Jr.", "Daniel R. Wildcat"]
title = "Power and Place: Indian Education in America"
year = 1999
venue = "Fulcrum Publishing"
doi = "10.1234/example"
url = "https://example.com/book"

[cites_external](../../../../../../../../../../../../../../../public-services-section/services/personal-services-section/services/emsenn-services-section/lib/preservation/emsenn-archive-org/research/operations/engineering/triage/content/speculative/computing/from-sloppyresearch/research/docs/cites_external)
key = "maclane:1998:categories"
authors = ["Saunders Mac Lane"]
title = "Categories for the Working Mathematician"
year = 1998
venue = "Springer"
```

**Rules:**
- `key` (required): Citation key in format `author:year:short-title`
- `authors` (optional): Array of author names
- `title` (required): Full title of the work
- `year` (optional): Publication year
- `venue` (optional): Publisher, journal, or conference
- `doi` (optional): Digital Object Identifier
- `url` (optional): Web link
- `extra` (optional): Dictionary for additional metadata

These create `virtual:publication.{key}` cells in the knowledge graph.

---

## 3. Headings

### Hierarchy

Use ATX-style headings (`#`, `##`, `###`) with the following hierarchy:

```markdown
# Document Title (Level 1 - only one per document)

## Major Section (Level 2)

### Subsection (Level 3)

#### Detail Section (Level 4)
```

### Rules

1. **One H1 per document**: The document title (matching frontmatter `title`)
2. **Sequential levels**: Don't skip levels (no H1 → H3)
3. **Sentence case**: Use sentence case, not title case (except for proper nouns)
4. **No trailing punctuation**: Headings don't end with periods
5. **Blank lines**: Always blank line before and after headings

### Example

```markdown
# Proposing relationing

## The primitive act: differentiation

Differentiation is the minimal operation...

### Recognition as produced regions

From differentiation emerges recognition...
```

---

## 4. Mathematical Notation

### LaTeX in Markdown

Use **standard LaTeX** delimiters for all mathematical expressions:

#### Inline Math
Use single dollar signs for inline expressions:

```markdown
The inclusion relation $m_1 \leq m_2$ measures coherence.
```

**Rendered:** The inclusion relation $m_1 \leq m_2$ measures coherence.

#### Display Math
Use double dollar signs for block equations:

```markdown
$$
\text{Include}(m_1, m_2) \iff m_1 \leq m_2
$$
```

**Rendered:**
$$
\text{Include}(m_1, m_2) \iff m_1 \leq m_2
$$

### Equation Numbering

For referenced equations, use LaTeX labels:

```markdown
$$
\text{Flow}(x) = \text{Open}(\text{Close}(x)) \land \text{Close}(\text{Open}(x)) \tag{1}
$$

As shown in equation (1), flow emerges from dual operators.
```

### Mathematical Constructs

#### Operators
- Use `\text{}` for operator names: `\text{Induce}(a, b)`
- Use proper symbols: `\leq`, `\geq`, `\subset`, `\subseteq`
- Use blackboard bold for categories: `\mathcal{R}`, `\mathbb{Z}`

#### Sets and Categories
- Categories: `\mathcal{C}`, `\mathcal{R}`, `\mathcal{T}`
- Sets: `\mathcal{P}(E)` for power set
- Objects: Regular math italic `X`, `Y`, `M`

#### Arrows and Morphisms
- Function arrows: `f: A \to B`
- Natural transformations: `\eta: F \Rightarrow G`
- Adjunctions: `F \dashv G`

### Example

```markdown
In the category $\mathcal{R}$, morphisms are inclusions $\text{Include}(m_1, m_2)$
defined by the ordering relation:

$$
m_1 \leq m_2 \iff \exists \text{ mono } i: X_1 \hookrightarrow X_2
$$

The subobject classifier $\Omega_Y$ satisfies the universal property:

$$
\begin{array}{c}
1 \xrightarrow{\top_Y} \Omega_Y \\
\downarrow & \downarrow \\
X \xrightarrow{\chi_m} Y
\end{array}
$$
```

---

## 5. Code Blocks

### Fenced Code Blocks

Always specify the language for syntax highlighting:

````markdown
```python
def differentiate(region):
    """Create a distinction within a region."""
    return boundary, interior
```
````

### Supported Languages

Common languages in the corpus:
- `python` - Python code
- `haskell` - Haskell (for category theory)
- `javascript` - JavaScript
- `bash` - Shell commands
- `toml` - TOML configuration
- `latex` - LaTeX snippets
- `text` - Plain text (no highlighting)

### Pseudocode

For theoretical pseudocode, use `text` or describe algorithmically:

````markdown
```text
Algorithm: Reflexive Stabilization
Input: Operator f, recognition x
Output: Fixed point y where f(y) = y

1. Initialize y₀ = x
2. Iterate yₙ₊₁ = f(yₙ)
3. Until yₙ₊₁ = yₙ
4. Return yₙ as fixed point
```
````

---

## 6. Citations and References

### Internal Citations

Reference other documents using bracket notation with the document ID:

```markdown
The concept of differentiation is explored in [@proposing-relationing].

Building on the Relational ∞-Topos Modality [@deriving-a-reflexive-infinity-topos],
we can show...
```

**Rules:**
- Use `[@document-id]` format
- Document ID must match an existing document's `id` field
- List all internal citations in frontmatter `cites_internal` array

### External Citations

For published works, use full citation keys:

```markdown
Deloria argues for indigenous scientific frameworks [@deloria:1999:spirit-and-reason].

Following Mac Lane's treatment of category theory [@maclane:1998:categories-for-working],
we define...
```

**Format:** `[@author:year:short-title]`

### Bibliography

External references should be catalogued in `ref/bibliography.bib` or similar.

---

## 7. Semantic Structures

### Definitions

For formal definitions, use blockquotes with bold term:

```markdown
> **Definition (Differentiation):** The primitive act of being; a minimal operation
> that distinguishes one region of possibility from another, creating a boundary
> and relational tension.
```

### Theorems

For theorems, use structured format:

```markdown
> **Theorem (Reflexive Stability):** For any operator $f: X \to X$ on a complete
> lattice, the iterated application $f^n(x)$ converges to a fixed point.
>
> *Proof:* By the Knaster-Tarski theorem, $f$ has a least fixed point...
```

### Examples

Use numbered lists for examples:

```markdown
**Example 1:** Recognition in natural language

Consider the sentence "The cat sat on the mat." The differentiation
between "cat" and "mat" creates recognized regions...

**Example 2:** Category-theoretic recognition

In the category $\mathbf{Set}$, subsets are recognized through
characteristic functions...
```

### Notes and Asides

Use blockquotes for important notes:

```markdown
> **Note:** This formulation differs from classical topos theory in that...
```

---

## 8. Lists

### Unordered Lists

Use hyphens (`-`) for consistency:

```markdown
- First item
- Second item
  - Nested item
  - Another nested item
- Third item
```

### Ordered Lists

Use explicit numbering:

```markdown
1. First step
2. Second step
3. Third step
```

### Definition Lists

For term/definition pairs not in frontmatter:

```markdown
**Closure**  
An operator satisfying $A \subseteq c(A)$ and $c(c(A)) = c(A)$.

**Interior**  
The dual operator to closure, representing openness.
```

---

## 9. Emphasis and Formatting

### Italic
Use for emphasis or introducing new terms:

```markdown
The concept of *differentiation* is fundamental.
```

### Bold
Use for strong emphasis or key terms:

```markdown
**Differentiation is the primitive act of being.**
```

### Code
Use backticks for inline code, identifiers, or literal text:

```markdown
The function `differentiate()` returns a tuple.
The concept is stored in the `recognition` field.
```

### Strikethrough
Use for deprecated or superseded content:

```markdown
~~This formulation has been replaced by the reflexive model.~~
```

---

## 10. Whitespace and Formatting

### Blank Lines

- **One blank line** between paragraphs
- **One blank line** before and after headings
- **One blank line** before and after code blocks
- **One blank line** before and after blockquotes
- **No blank lines** within list items (unless separating paragraphs)

### Line Length

- **Soft limit**: 88 characters (Python Black standard)
- **Hard limit**: 120 characters
- Break long sentences at natural boundaries (commas, conjunctions)

### Indentation

- Use **spaces, not tabs**
- **2 spaces** for list nesting
- **4 spaces** for code block content (if language doesn't specify)

### Trailing Whitespace

- **No trailing whitespace** at end of lines
- Files should end with a **single newline**

---

## 11. Special Constructs

### Diagrams

For commutative diagrams, use LaTeX with `tikz-cd` or ASCII art:

```markdown
$$
\begin{array}{ccc}
X & \xrightarrow{f} & Y \\
\downarrow{g} & & \downarrow{h} \\
Z & \xrightarrow{k} & W
\end{array}
$$
```

Or ASCII for simplicity:

```text
    X ---f---> Y
    |          |
    g          h
    |          |
    v          v
    Z ---k---> W
```

### Tables

Use standard Markdown tables:

```markdown
| Operator | Symbol | Property |
|----------|--------|----------|
| Closure  | $c$    | Idempotent |
| Interior | $i$    | Dual to $c$ |
| Flow     | $f$    | Lax-idempotent |
```

### Footnotes

Use Markdown footnotes for asides:

```markdown
The concept of reflexive stability[^1] emerges from iteration.

[^1]: Stability under self-application, not to be confused with
      structural stability in dynamical systems.
```

---

## 12. Document Templates

### Research Note Template

```markdown
+++
id = "research-note-slug"
title = "Research Note Title"
authors = ["emsenn"]
date_created = "2025-11-09"
date_modified = "2025-11-09"
status = "draft"
document_type = "note"
topics = ["topic-one", "topic-two"]
cites_internal = []
published = false
+++

# Research note title

## Context

What question or problem motivated this note?

## Exploration

Main content of exploration...

## Findings

Key insights discovered...

## Next steps

- Follow-up question 1
- Follow-up question 2
```

### Theorem Template

```markdown
+++
id = "theorem-of-concept-name"
title = "Theorem of Concept Name"
authors = ["emsenn"]
date_created = "2025-11-09"
date_modified = "2025-11-09"
status = "working"
document_type = "theorem"
topics = ["mathematics", "relationing"]
depends_on = ["foundational-concept"]
published = false
+++

# Theorem of concept name

## Statement

> **Theorem:** [Formal statement of theorem]

## Context

Why this theorem matters, what it generalizes or extends...

## Proof

*Proof:* 

1. [Proof step 1]
2. [Proof step 2]
...

Therefore, the theorem holds. □

## Implications

What follows from this theorem...

## Examples

Concrete examples demonstrating the theorem...
```

---

## 13. Migration Checklist

When converting documents to this style guide:

- [ ] Add TOML frontmatter with all required fields
- [ ] Ensure single H1 title matching frontmatter
- [ ] Convert math to standard LaTeX (`$...$` and `$$...$$`)
- [ ] Add language tags to code blocks
- [ ] Convert citations to `[@id]` format
- [ ] Check heading hierarchy (no skipped levels)
- [ ] Remove trailing whitespace
- [ ] Ensure consistent list formatting (hyphens)
- [ ] Add blank lines between sections
- [ ] Verify file naming follows semantic ID convention

---

## 14. Validation

Documents should be validated for:

1. **TOML frontmatter parsing** - Runs without errors
2. **Unique IDs** - No duplicate `id` values in corpus
3. **Valid internal citations** - All `[@id]` references exist
4. **Math rendering** - LaTeX compiles correctly
5. **Heading hierarchy** - No skipped levels
6. **Code block languages** - All blocks have language specified

The RRPR Interface ingestor will validate these automatically.

---

## 15. Schema Reference

### Valid Enum Values

All enum values are defined in `rsc/schema.py` and validated by `rsc/frontmatter_parser.py`.

#### DocumentStatus Enum

| Value | Meaning |
|-------|---------|
| `draft` | Early draft, unstable |
| `working` | Active development |
| `canonical` | Authoritative, stable reference |
| `archived` | Historical, not actively maintained |
| `deprecated` | Superseded by newer work |

#### DocumentType Enum

| Value | Meaning |
|-------|---------|
| `foundational_treatise` | Core theoretical exposition |
| `paper` | Formal research paper |
| `theorem` | Formal mathematical theorem with proof |
| `definition` | Formal definition of a concept |
| `proof` | Standalone proof |
| `experiment` | Experimental design or results |
| `note` | Working notes and explorations |
| `commentary` | Analysis of existing work |
| `draft` | Early-stage draft content |
| `synthesis` | Integration of multiple sources |

### Complete Frontmatter Field Reference

| Field | Type | Required? | Description |
|-------|------|-----------|-------------|
| `id` | string | ✅ Required | Unique document identifier |
| `title` | string | ✅ Required | Human-readable title |
| `aliases` | array[string] | Optional | Alternative titles/names |
| `authors` | array[string] | Recommended | Document authors |
| `date_created` | string (ISO) | Recommended | Creation date YYYY-MM-DD |
| `date_modified` | string (ISO) | Recommended | Last modified YYYY-MM-DD |
| `status` | DocumentStatus | Recommended | Document maturity status |
| `document_type` | DocumentType | Recommended | Classification type |
| `topics` | array[string] | Optional | Topical keywords |
| `disciplines` | array[string] | Optional | Academic disciplines |
| `cites_internal` | array[string] | Optional | Internal document IDs |
| `cited_by_internal` | array[string] | Optional | Auto-populated citations |
| `cites_external` | array[object] | Optional | External citation blocks |
| `defines` | array[object] | Optional | Term definition blocks |
| `depends_on` | array[string] | Optional | Dependencies |
| `published` | boolean | Optional | Publication status |
| `publication_venue` | string | Optional | Where published |
| `doi` | string | Optional | Digital Object Identifier |
| `license` | string | Optional | Content license |
| `keywords` | array[string] | Optional | Search keywords |
| `git_repo` | string | Optional | Auto-populated by ingestor |
| `git_branch` | string | Optional | Auto-populated by ingestor |
| `git_commit` | string | Optional | Auto-populated by ingestor |
| `extra` | object | Optional | Custom metadata dictionary |

---

## 16. Rationale

This style guide ensures:

- **Agent accessibility**: Clear, parsable structure for LLMs and tools
- **Knowledge graph integrity**: Consistent metadata for graph construction
- **Reproducibility**: Anyone can create conformant documents
- **Theoretical alignment**: Structure reflects Relationing principles
- **Schema validation**: All values validated against canonical enums
- **Long-term maintainability**: Standards prevent drift over time

The format prioritizes **semantic structure over visual presentation**, 
aligning with Relationing's emphasis on recognition through differentiation.

**Schema Sync:** This guide is synchronized with `rsc/schema.py` (v1.0) and 
`rsc/frontmatter_parser.py`. All enum values and required fields match the 
canonical implementation.

---

**Document Status:** Canonical  
**Version:** 1.0  
**Schema Version:** rsc/schema.py v1.0  
**Maintained by:** Relationing Research Program  
**Questions:** See `AGENTS.md` for contribution guidelines
