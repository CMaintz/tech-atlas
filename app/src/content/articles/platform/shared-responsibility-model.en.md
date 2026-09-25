---
title: The shared responsibility model - who secures what in the cloud
term: platform/shared-responsibility-model
lang: en
---

## What it is

The **shared responsibility model** describes how security and operating duties are divided between a cloud provider and its customer. The provider is responsible for the security _of_ the cloud - data centres, hardware, networks and the software layers it runs - while the customer is responsible for security _in_ the cloud: its data, its users and access rights, and the way it configures the services it buys.

The phrase was popularised by Amazon Web Services in the early 2010s, when customers moving to the cloud assumed that "the provider does security now". AWS published diagrams showing a line between provider and customer, and Microsoft, Google and others followed with their own versions. The idea has since been adopted by the Cloud Security Alliance, whose Cloud Controls Matrix (CCM) marks for each control whether it is typically owned by the provider, the customer or both. The model is not a law or a standard in itself, but it is the language contracts, audits and supervisory authorities use when they ask who does what.

## How it works

### The line moves with the service model

The split depends on how much of the stack the provider runs:

| Layer                         | On premises | IaaS     | PaaS     | SaaS     |
| ----------------------------- | ----------- | -------- | -------- | -------- |
| Data and its classification   | Customer    | Customer | Customer | Customer |
| User accounts and access      | Customer    | Customer | Customer | Customer |
| Application                   | Customer    | Customer | Shared   | Provider |
| Runtime, middleware, database | Customer    | Customer | Provider | Provider |
| Operating system and patching | Customer    | Customer | Provider | Provider |
| Virtualisation                | Customer    | Provider | Provider | Provider |
| Servers, storage, network     | Customer    | Provider | Provider | Provider |
| Physical data centre          | Customer    | Provider | Provider | Provider |

Two rows never move: **data** and **identity and access** stay with the customer in every model. Even with SaaS, you decide who gets an account, whether MFA is on, what is shared externally and what data is put into the service.

### "Shared" means both parties act

Some controls are genuinely shared. Encryption is a typical example: the provider may offer encryption at rest, but the customer decides whether to use its own keys and who can manage them. Logging is another: the provider produces logs, but the customer must turn on the relevant ones, keep them long enough and actually look at them.

### Where it goes wrong

Most cloud incidents do not come from the provider being breached. They come from the customer's side of the line: a storage bucket left open to the internet, an admin account without MFA, overly broad API keys, logs that were never enabled. These are forms of **cloud misconfiguration**, and they happen most often where each side assumed the other was responsible.

Backup is the classic gap. Many SaaS providers guarantee the _availability_ of their service and protect against their own hardware failures, but not against a customer deleting data by mistake, a malicious insider or ransomware encrypting synced files. Restoring a user's mailbox from six months ago may simply not be possible unless the customer has arranged its own backup.

## What it means for an organisation and a coordinator

The model is only useful when it is written down for each specific service. Generic diagrams from providers are a starting point; the actual split depends on the contract, the service tier and the options you have switched on.

- **Map controls to owners.** For each important cloud service, go through your control set - ISO 27001 Annex A, the CSA CCM or the NIS2 minimum measures - and mark every control as provider, customer or shared.
- **Get evidence for the provider's part.** Certificates, audit reports (ISAE 3402, SOC 2) and the provider's own shared-responsibility documentation show that the provider's side is covered. Check the scope.
- **Assign internal owners for your part.** "Customer" is not an owner. Name the team or role responsible for each customer control.
- **Write it into contracts and supplier management.** The split belongs in the supplier review and, where possible, in the contract and the data processing agreement.

### A worked scenario

Emma, a GRC student at a Danish accounting firm, is asked to take part in the yearly supplier review of the firm's SaaS collaboration suite (email, file sharing, chat). Following the example in the term's definition, she builds a spreadsheet with the firm's ISO 27001 Annex A controls in rows and three columns: provider, customer, shared.

Most rows are straightforward. The provider's ISO 27001 certificate and SOC 2 report cover physical security, hardware and patching. The customer column fills with user administration, MFA, external sharing settings and data classification. Then she reaches control 8.13, information backup. IT assumed the provider backed everything up; the provider's documentation says it keeps deleted items for a limited period and protects against its own failures, but that long-term, point-in-time backup is the customer's responsibility. Nobody owns it.

Emma records the gap in the risk register, estimates the impact (loss of client files older than the retention period after a ransomware incident or accidental deletion) and proposes a third-party backup service for the suite. Management approves it, and the control now has a named owner and a quarterly restore test.

## Common misunderstandings

- **"We are in the cloud, so security is the provider's job."** The provider secures its infrastructure. Your data, your users and your settings remain yours in every service model.
- **"SaaS means the provider does everything."** SaaS moves the most responsibility to the provider, but identity, access, data and often backup stay with you.
- **"The provider's certificate covers us."** It covers the provider's side, within its scope. It says nothing about how you configured the service.
- **"The split is the same for every provider."** It varies by provider, service and contract. Read the documentation for each service you rely on.
- **"Responsibility can be outsourced."** Tasks can be outsourced; accountability cannot. Under GDPR and NIS2 the organisation remains responsible for its data and its security measures.
