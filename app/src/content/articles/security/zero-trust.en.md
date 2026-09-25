---
title: 'Zero Trust: from castle walls to checking every request'
term: security/zero-trust
lang: en
---

## What it is

For decades most organisations protected their IT like a medieval castle: a strong wall (the firewall) around the network, and relative freedom for anyone already inside. That model assumed that "inside" meant "trustworthy". It stopped matching reality once staff began working from home, data moved to cloud services, suppliers were given remote access, and attackers learned that stealing one employee's login was easier than breaking through the wall.

**Zero Trust** is the answer to that mismatch. It is not a product you can buy but a set of design principles, summed up in the phrase **"never trust, always verify"**. No user, device or network location is trusted automatically. Every request for access - to a file, an application, a database - is evaluated on its own merits, and access is granted only for that session and only to the extent needed.

The most widely cited definition comes from the US standards body NIST in **Special Publication 800-207, _Zero Trust Architecture_** (2020). It describes Zero Trust as a shift of defences away from static, network-based perimeters towards users, assets and resources.

## How it works

### The core tenets

NIST SP 800-207 lists a number of tenets. In plain terms, the most important are:

- **All data sources and computing services are treated as resources** to be protected - not just servers, but also SaaS applications and personal devices that touch company data.
- **All communication is secured regardless of network location.** Being on the office network gives no extra trust.
- **Access is granted per session.** Being allowed into the HR system at 09:00 does not automatically mean being allowed in at 23:00 from another country.
- **Access decisions are dynamic**, based on the identity of the user, the state of the device (is it patched, managed, encrypted?), the sensitivity of the resource and other signals such as location and behaviour.
- **The organisation monitors the security posture of its assets** and collects as much information as it can to improve its decisions.

### Policy engine and enforcement point

NIST describes a logical architecture with a few key components:

| Component                          | Role                                                                                                                               | Everyday analogy                                    |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **Policy Engine (PE)**             | Decides whether a given request should be allowed, using policy and inputs such as identity, device health and threat intelligence | The security manager who sets and applies the rules |
| **Policy Administrator (PA)**      | Carries out the decision - opens or closes the path between user and resource                                                      | The dispatcher who radios the guard                 |
| **Policy Enforcement Point (PEP)** | Sits in front of the resource and physically allows, monitors or terminates the connection                                         | The guard at the ward door                          |

The Policy Engine and Policy Administrator together are called the Policy Decision Point. The key idea is that the user never talks to the resource directly; every connection passes through an enforcement point that has asked for a decision first.

### Micro-segmentation and least privilege

A classic flat network lets a compromised laptop reach almost everything. **Micro-segmentation** splits the environment into small zones - sometimes down to a single application or workload - each with its own gatekeeper. Combined with **least privilege**, where people and systems get only the rights they need for their task, this limits the "blast radius" of any single compromise. An attacker who takes over a receptionist's PC should not be able to reach the finance database from there.

### Strong identity as the new perimeter

Because the network no longer grants trust, identity does most of the work. Strong authentication - in practice multi-factor authentication, preferably phishing-resistant - is a foundation of any Zero Trust effort, together with a reliable picture of which devices exist and whether they are healthy.

## What it means for an organisation and a coordinator

Zero Trust is a journey, not a switch. Most organisations move towards it gradually, and much of the work is organisational rather than technical:

- **Know what you have.** You cannot protect resources you do not know exist. An up-to-date asset inventory and data classification are prerequisites.
- **Define who needs what.** Access rules require the business to state which roles need which data. A coordinator often facilitates this between IT and department managers.
- **Write it into policy.** The access control policy should reflect least privilege, regular access reviews and the requirement for strong authentication.
- **Prioritise.** Start with the crown jewels - the systems whose loss or leak would hurt most, as identified in the risk assessment.
- **Communicate.** Users will notice more prompts and checks. Awareness work should explain why the "hospital badge at every door" is a feature, not a nuisance.

For entities covered by **NIS2** (implemented in Denmark by the NIS2 law), Zero Trust is not named as a requirement, but it maps directly onto several of the measures in **Article 21(2)**: human resources security, access control policies and asset management (point i), the use of multi-factor or continuous authentication (point j), and cyber hygiene (point g). A Zero Trust roadmap can therefore be a practical way to structure and document compliance work.

## Common misunderstandings

- **"Zero Trust means we don't trust our employees."** It is about not trusting _automatically_. Staff are verified precisely so that the organisation can safely give them access from anywhere.
- **"We bought a Zero Trust product, so we're done."** Vendors sell components (identity platforms, secure access gateways), but Zero Trust is an architecture and an operating model. No single product delivers it.
- **"Zero Trust replaces the firewall."** Perimeter controls still have value; they are simply no longer the only line of defence.
- **"It's only for large enterprises."** Small organisations apply the same principles when they enforce MFA on all cloud services, remove unused accounts and restrict admin rights.
- **"Once implemented, it stays done."** Access needs, devices and threats change constantly. Continuous monitoring and periodic review are part of the model itself.
