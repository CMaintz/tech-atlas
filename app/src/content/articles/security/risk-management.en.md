---
title: Risk management from first workshop to board report
term: security/risk-management
lang: en
---

## Why a process at all

Every organisation already manages risk informally: someone worries about backups, someone else about phishing, and the budget goes to whoever argues loudest. Risk management replaces that with a repeatable process, so decisions can be explained, compared year on year and defended to an auditor or a supervisory authority. NIS2 Article 21 requires "appropriate and proportionate" measures based on an all-hazards approach, and ISO/IEC 27001 (clauses 6.1 and 8) requires a documented risk assessment and treatment plan.

The two standards you will meet most often are **ISO 31000**, which describes risk management for any kind of organisation, and **ISO/IEC 27005**, which applies the same process to information security. They share one cycle.

## The cycle

| Step                  | Key question                                                     | Typical output                                              |
| --------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------- |
| Context               | What are we protecting, and what level of risk can we live with? | Scope, asset list, risk criteria, risk appetite             |
| Identification        | What could go wrong?                                             | Risk register: asset + threat + vulnerability + consequence |
| Analysis              | How likely, and how bad?                                         | Likelihood and consequence score per risk                   |
| Evaluation            | Which risks exceed what we accept?                               | Prioritised list, heat map                                  |
| Treatment             | What do we do about each one?                                    | Treatment plan with owners, deadlines, budget               |
| Monitoring and review | Is it working, and has anything changed?                         | Updated register, KPIs, next review date                    |

Running alongside all of these is **communication and consultation**: the people who own the processes, not only the security team, must take part, or the register will describe an organisation that does not exist.

### Context

Before listing a single risk, agree on the scope (the whole company, one site, one service), the key assets (information, systems, people, suppliers), and the **risk criteria**: how you will score likelihood and consequence, and where the line between acceptable and unacceptable sits. Skipping this step is the most common reason risk workshops end in arguments, because everyone is scoring against a different scale.

### Identification

A useful risk statement names an asset, a threat, a vulnerability and a consequence: "Ransomware (threat) exploits unpatched VPN appliances (vulnerability), encrypting the ERP system (asset), halting order handling for days (consequence)." Sources include threat assessments from national authorities, incident history, audit findings, supplier dependencies and interviews with process owners.

### Analysis: qualitative or quantitative

**Qualitative** analysis uses scales such as 1-5 for likelihood and 1-5 for consequence, with each level described in words ("could happen once in ten years", "loss of a key customer"). It is fast, works with little data and suits most small and mid-sized organisations. Its weakness is that the numbers look precise but are really judgements, so two people can score the same risk very differently.

**Quantitative** analysis expresses risk in money: for example expected annual loss, or a range of possible losses built from estimated frequency and impact. It speaks the language of the CFO and makes cost-benefit comparisons easy, but it demands data and effort, and the result is only as good as the estimates behind it.

Many organisations start qualitative and add quantitative estimates for the handful of risks where a large investment decision is on the table.

### Evaluation and the heat map

Plotting each risk on a grid of likelihood against consequence gives the **heat map** (or risk matrix): green cells are low, amber medium, red high. Comparing each position with the agreed risk criteria tells you which risks need treatment and in what order. The heat map is a communication tool, not a calculator - two risks in the same red cell may still deserve very different attention.

### Treatment

For each risk above the acceptance line, choose one or more of four options:

- **Reduce (modify)** - add or improve controls: patching, MFA, backups, training. The most common choice.
- **Transfer (share)** - move part of the consequence to someone else, typically through insurance or a contract with a supplier. Accountability stays with you.
- **Avoid** - stop the activity that creates the risk, such as retiring an unsupported system or not launching a service.
- **Accept (retain)** - consciously live with it, because treatment costs more than the harm it prevents. Acceptance must be a documented decision by someone with authority, not a silent default.

Each treatment gets an owner, a deadline and a budget, collected in a treatment plan.

### Monitoring and review

Threats, systems and suppliers change, so the register is revisited on a fixed schedule (often yearly, and quarterly for the top risks) and whenever something significant happens: a major incident, a new system, a merger, new legislation.

## Risk appetite and residual risk

**Risk appetite** is how much risk the leadership is willing to take on in pursuit of its goals. It should be set by the leadership, not by the security team, and expressed in terms they recognise: "We accept no more than a day's outage of order handling" is more useful than "we accept medium risks."

**Residual risk** is what remains after treatment. No control removes risk entirely, so the question is always whether the residual risk sits within the appetite. If it does not, either more treatment is needed or management must formally accept the gap. Recording both the inherent (before) and residual (after) score shows the value of the controls you paid for.

## Presenting risk to management

Under NIS2, management bodies must approve the risk-management measures and can be held liable for infringements, so the board is not just an audience but a decision-maker. A few habits help:

- **Lead with the business consequence**, not the technology: "orders stop for three days", not "CVE in the VPN gateway".
- **Show the top five to ten risks**, not the whole register, with a heat map and a trend arrow since the last report.
- **Ask for a decision.** For each major risk, present the options, their cost and the residual risk each leaves, and ask management to choose - including, explicitly, to accept.
- **Be honest about uncertainty.** A range ("between one and three days") is more credible than a false point estimate.
- **Close the loop** by reporting next time on what was done and whether the scores moved.

Done this way, risk management becomes the link between the security work and the organisation's budget and strategy, rather than a spreadsheet produced once a year for the auditor.
