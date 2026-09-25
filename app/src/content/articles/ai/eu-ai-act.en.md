---
title: The EU AI Act in practice - risk tiers, deadlines and what a coordinator does
term: ai/eu-ai-act
lang: en
---

## What the AI Act is and who it applies to

The Artificial Intelligence Act is Regulation (EU) 2024/1689. It entered into force on 1 August 2024 and, unlike NIS2, is a _regulation_: it applies directly in every member state without being rewritten into national law. National laws only fill in details such as which authorities supervise and how fines are handled. The Commission proposed it in April 2021; negotiations were overtaken by the arrival of ChatGPT in late 2022, which is why the final text contains a separate chapter on general-purpose AI models that was not in the original proposal.

The Act is product-safety law. It regulates AI systems as things placed on the market or put into service, and it assigns duties by **role**:

- **Providers** develop an AI system (or have it developed) and place it on the market under their own name. Most duties fall here.
- **Deployers** use an AI system in their own professional activity - a bank using a credit-scoring tool, a municipality using a case-sorting system.
- **Importers, distributors and authorised representatives** have supporting duties to check that what they pass on is compliant.

The Act reaches providers outside the EU when their systems are used in the EU. An organisation that substantially modifies a high-risk system, or puts its own name on one, can become its provider.

## The key requirements

### Four risk tiers

| Tier                        | Examples                                                                                                                                              | Consequence                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Unacceptable risk           | Social scoring, manipulation exploiting vulnerabilities, untargeted scraping of facial images, emotion recognition at work and in schools             | Banned                                                          |
| High risk                   | AI as a safety component in regulated products (Annex I); AI in recruitment, education, credit, essential services, law enforcement, etc. (Annex III) | Strict requirements before and during use                       |
| Limited (transparency) risk | Chat assistants, deepfakes, AI-generated text published to inform the public                                                                          | People must be told they are dealing with AI or AI-made content |
| Minimal risk                | Spam filters, AI in games, most office tools                                                                                                          | No new duties                                                   |

On top of these tiers, **general-purpose AI models** - the large models underneath many products - carry their own duties: technical documentation, information for downstream providers, a copyright policy and a summary of training content. Models with "systemic risk" (the most capable ones) must also be evaluated, have serious incidents reported and be adequately secured.

### Duties for high-risk systems

Providers must run a documented **risk management** process across the system's life, use training data of suitable quality and with attention to bias, keep technical documentation and automatic logs, give deployers clear instructions for use, design for **human oversight**, and achieve appropriate accuracy, robustness and cybersecurity. They need a quality management system, a conformity assessment and CE marking, registration in the EU database, and must report serious incidents to market surveillance authorities.

Deployers must use the system according to the instructions, assign competent people to oversee it, keep the logs under their control, monitor its operation, and inform people when a high-risk system is used to make decisions about them. Some deployers, notably public bodies, must carry out a fundamental rights impact assessment. Affected people can ask for an explanation of decisions based on high-risk systems.

### The timeline, including the 2026 change

| Date            | What applies                                                                           |
| --------------- | -------------------------------------------------------------------------------------- |
| 1 August 2024   | Entry into force                                                                       |
| 2 February 2025 | Prohibited practices banned; AI literacy provisions                                    |
| 2 August 2025   | Rules for general-purpose AI models; governance and penalties framework                |
| 2 August 2026   | Transparency duties for chat assistants, deepfakes and similar                         |
| 2 December 2027 | High-risk rules for Annex III uses (recruitment, credit, education, public services …) |
| 2 August 2028   | High-risk rules for AI built into products covered by EU product legislation (Annex I) |

The last two dates are not those in the original 2024 text, which set August 2026 and August 2027. Because the harmonised standards and guidance needed to comply were late, the EU adopted **Regulation (EU) 2026/1744** (part of the "Digital Omnibus") to move the high-risk deadlines to 2 December 2027 for Annex III and 2 August 2028 for Annex I. Older course material and many blog posts still show the original dates.

Maximum fines are EUR 35 million or 7 % of global turnover for prohibited practices, EUR 15 million or 3 % for most other breaches, and EUR 7.5 million or 1 % for supplying incorrect information to authorities.

## How the AI Act connects to the other frameworks

- **GDPR** protects personal data wherever it is used; the AI Act governs AI systems as products whether or not they touch personal data. A CV-screening tool is covered by both: GDPR for lawful processing and automated decision-making, the AI Act for the system's design and oversight.
- **NIS2** and the AI Act meet on cybersecurity and incident reporting. A serious AI incident may trigger reports under both, to different authorities.
- **ISO/IEC 42001**, the management-system standard for AI, plays the role ISO 27001 plays for information security: it does not equal compliance, but gives the governance skeleton the Act assumes.
- **NIST AI RMF** is a voluntary US framework that many organisations use to structure AI risk work, and it maps reasonably onto the Act's risk management duties.

## What a coordinator actually does with it

Take the scenario from the term definition. Sofie is a GRC student interning at a Danish recruitment firm that uses a CV-screening tool bought from a supplier.

1. **Inventory.** She lists every AI system in use, including features hidden in HR and CRM platforms. The CV tool, the website chat assistant and a translation service appear.
2. **Classify.** The chat assistant is limited risk (visitors must be told they are talking to AI, from August 2026). Translation is minimal risk. CV screening is listed in Annex III (employment), so it is **high risk**.
3. **Determine the role.** The firm did not build the tool, so it is a **deployer**. The supplier is the provider and carries the heavy design duties - but if the firm retrains the tool on its own data and markets it as its own, that could change.
4. **Gap analysis for the deployer duties.** Who oversees the tool and can override its rankings? Are logs kept? Are candidates informed? Is there a documented check for unfair results, e.g. across gender and age? She runs the GDPR check in parallel: a data protection impact assessment is very likely required.
5. **Supplier follow-up.** She asks the provider for its timeline to conformity assessment, CE marking and instructions for use ahead of **2 December 2027**, and adds these duties to the contract.
6. **Governance.** She proposes an AI policy approved by management, an owner for each AI system, and training so staff understand the tools they use.

## Common misunderstandings

- **"It only applies to companies that build AI."** Deployers have duties too, especially for high-risk systems.
- **"The deadlines are August 2026."** Not for high-risk rules any more: Regulation (EU) 2026/1744 moved them to December 2027 and August 2028. Bans and the rules for general-purpose models already apply.
- **"If no personal data is involved, it is not regulated."** The AI Act does not depend on personal data; that is GDPR's trigger.
- **"All AI is now heavily regulated."** Most systems are minimal risk and get no new duties. The weight falls on a defined list of high-risk uses.
- **"The postponement means we can wait."** The obligations did not change, only the dates. Inventory, classification and supplier dialogue take time, and bans and transparency duties do not wait.
