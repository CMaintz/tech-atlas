---
status: proposed
---

# A concept earns its own Term by passing a three-part test

"One Term per concept" is unfalsifiable and would leave every borderline case to
whoever happens to be writing that day. Instead a candidate becomes its own Term only
if it passes all three of the following; otherwise it is folded into its parent as a
paragraph, or recorded as an Alias if it is genuinely the same concept under another
name.

1. **Someone searches for it alone.** It appears as its own line in a textbook index,
   a course glossary, or search autocomplete. Not "could be searched" — *is*.
2. **It survives a standalone Summary.** You can write ≤140 characters about it that
   don't reduce to "a kind of `<parent>`". If the best Summary available restates the
   parent, there is no separate concept here.
3. **It carries an Edge the parent doesn't.** A different prerequisite, a different
   contrast, a different failure mode. Identical Edges mean an identical position in
   the graph, and a node in the same position as its parent is noise.

## Consequences

- `big-o`, `time-complexity` and `amortised-analysis` are three Terms, not one Term with
  two Aliases: each is searched alone, each has a distinct Summary, and each has Edges
  the others lack (`time-complexity` is `measured-by` `big-o`; `amortised-analysis` is a
  `kind-of` `complexity-analysis` and `contrasts-with` `worst-case-analysis`). Aliases
  are reserved for the same referent under a different name — "mutex" and "mutual
  exclusion lock".
- Tests 2 and 3 are mechanically checkable, so lint raises a *warning* — never an error —
  when a Term's Edges are a subset of its `kind-of` parent's and its Summary contains the
  parent's name. Judgement stays with the author; the warning just makes the question
  get asked.
- Test 1 needs an external oracle. For security, the syllabus and glossary of the course
  we are writing alongside is that oracle: if the exam lists it separately, it is a Term.
  For CS, standard textbook indexes serve the same role.
