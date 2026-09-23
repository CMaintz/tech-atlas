---
title: Cloud computing — what "the cloud" really is and what it changes for security and compliance
term: platform/cloud-computing
lang: en
---

## What it is

**Cloud computing** means renting computing power, storage and software over a network from a provider, and paying for what you use instead of buying and running it yourself. The most cited definition comes from NIST Special Publication 800-145 (2011): a model for enabling convenient, on-demand network access to a shared pool of configurable computing resources that can be rapidly provisioned and released with minimal management effort or service provider interaction.

The idea of computing as a utility is decades old — mainframe time-sharing in the 1960s sold processor time by the minute. The modern cloud began in 2006, when Amazon Web Services launched S3 storage and the EC2 virtual server service, letting anyone rent a server with a credit card and switch it off an hour later. Microsoft Azure and Google Cloud followed, and software sold as a subscription over the web (Salesforce, later Microsoft 365 and Google Workspace) made the cloud the default way to buy business software. Underneath it all sits **virtualisation**: a **hypervisor** lets one physical **server** run many isolated **virtual machines**, so a provider can share hardware among thousands of customers.

## How it works

### The five essential characteristics

NIST names five features that together make something "cloud" rather than ordinary hosting:

| Characteristic         | What it means in practice                                                                    |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| On-demand self-service | You create servers, databases or accounts yourself through a portal or API, without a ticket |
| Broad network access   | Services are reached over the network from ordinary devices                                  |
| Resource pooling       | The provider serves many customers from shared hardware, isolated from each other            |
| Rapid elasticity       | Capacity can grow and shrink quickly, often automatically                                    |
| Measured service       | Use is metered, and you pay for what you consume                                             |

### The three service models

- **IaaS (Infrastructure as a Service)** — you rent virtual machines, networks and storage and manage everything from the operating system upwards.
- **PaaS (Platform as a Service)** — you deploy your code or data onto a managed platform (a database service, an application runtime); the provider runs the operating system and middleware.
- **SaaS (Software as a Service)** — you use a finished application in the browser; the provider runs almost everything, and you manage users, settings and data.

Each step from IaaS to SaaS hands more work — and more control — to the provider. That shift is the basis of the **shared responsibility model**.

### The four deployment models

NIST also distinguishes **public cloud** (shared by many customers), **private cloud** (dedicated to one organisation, on or off its premises), **community cloud** (shared by organisations with common needs, such as a group of municipalities) and **hybrid cloud** (a combination). Most organisations today are hybrid in practice, with some systems on premises and many SaaS subscriptions.

## What it means for an organisation and a coordinator

Moving to the cloud does not remove security work; it changes its shape. Physical security, hardware and much of the patching move to the provider. What stays — or grows — is identity and access management, configuration, data protection and **supplier management**.

- **Contracts and data protection.** A cloud provider handling personal data is a **data processor** under GDPR, so a **data processing agreement** is required, including where data is stored and which sub-processors are used. Transfers outside the EU/EEA need a legal basis.
- **Configuration.** Many cloud incidents are not provider failures but customer settings: a storage bucket left public, an admin account without MFA. **Cloud misconfiguration** is one of the most common causes of cloud data leaks.
- **Dependency and exit.** What happens if the provider has an outage, raises prices or goes out of business? An exit plan and backups outside the provider belong in business continuity planning.
- **Regulation.** For NIS2 entities, supply chain security (Article 21(2)(d)) explicitly covers cloud providers, and the financial sector's DORA sets detailed rules for ICT third parties.

### A worked scenario

Jonas is a GRC student helping a Danish municipality that is moving its case-handling system out of its own server room and into a provider's data centre, reached over the internet — the example in the term's definition. The IT department has chosen a SaaS solution; Jonas is asked what the compliance team must do.

He starts with the data: the system holds citizens' personal data, some of it sensitive, so a **data processing agreement** must be in place, and he checks the provider's list of sub-processors and data locations. He reviews the supplier's ISO 27001 certificate and its scope, and asks for the latest independent audit report (such as an ISAE 3402 or SOC 2). He then draws up the **shared responsibility** split for the solution: the provider runs the platform and backups of the service; the municipality owns user administration, MFA settings, access reviews and deciding what data goes in. Finally, he updates the risk register with two new risks — provider outage and misconfigured user rights — and proposes an exit clause and a yearly supplier review.

## Common misunderstandings

- **"The cloud is just someone else's computer."** Partly true, but the cloud adds self-service, elasticity and metering, and with them new risks — anyone with an account can create resources in minutes.
- **"The provider handles security."** The provider secures the cloud itself; you remain responsible for what you put in it and how you configure it.
- **"On premises is automatically safer."** Large providers often have better physical security and patching than a small server room. The real question is which risks you trade and whether you manage the new ones.
- **"Data in the cloud is outside GDPR's reach."** GDPR follows the data. Location, sub-processors and transfers must all be documented.
- **"Moving to the cloud saves money automatically."** Pay-as-you-go can become expensive without cost control and clean-up of unused resources.
