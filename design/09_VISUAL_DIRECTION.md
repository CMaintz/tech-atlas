# 09 — Visual & Frontend Direction

Purpose: the visual/frontend reference material — the graph-visualisation
inspiration images described for a designer, the one novel mockup embedded in the
chat, the ASCII UI mockups from the chats, and the three built demo variants with
their graph-rendering mechanics. See `00_README.md` for provenance.

Source images live in `graph visualisation examples/` (7 files) and, duplicated,
embedded in `chat exploration session.docx`. The one embedded image *not* in that
folder is described in §2.

---

## 1. Inspiration images — designer's description

*(The following seven descriptions cover the files in `graph visualisation
examples/`.)*

### 3d graph.jpg
A dark, immersive 3D force-directed graph titled "NETWORK INTELLIGENCE /
INTERACTIVE 3D GRAPH," rendered with volumetric spheres and thick tube-like edges
that read like a physical, three-dimensional model. Polished, editorial,
admin-tool oriented, dominated by a heavy left-hand control panel.
- **Aesthetic:** Immersive 3D, high-gloss, dashboard/CRUD-editor feel.
- **Palette:** Near-black navy background (~#0a1224); community-coded nodes in
  cyan/sky blue (#3fb4e6), burnt orange (#e8681f), muted lavender (#9a9bd0);
  accent teal-green edge (#2fbf6f); yellow/gold, orange, blue tubes.
- **Background:** Flat very dark navy; lower portion fades to black.
- **Nodes:** Large glossy 3D spheres with soft specular highlights; strong size
  variation (hubs much larger); no node text labels; small dot-markers ride the
  edges.
- **Edges:** Thick rounded 3D tubes with directional arrowheads; colour-coded per
  relationship; travelling dots suggest "influence waves"/flow animation.
- **Layout:** True 3D, force-directed, community-clustered (colour = community).
- **UI chrome:** Wide left sidebar with NODE / EDGE / MODEL / MAINTENANCE cards,
  form inputs, dropdowns, SAVE/CLEAR/DELETE buttons, toggles ("Use community
  colors", "Influence waves"), RE-LAYOUT / RUN COMMUNITY DETECTION; top-right
  SEARCH + GO and a SELECTION hint panel; "Live Model" pill; footer stats
  "Nodes: 15 · Edges: 24 · Focus: Reliance"; camera-control hint.
- **Distinctive:** Chunky 3D tubes with flow dots; full node/edge CRUD editing UI
  in the sidebar; rounded pill buttons.

### ChatGPT Image Sep 19, 2026, 12_46_37 AM.png
A dark radial knowledge-graph explorer branded "TechLexicon," with a central
"Kubernetes" hub fanning out to colourful category nodes, flanked by a left nav
tree and a right detail/definition panel. Clean, product-grade SaaS docs aesthetic.
**This is the closest thing to a first-party mockup of the intended product.**
- **Aesthetic:** Modern dark SaaS docs/explorer, calm and information-dense.
- **Palette:** Deep navy-black canvas; glowing nodes in azure/electric blue
  (central), magenta/pink, purple, amber/gold, teal, green; blue UI accents.
- **Background:** Very dark navy with a faint dotted/particle field.
- **Nodes:** Circular glowing nodes with soft halo bloom; clear size hierarchy
  (large central hub, medium categories, small leaves); small readable labels.
- **Edges:** Thin faint curved/straight links radiating from centre, low-contrast
  grey-blue.
- **Layout:** 2D radial / hub-and-spoke force layout centred on a focus node.
- **UI chrome:** Top search bar ("Search for a term…") with domain and Filters
  dropdowns; left sidebar with entity list and a "View Options" section (2D Graph,
  3D Graph, Hierarchy View, Cluster View) plus a category legend/filter list with
  coloured dots; right panel is a rich definition card (title, description, Key
  Concepts, Related Terms, Learning, See Also); bottom toolbar with graph
  controls; small 3D axis gizmo bottom-left.
- **Distinctive:** Pairs the graph with a full glossary/definition reading pane —
  exactly the "technical lexicon" pattern; multiple selectable view modes;
  per-domain colour legend.

### graph.jpg
An atmospheric, almost celestial visualization titled "CORNELIUS," where notes
float as faint points across a large dark sphere/globe, evoking a "second brain".
Contemplative, sci-fi, text-heavy rather than node-heavy.
- **Aesthetic:** Moody, cosmic/observatory, minimalist and cerebral.
- **Palette:** Near-black; dim slate-blue points, faint grey link text; warm
  amber/gold glow accents; one bright cyan focal point at centre.
- **Background:** Dark with a subtle large spherical/globe gradient centre, faint
  starfield scatter.
- **Nodes:** Very small dim dots; a single bright cyan node marks the focus; nodes
  subordinate to text.
- **Edges:** Extremely faint hairline links with tiny grey labels riding the
  connections (edge annotations).
- **Layout:** 2D scatter mapped onto an implied sphere/globe surface; dispersed,
  low-density.
- **UI chrome:** Left column of collapsible lists (CONNECTED THOUGHTS, TIMELINE,
  TAGS) with counts; top monospace command hint ("Find a note, press ⌘/ to
  search"); right reading panel with a detailed note, metadata fields (layer,
  lifecycle, connections, inbound), source/references, and a "Cross-Domain
  Connections (AI-Identified)" section.
- **Typography:** Monospace/terminal-style throughout, small, understated.
- **Distinctive:** Terminal/CLI aesthetic; edge-labels as inline text;
  AI-identified cross-domain connections; globe framing.

### knowledge graph explorer.jpg
A clean, light 2D knowledge-graph explorer titled "Knowledge Graph Explorer",
mapping AI/ML entities with pastel type-coded nodes. Bright, approachable,
structured. **The one light-theme reference.**
- **Aesthetic:** Clean, bright, structured analytics tool; approachable.
- **Palette:** Light/near-white canvas; type-coded node colours — teal/green,
  blue, purple, pink/magenta, red, amber; multicolour edges.
- **Background:** Light neutral, flat, no glow.
- **Nodes:** Solid flat-coloured discs, moderate size variation, some larger hub
  nodes; clear dark text labels.
- **Edges:** Thin coloured lines, some dashed vs solid to distinguish relationship
  types; straight connectors.
- **Layout:** 2D force-directed with selectable layouts (Free / Circle / Grid;
  Fixe / Radar / Grid toggles).
- **UI chrome:** Left sidebar with Search, Entity Types checklist (Person,
  Organization, Concept, Technology, Location, Event, Document, Research — each a
  coloured dot), Relationships, Importance slider, Layout toggles; right Details
  panel with an expandable Legend (colour→type); top-right counts (40 nodes, 43
  edges); bottom-right zoom/fit/refresh.
- **Distinctive:** Light-theme option; explicit entity-type taxonomy with colour
  legend; multiple layout algorithms as toggles; solid (non-glow) nodes.

### knowledge graph visualization.jpg
A dark force-directed graph titled "Knowledge Graph Visualization" with a signature
acid/lime-green accent, visualizing text entities over a dense white cobweb of
links. Sleek, high-contrast, developer-tool feel.
- **Aesthetic:** Sleek dark dev-tool, high-contrast, monochrome-plus-one-accent.
- **Palette:** Pure black/near-black; nodes in lime/acid green (~#7ac70c); links
  translucent white/grey; one bright green highlighted path; green for
  active/selected states.
- **Nodes:** Small-to-medium solid green circles with slight glow on the selected
  node; moderate size variation; small light-grey labels.
- **Edges:** Dense thin translucent white lines forming a web; a single highlighted
  edge in bright green to trace a connection/path.
- **Layout:** 2D force-directed (Force / Tree / Radial); dense, hairball-leaning.
- **UI chrome:** Top control bar with 3D toggle, Fullscreen, Layout segmented
  control, a live/DB toggle ("DB (4067)"), counts (4555 nodes • 4067 edges), Search
  ("lavenza"), Export, help "?"; left floating selection card (entity, connection
  counts, OUTGOING/INCOMING relationship phrases, "Clear selection"); right
  vertical icon toolbar; bottom node-count stepper ("75 nodes − / +").
- **Distinctive:** Single bold accent over monochrome; **incoming/outgoing
  relationships rendered as natural-language phrases**; large-scale (4k+ node)
  handling with a node-count limiter.

### knowledge graph.jpg
A very dark, large-scale graph console branded "FERROSA MEMORY / Knowledge Graph
Console", showing a galaxy-like cluster of thousands of tiny cyan points with a
glowing dense core. Enterprise data-platform mood — a "map of everything".
- **Aesthetic:** Enterprise console; cosmic/galaxy density; serious, data-heavy.
- **Palette:** Near-black/very dark blue; dominant cyan/teal point cloud with a
  bright glowing turquoise core; accent clusters in orange/rust, purple, green.
- **Nodes:** Thousands of very small glowing dots; density conveys structure;
  sub-clusters form satellite "galaxies"; no per-node text at this zoom.
- **Edges:** Implied/very faint within the dense cloud; connectivity read through
  clustering.
- **Layout:** 2D large-scale force-directed with a dense central super-cluster and
  orbiting sub-clusters.
- **UI chrome:** Top nav tabs (Home, Viz, CQL Explorer, SPARQL Explorer, Datalog
  Explorer, Aliases, Rules, Approvals / Explanations); secondary toolbar with
  toggles (Project, Nodes, Edges, Sessions), Code/Research/All filters, node totals,
  a LIVE indicator; a "Crates" filter row of coloured category chips with counts;
  left vertical icon rail.
- **Distinctive:** Multiple query-language explorers (Cypher/SPARQL/Datalog) as
  first-class tabs; coloured namespace chips for filtering; galaxy-scale bloom.

### network visualizer.jpg
A minimal 3D network visualizer titled "R3FNV / Network Visualizer Powered by React
Three Fiber", a spherical layout of purple nodes with two large hub spheres over a
plain dark canvas. Utilitarian tool mood with a data-table readout.
- **Aesthetic:** Utilitarian data-tool, minimal, single-hue; developer/analyst.
- **Palette:** Dark charcoal canvas (~#1c1c1c); monochrome purple/violet nodes
  (~#9b7fe0); grey translucent links; bright green only for logo and active slider.
- **Nodes:** Solid matte purple spheres on a sphere surface; strong size variation
  driven by "Degree Centrality" (two dominant hubs, many small leaves); no labels.
- **Edges:** Thin grey semi-transparent straight lines fanning from the hubs; dense
  but orderly radial spokes.
- **Layout:** 3D "Sphere" layout (selectable), centrality-driven; two-hub
  bipartite appearance.
- **UI chrome:** Left "Network Setup" panel — Upload Options (Choose File, "Upload
  and Process"), View Options (Visualization = Sphere, Node Size Dimension = Degree
  Centrality, Node Size Scale Factor slider), collapsible Bin Options; bottom
  tabbed data panel ("General Info" / "Currently Selected") with a "Network
  Topography" table (Data / Min / Max / Average for degrees, edgeWeights).
- **Distinctive:** CSV-upload-driven; node size mapped to a chosen metric
  (centrality) with a live scale slider; quantitative stats table beside the 3D
  view; named React Three Fiber stack.

### Common threads (across all seven)
A dark, immersive canvas dominates (six of seven use near-black navy/charcoal;
only "knowledge graph explorer.jpg" is light), letting luminous nodes and links
carry the weight. Nodes are consistently circular/spherical with domain- or
type-based colour coding; several add soft glow/bloom (dense "galaxy" cores; halo
nodes in the TechLexicon mock). Clear node-size hierarchy is universal — hub /
high-centrality nodes render largest. Layouts are overwhelmingly force-directed,
frequently with user-selectable modes (2D/3D, Force/Tree/Radial,
Sphere/Grid/Circle). Consistent UI chrome: a left sidebar for search, entity-type
filters and layout controls; a right panel for node details/definitions; a top bar
for search, layout toggles and node/edge counts; plus colour legends mapping hue to
category. Typography is small, clean sans-serif (monospace variant in graph.jpg),
kept muted so the visualization dominates. Ideas worth emulating for a technical
lexicon: **pairing the graph with a rich definition/reading pane** (ChatGPT mock,
graph.jpg); **rendering relationships as natural-language phrases** (knowledge graph
visualization.jpg); **edge annotations and AI-identified cross-domain links**
(graph.jpg); **per-domain colour chips/legends for filtering**; **animated
"influence/flow" dots along edges** (3d graph.jpg); and **mapping node size to a
chosen metric like degree centrality**.

---

## 2. The one novel mockup (embedded in the chat, not in the folder)

`chat exploration session.docx` embeds six images; five duplicate the folder above.
The sixth (`word/media/image2.jpg`, md5 79dc5edce0) is unique and worth calling
out. It has been extracted to a durable location:
**`design/assets/dark-knowledge-graph-explorer-mockup.jpg`**.

**A dark-theme "Knowledge Graph Explorer" of AI/ML entities** (NVIDIA, OpenAI,
Anthropic, GPT-4, Transformer Architecture, Diffusion Models, AlphaFold, Sam
Altman, Demis Hassabis, etc.). It is the same tool as the light
`knowledge graph explorer.jpg` but rendered on a **dark navy canvas**, and its
defining feature is **shape-coded entity types** (not just colour):
- Circle = **Person** (red) · rounded-square = **Organization** (teal) · diamond =
  **Concept** (purple) · hexagon = **Technology** (blue) · triangle = **Location**
  (green) · star = **Event** (yellow) · square = **Document** (pink) · pentagon =
  **Research** (magenta).
- Left sidebar: Search, Entity Types checkboxes (each with its coloured dot),
  Relationships, Importance slider, Layout toggles (Force / Circle / Radial / Grid).
- Right "Details" panel ("Click on a node to view details") with a collapsible
  **Legend** mapping shape+colour → type.
- Top-right node/edge counts (40 nodes, 43 edges); bottom-right zoom/fit/refresh.
- Multicolour edges, some solid/some dashed to distinguish relationship types.

**Takeaway for the product:** using node *shape* as a second encoding channel
(alongside domain colour) is a concrete, un-emulated idea — it would let the graph
distinguish, say, a Term from a Cluster from a Source without spending another hue.

---

## 3. UI mockups from the chats (ASCII)

These were sketched in the conversations. They also appear in `01_SPEC.md` §5 in
their UX context; collected here for the visual/layout reference.

### [S2] The full term page ("killer UI concept")
```
┌──────────────────────────────────────────────────────┐
│ Kubernetes                                           │
│ /kuːbərˈnetɪs/                                       │
│ Container orchestration platform                     │
│ ─────────────────────────────────────────────────── │
│ IN SIMPLE TERMS                                      │
│ Kubernetes helps manage containers across machines.  │
│ ┌──────────────┐    ┌─────────────────────────────┐  │
│ │ PREREQUISITES│    │ YOU MIGHT ALSO KNOW         │  │
│ │ Containers   │    │ Docker · Linux · Cloud      │  │
│ └──────────────┘    └─────────────────────────────┘  │
│ CONCEPT MAP                                          │
│      Containers ▼                                    │
│      Kubernetes ──── Networking                      │
│      ┌─────┼─────┐                                   │
│     Pod  Service Deployment                          │
│ [ Explore in 3D ]     [ Test yourself ]             │
│ DEEPER: Architecture • Examples • Misconceptions •   │
│         History                                      │
└──────────────────────────────────────────────────────┘
```

### [S1] The normal term page (graph is a secondary action)
```
┌──────────────────────────────────────────┐
│ Kubernetes  ·  Container orchestration    │
│ [Beginner] [Platform Engineering]         │
│ Definition / In simple terms / Why it     │
│ matters                                   │
│ Key concepts  [Container][Pod][Cluster]   │
│ ┌──────────────────────────────────────┐ │
│ │ What should I learn first?           │ │
│ │ Container → Docker → ...             │ │
│ └──────────────────────────────────────┘ │
│ Continue learning →   Explore connections→│
└──────────────────────────────────────────┘
```

### [S1] The 3D control panel (spatial-lens selector)
```
┌──────────────────────────────────────┐
│ 3D MAP                               │
│ Layout   ○ Organic ○ Hierarchical    │
│          ○ Galaxy                    │
│ Spatial axes                         │
│   X  Domain                          │
│   Y  Abstraction                     │
│   Z  Learning difficulty             │
│ Relationships                        │
│   ☑ Prerequisites ☑ Related          │
│   ☑ Part-of ☐ Implements             │
│ Graph algorithm                      │
│   ○ None ● BFS ○ DFS ○ Shortest path │
└──────────────────────────────────────┘
```

### [S1] The "Continue learning" card
```
┌─────────────────────────────────────────┐
│ Kubernetes                              │
│ concise explanation · "In simple terms" │
│ Key concepts: Container · Pod · Cluster │
│ ─────────────────────────────────────── │
│ Explore the concept                     │
│ [Wikipedia] [CNCF] [Official Docs]      │
│ [GeeksforGeeks] [Tutorial]              │
└─────────────────────────────────────────┘
```

---

## 4. The built demo — three visual variants  ·  [S5]

The demo ships three files sharing one corpus and relationship model. They are the
concrete visual-direction candidates.

| Variant | Direction | Distinct to it |
|---|---|---|
| **Atlas** (light Modernist) | Flat, square corners, 2px rules, a single red accent. | Stack view; hand-assigned abstraction levels with a rail down the canvas; no axis toggle; no edge animation. |
| **Atlas Dark** | Dark Modernist — strict chrome, atmosphere confined to the canvas. | Glow-strength and edge-flow tweak controls; animated edges; taxonomy-depth / free-layout axis toggle. |
| **Atlas Neon** | Reference-matched — navy ground, five saturated hues, glow, rounded cards. | Background motes (toggleable); degree-sized glowing nodes with radial-gradient halo/outer glow/specular; axis gizmo; two-column Key Concepts; "Show more" related terms. |

The Neon variant is the one built to match the dark, glowing, domain-colour-coded
aesthetic shared by most of the inspiration images (§1 Common threads).

---

## 5. Atlas graph-rendering mechanics (the built reference)  ·  [S5]

For a frontend engineer, the demo already encodes concrete, tuned rendering
behaviour. Full table in `05_FEATURE_OVERVIEW.md` §3; the key parameters:

- **Layout:** force solve — inverse-square repulsion between every pair, spring
  attraction along every edge, cooling schedule; 320 iterations (light) / 340
  (Dark, Neon). Domains seeded on a circle so clusters separate. Solved once at
  load, then each frame projected from the cached 3D frame (no live physics).
- **Node size:** degree-scaled. Neon uses `4.2 + √degree × 2.7`; others use a
  capped linear scale.
- **Node colour:** one hue per domain; Neon adds halo + outer glow + specular.
- **Selection pivot:** the selected node becomes the rotation origin, dead centre;
  selecting another swings the whole scene to the new anchor.
- **Selection pulse:** three rings from the node's edge, expanding and fading
  quadratically, staggered by a third of a cycle (outward only). (Dark still uses
  the older single oscillating "breathing" ring — flagged as a to-fix.)
- **Edge animation:** dashes travel source → target via animated dash offset; links
  touching the selection run ~4× faster, brighter, glowing; others dim. (Dark, Neon
  only.)
- **Edge styling:** line style + colour encode the relationship family — solid
  taxonomy, long-dash mechanics, dotted lineage, short-dash study.
- **Focus dimming:** everything outside the selected term's immediate neighbourhood
  drops to ~24% opacity.
- **Auto-fit camera:** recomputes the visible bounding box every frame and eases
  scale toward a fit.
- **Label placement:** priority order (selected → hovered → neighbour → high-degree),
  three candidate positions per label, collision rejection against placed labels and
  UI overlays.
- **Background motes:** 300 domain-tinted particles on a sphere, same camera
  projection, for parallax depth (Neon, toggleable).
- **Controls:** left-drag orbit, scroll zoom, click select, hover preview, Escape
  deselect; auto-rotate pauses on first manual orbit; right/middle/shift-drag pan
  (Dark, Neon).

---

## 6. Consolidated visual-direction takeaways (for the cut/keep session)

Descriptive synthesis of the above — every point traces to a source image or the
built demo; none is a new decision:
- **Dark, immersive canvas** is the dominant reference direction (Neon variant
  already targets it); a **light Modernist** alternative exists (Atlas light +
  `knowledge graph explorer.jpg`).
- **Domain = colour** is universal across the sources; **entity type = shape** is a
  distinct, un-adopted second channel seen only in the dark Explorer mockup (§2).
- **Node size = degree/centrality** appears in the demo and in `network
  visualizer.jpg`.
- **Relationship family = edge line-style + colour** is built into Atlas; **edge
  labels as natural-language phrases** is a strong idea from `knowledge graph
  visualization.jpg` and `graph.jpg`.
- **Pair the graph with a rich reading/definition pane** — the single most
  consistent pattern (ChatGPT mock, graph.jpg, and all the chat term-page mockups),
  and the one that most distinguishes a *lexicon* from a generic graph tool.
- **Selectable layout/view modes** and **per-domain filter legends** recur
  everywhere and match the product's stated view-switcher plans (`03_ARCHITECTURE.md`
  §6).
- **Avoid the hairball:** every 3D reference that renders thousands of nodes becomes
  a bloom, not a readable graph — reinforcing the sources' "query-driven,
  progressive-loading, neighbourhood-first" stance.
