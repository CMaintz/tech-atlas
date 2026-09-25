---
title: GDPR for security coordinators - principles, security duties and breach reporting
term: security/gdpr
lang: en
---

## What GDPR is and who it applies to

The General Data Protection Regulation, Regulation (EU) 2016/679, has applied since 25 May 2018. Unlike NIS2 it is a _regulation_, so it applies directly in every member state. National law only fills in the gaps the regulation leaves open; in Denmark that is the Data Protection Act (_databeskyttelsesloven_), and the supervisory authority is Datatilsynet.

GDPR applies to anyone who processes **personal data** - any information about an identified or identifiable living person - in an organised way. There is no size threshold and no sector list: a two-person webshop, a municipality and a hospital are all covered. Two roles matter:

- The **controller** (_dataansvarlig_) decides why and how data is processed and carries the main responsibility.
- The **processor** (_databehandler_) processes data on the controller's behalf - for example a cloud provider, payroll bureau or IT supplier.

GDPR also reaches organisations outside the EU when they offer goods or services to people in the EU or monitor their behaviour.

## The key requirements

**Article 5 - the principles.** Everything else in GDPR follows from these:

| Principle                             | In plain terms                                                             |
| ------------------------------------- | -------------------------------------------------------------------------- |
| Lawfulness, fairness and transparency | Have a legal basis, do not surprise people, tell them what you do          |
| Purpose limitation                    | Collect for specified purposes and do not reuse for something incompatible |
| Data minimisation                     | Only what is necessary for the purpose                                     |
| Accuracy                              | Keep it correct and up to date                                             |
| Storage limitation                    | Delete or anonymise when no longer needed                                  |
| Integrity and confidentiality         | Protect it with appropriate security                                       |
| Accountability (Art. 5(2))            | Be able to _demonstrate_ that you comply                                   |

Article 6 lists the six legal bases (consent, contract, legal obligation, vital interests, public task and legitimate interests). Article 9 adds stricter rules for special categories such as health data, and data subjects have rights under Articles 15-22: access, rectification, erasure, restriction, portability and objection.

**Article 25 - data protection by design and by default.** Protection must be built into systems and processes from the start, and the default settings must process only what is necessary. For a coordinator this means getting into projects early, not reviewing them the week before go-live.

**Article 28 - processors.** When a supplier processes personal data for you, a written **data processing agreement** is mandatory. It must state, among other things, that the processor acts only on documented instructions, keeps staff bound by confidentiality, implements Article 32 security, uses sub-processors only with authorisation, assists with data-subject rights and breaches, and deletes or returns data at the end. The controller must also follow up - for example by reviewing audit reports from the supplier.

**Article 30 - records of processing activities.** A register of what data you process, why, about whom and for how long. It is the backbone of most GDPR work.

**Article 32 - security of processing.** Controller and processor must implement "appropriate technical and organisational measures" matched to the risk. The article mentions pseudonymisation and encryption, ongoing confidentiality, integrity, availability and resilience, the ability to restore data after an incident, and regular testing of the measures. This is where GDPR meets ISO 27001 and the CIS Controls.

**Articles 33 and 34 - personal data breaches.**

| Who                                    | When                                                                      | What                                                               |
| -------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Controller → Datatilsynet (Art. 33)    | Without undue delay, and where feasible within 72 hours of becoming aware | Notify unless the breach is unlikely to result in a risk to people |
| Processor → controller (Art. 33(2))    | Without undue delay                                                       | Tell the controller so the clock can start                         |
| Controller → affected people (Art. 34) | Without undue delay                                                       | When the breach is likely to result in a _high_ risk               |
| Controller (Art. 33(5))                | Always                                                                    | Document every breach internally, reported or not                  |

Article 35 requires a **data protection impact assessment** for high-risk processing, and Article 37 requires a data protection officer in certain cases, such as public authorities. Article 83 sets two tiers of maximum fines: up to EUR 10 million or 2 % of global annual turnover, and up to EUR 20 million or 4 % for breaches of the principles and rights - in both cases whichever is higher. In Denmark, fines are as a rule set by the courts after Datatilsynet has reported a case to the police.

## How GDPR connects to the other frameworks

- **NIS2** protects the services society depends on; GDPR protects people's data. They overlap in security and incident reporting. One ransomware attack at an in-scope company can require a 24-hour NIS2 early warning _and_ a 72-hour notification to Datatilsynet.
- **ISO 27001** gives a management system that makes Article 32 and accountability demonstrable. Annex A includes a specific control on privacy and protection of personal data. ISO/IEC 27701 extends it with privacy-specific requirements.
- **CIS Controls** provide concrete measures behind "appropriate security" - data protection (Control 3), access control (Controls 5 and 6) and data recovery (Control 11) in particular.
- **D-mærket** combines IT security with responsible data use, which makes it a natural framework for smaller businesses that handle a lot of personal data.

## What a coordinator actually does with it

- Keep the **Article 30 record** alive - update it whenever a new system or supplier arrives.
- Maintain the **list of processors** and their agreements, and follow up on them yearly.
- Run the **breach procedure**: who assesses risk, who notifies Datatilsynet, who talks to affected people. Practise it together with the NIS2 procedure if both apply.
- Bring **privacy by design** into projects and procurement; trigger a DPIA when the processing is high-risk.
- Include GDPR in **awareness**: emails sent to the wrong recipient are among the most common breaches, and staff need to know they must report them.

## Common misunderstandings

- **"GDPR is about consent."** Consent is only one of six legal bases, and often not the best one.
- **"The processor is responsible."** The controller stays responsible for choosing and supervising processors.
- **"Only big data leaks must be reported."** Every breach must be documented; reporting depends on risk, not size.
- **"72 hours from when it happened."** The clock starts when the controller becomes _aware_ - which is why the data processing agreement should give processors a short, fixed deadline for telling you.
- **"GDPR is legal's job."** Article 32 is a security requirement, and security staff are the ones who can meet it.
