---
status: accepted
accepted: 2026-09-22
---

# Depth is derived from the prerequisite graph, not authored per term

> Carried forward verbatim from `techlexicon/docs/adr/0001` [S6]. See
> `03_ARCHITECTURE.md` §9 and `../02_SCHEMA.md` for how it interacts with the
> B-vision's configurable spatial lenses and Atlas's derived taxonomy-depth axis.

We need a meaningful vertical axis for the graph, because a force-directed layout with
no semantic axis is a hairball. We considered authoring an abstraction level on each
Term, and a per-Domain layer enum, but chose to compute **Depth** as the longest path
to a Term through `requires` Edges. It costs no authoring effort, cannot drift out of
consistency, works identically for every Domain, and places theory Terms wherever their
prerequisites put them rather than forcing them onto a hardware-to-product scale they
don't belong on.

## Considered options

**A. Author `abstraction: 1–7` on every Term (hardware → product).**
Rejected. The scale is a core-CS scale: `phishing`, `incident response` and `GDPR` sit
nowhere on it, and neither do `NP-completeness` or the CAP theorem. Four hundred
hand-assigned integers would never stay mutually consistent, and every borderline Term
becomes an argument. It also blocks content authoring on a decision nobody can make
confidently in advance.

**B. A per-Domain `layer` enum** (CS: hardware/os/runtime/language/framework/app/theory;
security: network/host/app/data/identity/people/governance).
Rejected *as the axis*, kept as a facet. Layers are genuinely useful for colouring and
filtering — "show me everything at the identity layer" is a real query — but they are
categorical, not ordered, and they are not comparable across Domains, so they cannot
position a node in space.

**C. Derive Depth from the `requires` DAG.** Chosen.
`depth(t) = 0` if `t` requires nothing, else `1 + max(depth(r) for r in requires(t))`.

## Consequences

- The `requires` Edge becomes load-bearing. An author being lazy about prerequisites
  doesn't just weaken a feature, it visibly flattens the graph — which makes the
  omission self-announcing rather than silent.
- `requires` must stay acyclic. Lint rejects cycles.
- The 3D view becomes a layered dependency graph, the one 3D graph form that reads well,
  and the vertical axis now literally shows learning order.
- Depth shifts when Edges change. It is a build artefact and must never be committed or
  referenced in content.
- `layer` survives as an optional, per-Domain, purely categorical field.
