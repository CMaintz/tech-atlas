# Compendium coverage

Checks every security / IT-security concept in the course compendium
(_Cyber Security Fast Track — Kursuskompendium 2026_, `_ingest/kursuskompendium.txt`, which is gitignored)
against Atlas. The whole compendium was read: purpose, progression, learning
outcome, Modul 1–8 (purpose, learning goals and content) and the full _Ordliste_. The other
`_ingest/` files are product and chat documents, not course material, so they were not used.

**Status key.** `present` means an existing term covers the concept. `NEW` means a term was added in this change.
`alias` means the concept is a synonym, added as `aka` on an existing term. `no term` means the concept
was considered and deliberately left out, with the reason given. Module numbers follow the module
headings (for example Risikostyring is headed "Modul 5", although the progression list calls it Modul 6).
Ids without a prefix are `security/`.

## Summary

| Count                                      |   n |
| ------------------------------------------ | --: |
| Distinct concepts found                    | 144 |
| Already present (existing term)            |  97 |
| Added as new terms (`NEW`)                 |  34 |
| Added as aliases on existing terms         |   4 |
| Considered, no term (reason given)         |   9 |
| Edges added on existing terms (`edges:` only) | 48 |

Every entry in the Ordliste resolves to a term, and every relationship the Ordliste states
is now an edge. For example, "Kontrol: tiltag, der reducerer risiko" is now `control mitigates risk`.
The "Minimumskrav (NIS2)" list is now `nis2-minimum-requirements mandates` risk-management,
incident-response, security-awareness, supplier-management and management-responsibility.

## 1. Fundamentals (Modul 1, Ordliste "Grundlæggende begreber")

| Concept                                        | Where in compendium                            | Atlas id                                               | Status                                  |
| ---------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------ | --------------------------------------- |
| Cyber- og informationssikkerhed                | Formål; Ordliste                               | cyber-and-information-security                         | present                                 |
| Fortrolighed                                   | Modul 1 LM1; Ordliste                          | confidentiality                                        | present                                 |
| Integritet                                     | Modul 1 LM1; Ordliste                          | integrity                                              | present                                 |
| Tilgængelighed                                 | Modul 1 LM1; Ordliste                          | availability                                           | present                                 |
| CIA-triaden                                    | Modul 1 LM1; Ordliste                          | cia-triad                                              | present                                 |
| Trussel                                        | Modul 1 LM1; Ordliste                          | threat                                                 | present                                 |
| Hacking (threat example)                       | Ordliste (Trussel)                             | threat-actor (aka "hacker")                            | alias                                   |
| Insiderfejl (threat example)                   | Ordliste (Trussel)                             | human-error                                            | NEW                                     |
| Strømudfald (threat example)                   | Ordliste (Trussel)                             | —                                                      | no term: an everyday example of an availability threat, covered by `threat` and `availability` |
| Sårbarhed                                      | Modul 1 LM1; Ordliste                          | vulnerability                                          | present                                 |
| Risiko                                         | Modul 1 LM1; Ordliste                          | risk                                                   | present                                 |
| Sandsynlighed (part of risk)                   | Ordliste (Risiko)                              | likelihood                                             | present                                 |
| Konsekvens (part of risk)                      | Ordliste (Risiko)                              | impact                                                 | present                                 |
| Kontrol (foranstaltning)                       | Modul 1 LM1+3; Ordliste                        | control                                                | present                                 |
| Tekniske kontroller                            | Modul 1 LM3; Ordliste (Kontrol)                | technical-control                                      | NEW                                     |
| Organisatoriske kontroller                     | Modul 1 LM3; Ordliste (Kontrol)                | organisational-control                                 | NEW                                     |
| Fysiske kontroller                             | Modul 1 LM3                                    | physical-security (aka "physical controls")            | present                                 |
| Menneskelig foranstaltning                     | Ordliste (Kontrol)                             | people-control                                         | NEW                                     |
| Governance                                     | Formål; Ordliste                               | governance                                             | present                                 |
| Governance, risk og compliance (GRC)           | Formål ("governance- risk- og compliance opgaver") | grc                                                | NEW                                     |
| Sikkerhedspolitik                              | Modul 2 LM5; Ordliste                          | security-policy                                        | present                                 |
| Compliance                                     | Formål; Modul 3; Ordliste                      | compliance                                             | present                                 |
| Cyberlandskabet og aktører                     | Modul 1 Indhold                                | threat-landscape, threat-actor                         | present                                 |
| Rammeværk / rammeværker                        | Formål; Modul 1 LM2                            | security-framework                                     | present                                 |
| Kontrolmodeller                                | Modul 1 Indhold                                | security-framework (aka "control framework")           | alias                                   |
| IT-drift                                       | Formål; Modul 4; Modul 7                       | it-operations                                          | NEW                                     |
| Legacy-systemer                                | Modul 4 LM3                                    | legacy-system                                          | NEW                                     |

## 2. People, culture and awareness (Modul 2, Ordliste "Mennesker, kultur og awareness")

| Concept                                        | Where in compendium                            | Atlas id                                               | Status                                  |
| ---------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------ | --------------------------------------- |
| Awareness                                      | Progression; Modul 2; Ordliste                 | security-awareness                                     | present                                 |
| Awareness-program / -kampagne / -plan          | Formål; Modul 2 Formål, LM1, Indhold           | awareness-programme                                    | NEW                                     |
| Sikkerhedskultur                               | Modul 2; Ordliste                              | security-culture                                       | present                                 |
| Menneskelige faktorer                          | Modul 2 Indhold                                | human-factor                                           | NEW                                     |
| Social engineering                             | Ordliste                                       | social-engineering                                     | present                                 |
| Phishing                                       | Ordliste                                       | phishing                                               | present                                 |
| Spear phishing                                 | Ordliste                                       | spear-phishing                                         | present                                 |
| Ransomware                                     | Ordliste                                       | ransomware                                             | present                                 |
| Shadow IT                                      | Ordliste                                       | shadow-it                                              | present                                 |
| Nudging                                        | Modul 2 LM4; Ordliste                          | nudging                                                | present                                 |
| Human firewall                                 | Ordliste                                       | human-firewall                                         | present                                 |
| Phishing-simulationer                          | Modul 2 LM2                                    | phishing-simulation                                    | present                                 |
| Målbare KPI'er og evalueringsmetoder           | Modul 2 LM3                                    | security-metrics                                       | NEW                                     |
| Awareness maturity                             | Ordliste (Ekstra)                              | awareness-maturity                                     | present                                 |
| Stakeholders, målgrupper, budskaber            | Modul 2 LM1                                    | —                                                      | no term: general communication planning, covered in the `awareness-programme` text |
| E-learning, workshops                          | Modul 2 LM2                                    | —                                                      | no term: general teaching methods, not security concepts |
| Barrierer, modstand, incitamenter              | Modul 2 LM4; Modul 4 LM3                       | —                                                      | no term: general change management; `nudging` covers the security-specific technique |

## 3. Controls and technical basics (Modul 4, Modul 6, Ordliste "Kontroller og tekniske grundbegreber")

| Concept                                        | Where in compendium                            | Atlas id                                               | Status                                  |
| ---------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------ | --------------------------------------- |
| CIS-kontroller / Center for Internet Security  | Modul 1; Modul 4; Ordliste                     | cis-controls                                           | present                                 |
| Asset inventory                                | Modul 4 LM1; Ordliste                          | asset-inventory                                        | present                                 |
| Aktiver                                        | Modul 5 Indhold                                | asset                                                  | present                                 |
| Adgangsstyring / adgangskontrol                | Modul 4 LM1; Ordliste                          | access-management, cs/access-control                   | present                                 |
| Multifaktorgodkendelse (MFA)                   | Ordliste                                       | mfa                                                    | present                                 |
| Sikkerhedsfaktor (MFA factor)                  | Ordliste (MFA: "ekstra sikkerhedsfaktor")      | authentication-factor                                  | NEW                                     |
| SMS-kode                                       | Ordliste (MFA)                                 | one-time-password                                      | NEW                                     |
| App-godkendelse                                | Ordliste (MFA)                                 | mfa, authentication-factor (possession factor)         | present                                 |
| To-faktorautentificering (2FA)                 | Ordliste (Ekstra)                              | two-factor-authentication                              | present                                 |
| Patch management                               | Modul 4 LM1; Ordliste                          | patch-management                                       | present                                 |
| Backup                                         | Ordliste                                       | backup                                                 | present                                 |
| SIEM                                           | Progression; Modul 6; Ordliste                 | siem                                                   | present                                 |
| IDS                                            | Ordliste                                       | intrusion-detection-system                             | present                                 |
| IPS                                            | Ordliste                                       | intrusion-prevention-system                            | present                                 |
| Endpoint                                       | Ordliste                                       | endpoint                                               | present                                 |
| Zero Trust                                     | Ordliste                                       | zero-trust                                             | present                                 |
| Vulnerability scanning                         | Ordliste                                       | vulnerability-scanning                                 | present                                 |
| Penetrationstest (pentest)                     | Ordliste                                       | penetration-test                                       | present                                 |
| Sårbarhedsvurdering                            | Ordliste (Ekstra)                              | vulnerability-assessment                               | present                                 |
| Threat intelligence                            | Ordliste (Ekstra)                              | threat-intelligence                                    | present                                 |
| Data classification                            | Ordliste (Ekstra)                              | data-classification                                    | present                                 |
| Change management                              | Ordliste (Ekstra)                              | change-management                                      | present                                 |
| Security by design                             | Ordliste (Ekstra)                              | security-by-design                                     | present                                 |
| Loganalyse                                     | Progression (Modul 5/6)                        | log-management (aka "log analysis")                    | alias                                   |
| Logindsamling                                  | Modul 6 Indhold                                | log-management (aka "log collection")                  | alias                                   |
| Datastrømme, logformat                         | Modul 6 LM2                                    | cs/log, log-management                                 | present                                 |
| Trigger-regler                                 | Modul 6 LM2                                    | detection-rule (aka "trigger rule")                    | present                                 |
| Detektion                                      | Modul 6 Indhold                                | security-monitoring, detection-rule                    | present                                 |
| Alarmer / alarm                                | Progression; Modul 6 Indhold                   | platform/alerting, alert-triage                        | present                                 |
| Uregelmæssigheder (anomalies)                  | Ordliste (SIEM)                                | anomaly-detection                                      | present                                 |
| Campfire Security-platformen, SAGA Labs        | Progression; Modul 6                           | —                                                      | no term: vendor training platforms, not concepts. The concepts practised there (SIEM, log analysis, alerts, incident response) are all present |

## 4. Risk management (Modul 5, Ordliste "Risikostyring")

| Concept                                        | Where in compendium                            | Atlas id                                               | Status                                  |
| ---------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------ | --------------------------------------- |
| Risikostyring                                  | Modul 5; Ordliste                              | risk-management                                        | present                                 |
| Risikoidentifikation                           | Modul 5 LM1                                    | risk-identification                                    | NEW                                     |
| Risikoanalyse / -vurdering                     | Formål; Modul 5 LM1–2                          | risk-assessment (aka "risk analysis", "risikovurdering") | present                               |
| Kvalitativ risikoanalyse                       | Modul 5 LM2                                    | qualitative-risk-analysis                              | NEW                                     |
| Kvantitativ risikoanalyse                      | Modul 5 LM2                                    | quantitative-risk-analysis                             | NEW                                     |
| Risikomatrix                                   | Modul 5 LM2                                    | heat-map (aka "risk matrix")                           | present                                 |
| Heat-map                                       | Modul 5; Ordliste                              | heat-map                                               | present                                 |
| Risikohåndtering                               | Modul 5 LM1+3; Ordliste                        | risk-treatment                                         | present                                 |
| Accept (acceptere)                             | Modul 5 LM3; Ordliste                          | risk-acceptance                                        | NEW                                     |
| Reduktion (reducere)                           | Modul 5 LM3; Ordliste                          | risk-mitigation                                        | NEW                                     |
| Overførsel (overføre)                          | Modul 5 LM3; Ordliste                          | risk-transfer                                          | NEW                                     |
| Afvisning (eliminere)                          | Modul 5 LM3; Ordliste                          | risk-avoidance                                         | NEW                                     |
| Løbende monitorering                           | Modul 5 LM1                                    | risk-monitoring                                        | NEW                                     |
| Risikoprofil                                   | Modul 4 LM2                                    | risk-profile                                           | NEW                                     |
| Trusselsbillede / trussels- og sårbarhedsbilleder | Progression; Ordliste                       | threat-landscape                                       | present                                 |
| Kritiske aktiver / nøgleprocesser og systemer  | Modul 7 LM4; Ordliste                          | critical-assets                                        | present                                 |
| Konsekvensanalyse (BIA)                        | Ordliste                                       | business-impact-analysis                               | present                                 |
| Residual risiko                                | Ordliste                                       | residual-risk                                          | present                                 |
| Risikoappetit                                  | Ordliste                                       | risk-appetite                                          | present                                 |
| Rapportering og ledelsesdialog                 | Modul 5 LM5                                    | security-metrics, management-responsibility            | present                                 |

## 5. Compliance, governance and law (Modul 1, 3, 8, Ordliste "Compliance, styring og lovgivning")

| Concept                                        | Where in compendium                            | Atlas id                                               | Status                                  |
| ---------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------ | --------------------------------------- |
| NIS-direktivet / NIS1                          | Modul 1 LM4; Modul 3 ("forskelle fra NIS1")    | nis1                                                   | present                                 |
| NIS2-direktivet                                | Modul 3; Modul 8; Ordliste                     | nis2                                                   | present                                 |
| EU-direktiv ("som alle medlemslande skal efterleve") | Ordliste (NIS2)                          | eu-directive                                           | NEW                                     |
| EU-lov (GDPR as directly applicable EU law)    | Ordliste (GDPR)                                | eu-regulation                                          | NEW                                     |
| Vigtige og kritiske sektorer                   | Ordliste (NIS2)                                | nis2-entities                                          | present                                 |
| Minimumskrav (NIS2)                            | Ordliste                                       | nis2-minimum-requirements                              | present                                 |
| Ledelsesansvar                                 | Modul 3 LM1; Ordliste                          | management-responsibility                              | present                                 |
| Rapporteringspligt                             | Modul 3 LM1                                    | incident-reporting                                     | present                                 |
| Leverandørstyring                              | Modul 3 LM1; Ordliste                          | supplier-management                                    | present                                 |
| Sikkerhedshændelser                            | Modul 3 LM1; Modul 7                           | security-incident                                      | present                                 |
| NIS2 konsekvenser (sanktioner)                 | Modul 3 Indhold                                | —                                                      | no term: part of the `nis2` / `management-responsibility` definitions, not a separate concept |
| Databehandleraftale (DPA)                      | Ordliste                                       | data-processing-agreement                              | present                                 |
| Leverandører der håndterer persondata          | Ordliste (DPA)                                 | data-processor                                         | present                                 |
| Persondata / personoplysninger                 | Ordliste (DPA, GDPR)                           | personal-data                                          | present                                 |
| GDPR                                           | Ordliste                                       | gdpr                                                   | present                                 |
| ISO 27000-serien                               | Modul 1 LM2                                    | iso-27000-series                                       | NEW                                     |
| ISO 27001                                      | Modul 1; Modul 3; Modul 8; Ordliste            | iso-27001                                              | present                                 |
| ISO 27002                                      | Ordliste                                       | iso-27002                                              | present                                 |
| ISO 27001 appendix (Annex A)                   | Modul 3 LM2                                    | annex-a                                                | NEW                                     |
| ISMS (ISO 27001 structure)                     | Modul 3 LM2 ("struktur og nøgleelementer")     | isms                                                   | present                                 |
| NIST                                           | Modul 1 LM2                                    | nist-csf                                               | present                                 |
| Kontinuerlig forbedring (PDCA)                 | Modul 3 LM2+4; Ordliste                        | pdca                                                   | present                                 |
| Gap-analyse                                    | Modul 3 LM4; Ordliste                          | gap-analysis                                           | present                                 |
| Roadmap ("vejen til god compliance")           | Modul 3 LM4                                    | compliance-roadmap                                     | NEW                                     |
| Audit                                          | Ordliste                                       | security/audit                                         | present                                 |
| D-mærket                                       | Progression; Modul 1; Modul 8; Ordliste        | d-maerket                                              | present                                 |
| Selvevaluering / selvevalueringsværktøj        | Progression; Modul 8                           | self-assessment                                        | NEW                                     |
| Modenhed                                       | Modul 8 Formål                                 | security-maturity                                      | NEW                                     |
| Dataetik / ansvarlig dataanvendelse            | Modul 8                                        | data-ethics (aka "responsible use of data")            | present                                 |
| Datasikkerhed (D-mærket area)                  | Modul 8 Indhold                                | cyber-and-information-security                         | present                                 |
| Transparens, brugerinddragelse (D-mærket areas) | Modul 8 Indhold                               | —                                                      | no term: D-mærket criteria areas, covered by `d-maerket` and `data-ethics` |
| Privacy by design                              | Ordliste (Ekstra)                              | privacy-by-design                                      | present                                 |
| Myndigheder                                    | Modul 8 Formål                                 | supervisory-authority, cfcs                            | present                                 |

## 6. Incident response and continuity (Modul 6–7, Ordliste "Beredskab og hændelser")

| Concept                                        | Where in compendium                            | Atlas id                                               | Status                                  |
| ---------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------ | --------------------------------------- |
| Incident response / responshåndtering          | Progression; Modul 6                           | incident-response                                      | present                                 |
| Beredskabsplan / hændelsesberedskab            | Formål; Modul 7; Ordliste                      | contingency-plan                                       | present                                 |
| Business Continuity Plan (BCP)                 | Ordliste                                       | business-continuity-plan                               | present                                 |
| Krise ("under en krise")                       | Ordliste (BCP, Kommunikationsplan); Modul 7    | crisis-management                                      | NEW                                     |
| Disaster Recovery Plan (DRP) / genopretningsplan | Progression; Modul 7; Ordliste               | disaster-recovery-plan                                 | present                                 |
| Eskaleringsprocedurer / eskalere fund          | Modul 6 Indhold; Modul 7 LM2                   | escalation-procedure                                   | NEW                                     |
| Roller og ansvarsområder under en hændelse     | Modul 7 LM2                                    | —                                                      | no term: part of `contingency-plan`, with `escalation-procedure` and `crisis-management` |
| Table-top øvelse                               | Modul 7 LM3; Ordliste                          | table-top-exercise                                     | present                                 |
| Kommunikationsplan / kommunikationsveje, medier | Modul 7; Ordliste                             | communication-plan                                     | present                                 |
| Lessons learned / evaluering af planer         | Modul 7 Indhold; Ordliste                      | lessons-learned                                        | present                                 |
| Data breach                                    | Ordliste (Ekstra)                              | data-breach                                            | present                                 |

## 7. Roles (Formål, Kursistens udbytte)

| Concept                                        | Where in compendium                            | Atlas id                                               | Status                                  |
| ---------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------ | --------------------------------------- |
| Grå roller                                     | Formål; Kursistens udbytte                     | grey-roles                                             | NEW                                     |
| Informationssikkerhedskoordinator              | Kursistens udbytte                             | information-security-coordinator                       | NEW                                     |
| Compliance- og risk-koordinator                | Formål; Kursistens udbytte                     | compliance-and-risk-coordinator                        | NEW                                     |
| Awareness- eller træningsansvarlig             | Formål; Kursistens udbytte                     | awareness-officer                                      | NEW                                     |
| Projektleder / blækspruttefunktion / brobygger | Formål; Kursistens udbytte                     | —                                                      | no term: general job descriptions; `grey-roles` covers the security meaning |

## Relationships added on existing terms (`edges:` only)

These are relationships the compendium states or implies:

- `control` mitigates `risk` (Ordliste: "Tiltag, der reducerer risiko").
- `nis2-minimum-requirements` mandates `risk-management`, `incident-response`, `security-awareness`,
  `supplier-management` and `management-responsibility` (Ordliste: Minimumskrav).
- `compliance` used-with `nis2`, `gdpr` and `iso-27001` (Ordliste: "fx NIS2, GDPR, ISO 27001").
- `cis-controls` used-with `d-maerket` and `nis2`. `gap-analysis` used-with `iso-27001`
  (Modul 1 and Modul 8: the link between regulation, ISO 27001, CIS and D-mærket).
- `cis-controls` mandates `security-awareness`, `incident-response`, `penetration-test` and
  `log-management` (Modul 4: "de forskellige CIS-kontroller", CIS v8.1 Controls 8, 14, 17 and 18). `cis-controls` used-with `risk-profile`.
- `iso-27001` and `iso-27002` part-of `iso-27000-series`. `statement-of-applicability` requires `annex-a`.
- `nis1`, `nis2` and `cer-directive` kind-of `eu-directive`. `gdpr`, `dora` and `cyber-resilience-act` kind-of `eu-regulation`.
- `security-policy` kind-of `organisational-control`. `security-awareness` implements `people-control` and is
  used-with `security-policy` (Modul 2 LM5: "integrere awareness med politikker").
- `mfa` and `two-factor-authentication` require `authentication-factor`. `mfa` used-with `one-time-password`.
- `social-engineering` exploits `human-factor`. `awareness-maturity` kind-of `security-maturity` and used-with `security-metrics`.
- `phishing-simulation` part-of `awareness-programme`. `change-management` used-with `it-operations`.
- `heat-map` used-with `qualitative-risk-analysis`. `risk-appetite` contrasts-with `risk-profile`.
- `security/audit` contrasts-with `self-assessment`. `gap-analysis` and `d-maerket` used-with `self-assessment`. `d-maerket` used-with `security-maturity`.
- `alert-triage` used-with `escalation-procedure`. `communication-plan` and `business-continuity-plan` used-with `crisis-management`.
- `business-impact-analysis` requires `impact` (Ordliste: "konsekvenser for forretningen"). `data-processing-agreement` requires `personal-data`.

Not changed, on purpose: `ai/eu-ai-act` could also be kind-of `eu-regulation`. It was left alone
because another agent is working on the AI domain. It is a one-line follow-up.
