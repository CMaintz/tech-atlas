---
title: NIS2 in practice - what the directive demands and how to work with it
term: security/nis2
lang: en
---

## What NIS2 is and who it applies to

NIS2 is Directive (EU) 2022/2555 on measures for a high common level of cybersecurity across the Union. It replaces the first NIS Directive (2016/1148), which covered a narrow set of "operators of essential services" and was applied very unevenly between member states. As a _directive_, NIS2 does not apply directly: each member state writes it into national law. In Denmark this is the NIS2 law (_NIS2-loven_), in force since 1 July 2025, with _Styrelsen for Samfundssikkerhed_ (SAMSIK, the Danish Resilience Agency), as the coordinating authority and sector authorities supervising their own sectors. Incident reports are made via Virk.dk and handled by the Danish Defence Intelligence Service (_Forsvarets Efterretningstjeneste_) as national CSIRT; Center for Cybersikkerhed (CFCS), whose advisory work moved into the agency in January 2025, publishes threat assessments and guidance. Finance is largely governed by DORA instead.

Scope is decided by **sector** and **size**:

- **Annex I - sectors of high criticality**: energy, transport, banking, financial market infrastructure, health, drinking water, waste water, digital infrastructure, managed ICT services (B2B), public administration and space.
- **Annex II - other critical sectors**: postal and courier services, waste management, chemicals, food, manufacturing (e.g. medical devices, electronics, machinery, vehicles), digital providers (online marketplaces, search engines, social networks) and research.
- **Size cap**: as a rule only _medium_ (50+ employees, or turnover and balance sheet above EUR 10 million) and _large_ organisations are in scope. Some entities are covered regardless of size, for example DNS providers, top-level domain registries, trust service providers and sole providers of a critical service.

In-scope organisations are either **essential** or **important** entities. Both face the same security and reporting duties; the difference is supervision. Essential entities are supervised proactively (inspections and audits can happen without any incident), while important entities are supervised reactively, typically after an incident or a complaint. The directive requires maximum fines of at least EUR 10 million or 2 % of global turnover for essential entities, and EUR 7 million or 1.4 % for important entities, whichever is higher.

## The key requirements

**Article 20 - governance.** The management body must _approve_ the cybersecurity risk-management measures, _oversee_ their implementation and can be held _liable_ for breaches. Members of management must follow training, and staff should be offered similar training regularly. This is the article that moves security from the IT department to the boardroom.

**Article 21 - risk-management measures.** Measures must be appropriate and proportionate to the risk, based on an "all-hazards" approach (not only hackers, but also fire, power failure and human error). Article 21(2) lists ten minimum areas:

|     | Minimum measure                                                                                   |
| --- | ------------------------------------------------------------------------------------------------- |
| a   | Policies on risk analysis and information system security                                         |
| b   | Incident handling                                                                                 |
| c   | Business continuity: backup management, disaster recovery, crisis management                      |
| d   | Supply chain security, including relationships with direct suppliers                              |
| e   | Security in acquisition, development and maintenance, incl. vulnerability handling and disclosure |
| f   | Policies and procedures to assess the effectiveness of the measures                               |
| g   | Basic cyber hygiene practices and cybersecurity training                                          |
| h   | Cryptography and, where appropriate, encryption                                                   |
| i   | Human resources security, access control policies and asset management                            |
| j   | Multi-factor or continuous authentication, secured voice/video/text and emergency communications  |

**Article 23 - reporting.** A _significant incident_ (one that has caused or can cause severe operational disruption or financial loss, or considerable damage to others) must be reported to the CSIRT or competent authority in stages:

| Deadline                             | Report                                                                                              |
| ------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Within 24 hours of becoming aware    | Early warning - is it suspected to be malicious, could it have cross-border impact?                 |
| Within 72 hours                      | Incident notification - initial assessment of severity, impact and indicators of compromise         |
| On request                           | Intermediate report on status                                                                       |
| Within one month of the notification | Final report - root cause, measures taken, cross-border impact (a progress report if still ongoing) |

Where relevant, the organisation must also inform the recipients of its services.

## How NIS2 connects to the other frameworks

NIS2 says _what_ must be achieved, not _how_. That is where the voluntary frameworks come in:

- **ISO 27001** gives the management system: risk assessment, policies, internal audit and management review. Its Annex A controls map well onto the ten areas of Article 21. A certificate is strong evidence, but it is not automatic NIS2 compliance - the scope of the certificate may not cover the relevant services, and ISO does not include the Article 23 reporting deadlines.
- **CIS Controls** give a prioritised, technical to-do list. Implementation Group 1 is a realistic starting point for "basic cyber hygiene" (Art. 21(2)(g)) in a smaller organisation.
- **D-mærket**, the Danish label for IT security and responsible data use, can be used as a structured self-assessment to see how far an organisation is from the NIS2 requirements, and to show maturity to customers and partners.
- **GDPR** runs in parallel: a single breach involving personal data may require a 24-hour NIS2 early warning _and_ a 72-hour GDPR notification to Datatilsynet - two reports to two different authorities.

## What a coordinator actually does with it

1. **Scope check.** Confirm whether the organisation is in scope, as essential or important, and register with the authority if the national law requires it.
2. **Gap analysis.** Compare current practice against the ten Article 21 areas. A simple spreadsheet with "requirement - current state - owner - next step" is often enough to start.
3. **Roadmap.** Prioritise the gaps by risk and effort; get management to approve the plan and the budget (Article 20 makes that approval a legal duty, not a courtesy).
4. **Reporting procedure.** Write down who decides that an incident is "significant", who submits the 24-hour early warning, and how the GDPR track is handled in parallel. Test it in a table-top exercise.
5. **Suppliers.** Inventory critical suppliers, add security terms to contracts and follow up.
6. **Training and documentation.** Arrange management training, run awareness for staff and keep evidence - minutes, approvals, training logs - because the supervisory authority will ask for it.

## Common misunderstandings

- **"We are too small."** Size matters, but some entities are in scope regardless, and suppliers to in-scope organisations will feel the requirements through their contracts anyway.
- **"It is an IT project."** Article 20 puts responsibility on management. IT carries out many of the measures, but approval and oversight cannot be delegated away.
- **"ISO 27001 certified means NIS2 compliant."** It helps a lot, but check scope, reporting and supply chain explicitly.
- **"We report when we know everything."** The 24-hour early warning is designed to be sent _before_ you know everything.
- **"Important entities are not supervised."** They are - just after the fact rather than proactively, and the duties are the same.
