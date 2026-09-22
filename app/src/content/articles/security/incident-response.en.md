---
title: Incident response — phases, roles and reporting deadlines
term: security/incident-response
lang: en
---

## What incident response is for

An incident is rarely the moment to start thinking. When ransomware is spreading or customer data is leaking, the organisations that cope best are the ones that decided in advance who does what, who may take which decision, and who must be told by when. Incident response is that advance preparation plus its disciplined execution. Its goals are simple to state: limit the damage, restore normal operations, preserve evidence, meet legal obligations and learn enough to make the next incident smaller.

## The NIST lifecycle

The most widely used model comes from NIST Special Publication 800-61. Revision 2 describes four phases; Revision 3 (2025) reorganises the guidance around the NIST Cybersecurity Framework 2.0, but the four-phase picture remains the common vocabulary in plans and exercises.

| Phase                                    | What happens                                           | Typical artefacts                                                            |
| ---------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------- |
| 1. Preparation                           | Build the capability before you need it                | Incident response plan, contact lists, playbooks, logging, backups, training |
| 2. Detection and analysis                | Notice that something is wrong and work out what it is | Alerts from SIEM/EDR, user reports, triage, severity rating, incident log    |
| 3. Containment, eradication and recovery | Stop the spread, remove the cause, bring systems back  | Isolated machines, reset credentials, patched systems, restored data         |
| 4. Post-incident activity                | Learn and improve                                      | Lessons-learned meeting, final report, updated plan and controls             |

The phases are a loop, not a line. Analysis often continues during containment, and every lesson learned feeds back into preparation.

### Preparation

Most of the value of incident response is created here. A plan should at least cover: what counts as an incident and how severity is rated; roles and deputies; contact details (internal, IT supplier, insurer, lawyer, authorities) stored somewhere reachable when the network is down; playbooks for the most likely scenarios such as ransomware, phishing with compromised accounts, and data sent to the wrong recipient; and the technical groundwork — logging, tested offline backups, and an up-to-date overview of systems and data.

### Detection and analysis

Incidents are spotted by monitoring tools, by suppliers, or very often by an employee who notices something odd. The team must quickly answer: Is this real? What is affected? Is personal data involved? Is it still going on? From the first minute, keep a timestamped log of observations and decisions — it becomes your evidence, your report to authorities and your basis for the lessons-learned review.

### Containment, eradication and recovery

Containment buys time: isolate infected machines, block accounts, cut a compromised connection to a supplier. It often involves trade-offs, since pulling a system offline also stops the business, which is why the plan must say who may make that call. Eradication removes the cause (malware, the attacker's access, the exploited vulnerability). Recovery restores systems, often from backup, and watches closely for signs that the attacker is back.

### Post-incident activity

Within a few weeks, hold a blameless review: What happened? What worked? What did not? What will we change, who owns it, and by when? Skipping this phase is the surest way to have the same incident again.

## Roles

Titles vary, but a workable team usually includes:

- **Incident lead / incident manager** — coordinates, sets priorities, keeps the log, decides within their mandate.
- **Technical responders** — internal IT or an external supplier who investigate and fix.
- **Management / crisis team** — makes business decisions: shutting down production, paying for external help, public statements.
- **Communications** — internal messages, customers, press.
- **Legal and data protection (DPO)** — assesses reporting duties and contractual obligations.
- **Scribe** — records times, facts and decisions so the lead can focus on leading.

Everyone should have a named deputy. Incidents do not respect holidays.

## Escalation and communication

The plan should define clear triggers for escalating: for example, when personal data may be affected, when critical systems are down, when the incident may be significant under NIS2, or when media attention is likely. Escalation should go to named people with named deputies, over channels that still work if email and the network are compromised — such as phone numbers on paper or a separate messaging system.

Communication should be few voices and one version of the truth. Employees need to know what to do (and not to talk to the press); customers and partners need timely, honest information; statements should be approved by the crisis team.

## Reporting deadlines

| Regime                               | Who is notified                                      | Deadline                                                                                                                                                   |
| ------------------------------------ | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NIS2 Art. 23 — early warning         | Competent authority / CSIRT                          | Within 24 hours of becoming aware of a significant incident                                                                                                |
| NIS2 Art. 23 — incident notification | Competent authority / CSIRT                          | Within 72 hours, with an initial assessment                                                                                                                |
| NIS2 Art. 23 — final report          | Competent authority / CSIRT                          | Within one month of the incident notification                                                                                                              |
| GDPR Art. 33                         | Data protection authority (in Denmark: Datatilsynet) | Without undue delay and, where feasible, within 72 hours of becoming aware of a personal data breach — unless it is unlikely to result in a risk to people |
| GDPR Art. 34                         | The affected individuals                             | Without undue delay, if the breach is likely to result in a high risk to them                                                                              |

The clocks run from when you become aware, not when the investigation is finished, so reports are often made with incomplete information and updated later. One incident can trigger several regimes at once, which is why the plan should name who assesses reporting duties and who submits each report.

## Table-top exercises

A plan that has never been tested is a hypothesis. A table-top exercise gathers the real participants around a table (or a video call) and walks them through a realistic scenario, with a facilitator releasing new information in stages: "It is Friday 16:30, the service desk reports that files on the shared drive have strange extensions…" Participants say what they would do, who they would call and what they would decide.

Good exercises are short (one to three hours), use a scenario relevant to the organisation, include management, and deliberately test the weak points: the deputy instead of the lead, the 24-hour NIS2 deadline, a backup that turns out to be incomplete. The output is a list of improvements to the plan — which is exactly what the post-incident phase would produce, without having to suffer the incident first.
