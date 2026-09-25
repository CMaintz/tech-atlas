---
title: The CIS Controls - a prioritised list of what to do first
term: security/cis-controls
lang: en
---

## What the CIS Controls are and who they are for

The CIS Critical Security Controls are a free, publicly available set of security measures published by the Center for Internet Security, a US non-profit. They started in 2008 as the "SANS Top 20" - a list of the defences that actually stopped real attacks - and are maintained by a community of practitioners. Version 8 (2021) reduced the list to **18 controls** containing **153 safeguards**; version 8.1 (2024) refined the wording and added a "govern" angle to line up with NIST CSF 2.0, without changing the basic structure.

What sets the CIS Controls apart from ISO 27001 or NIS2 is that they are **prescriptive and prioritised**. They do not ask you to build a management system or to decide your own measures from scratch; they tell you, in a fairly specific order, which technical and organisational safeguards give the most protection for the effort. That makes them popular with small and medium organisations and with IT operations teams who want a concrete to-do list.

The CIS Controls are voluntary. Nobody certifies against them, and no EU law names them - but they are often used to show that "appropriate" or "state of the art" security is in place.

## The key content

### The 18 controls

| #   | Control                                                | In short                                              |
| --- | ------------------------------------------------------ | ----------------------------------------------------- |
| 1   | Inventory and Control of Enterprise Assets             | Know every device connected to your network           |
| 2   | Inventory and Control of Software Assets               | Know what software runs, and block what should not    |
| 3   | Data Protection                                        | Classify, handle, retain and dispose of data securely |
| 4   | Secure Configuration of Enterprise Assets and Software | Harden default settings                               |
| 5   | Account Management                                     | Keep track of all accounts, remove unused ones        |
| 6   | Access Control Management                              | Grant least privilege, use MFA                        |
| 7   | Continuous Vulnerability Management                    | Find and fix weaknesses, patch in time                |
| 8   | Audit Log Management                                   | Collect and review logs                               |
| 9   | Email and Web Browser Protections                      | Reduce phishing and malicious web content             |
| 10  | Malware Defenses                                       | Prevent and detect malicious software                 |
| 11  | Data Recovery                                          | Back up and test that you can restore                 |
| 12  | Network Infrastructure Management                      | Keep network devices secure and up to date            |
| 13  | Network Monitoring and Defense                         | Watch the network for attacks                         |
| 14  | Security Awareness and Skills Training                 | Train the people                                      |
| 15  | Service Provider Management                            | Evaluate and follow up on suppliers                   |
| 16  | Application Software Security                          | Build and buy software securely                       |
| 17  | Incident Response Management                           | Prepare to detect, respond and recover                |
| 18  | Penetration Testing                                    | Test defences the way an attacker would               |

The order is deliberate. You cannot protect devices you do not know you have (Controls 1 and 2), and you cannot manage access to accounts you have not listed (Control 5). The early controls are the foundation the later ones stand on.

### Implementation Groups

Each safeguard is assigned to one or more **Implementation Groups (IGs)**, which describe levels of ambition rather than sizes of company:

| Group   | Safeguards (v8) | Typical organisation                                                                                                                                                         |
| ------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **IG1** | 56              | Small or medium organisation with limited IT expertise, mostly protecting ordinary business data. CIS calls IG1 "essential cyber hygiene" - the minimum everyone should meet |
| **IG2** | IG1 + 74 = 130  | Organisation with dedicated IT staff, several departments and some sensitive data or regulatory duties                                                                       |
| **IG3** | IG2 + 23 = 153  | Organisation with security specialists, sensitive data and a real risk of targeted, sophisticated attacks                                                                    |

IG1 is the practical starting point: asset and software inventories, secure configuration, account and access basics including MFA, patching, malware protection, backups, awareness training and a simple incident response plan. Some controls, such as penetration testing, only begin at IG2.

## How the CIS Controls connect to the other frameworks

- **NIS2** Article 21 requires "basic cyber hygiene practices" and a list of measures without saying how. IG1 is a widely used, concrete interpretation of that hygiene, and IG2 covers much of the rest of Article 21 on the technical side. The governance parts - management approval, reporting deadlines, supply-chain policy - must come from elsewhere.
- **ISO 27001** is the management system; the CIS Controls can serve as the detailed technical implementation of its Annex A technological controls. CIS publishes official mappings to ISO 27001, NIST CSF and other frameworks.
- **GDPR** Article 32 asks for appropriate security of personal data; Controls 3, 5, 6 and 11 are especially relevant.
- **D-mærket** criteria on IT security overlap with IG1 topics such as updates, backup, access and training, so work on one helps the other.

## What a coordinator actually does with it

A coordinator is usually not the one configuring firewalls, but plays a key role in making the CIS Controls happen:

1. **Pick the right IG** together with IT and management, based on risk profile, data and resources.
2. **Run a self-assessment** of the chosen safeguards - CIS offers free tools for this - and record for each one: implemented, partly implemented or not implemented.
3. **Prioritise and plan**: close gaps in IG1 before starting on IG2, and turn the list into a roadmap with owners and dates.
4. **Deal with barriers**: legacy systems that cannot be patched, lack of staff, resistance to MFA. These are organisational problems as much as technical ones.
5. **Report progress** to management in plain terms, for example "we now meet 48 of 56 IG1 safeguards; the remaining ones depend on replacing the old ERP system".
6. **Own the non-technical controls** directly: awareness training (14), supplier follow-up (15) and the incident response plan (17).

## Common misunderstandings

- **"CIS is only for small companies."** IG1 suits small organisations, but IG2 and IG3 are used by large and highly regulated ones.
- **"CIS replaces ISO 27001 or NIS2 compliance."** It gives the technical content but not the governance, risk process, documentation and reporting duties.
- **"You have to do all 18 controls."** You implement the safeguards in your chosen IG - and IG1 alone is a big step for many organisations.
- **"The controls are purely technical."** Awareness, supplier management and incident response are core parts of the list.
- **"Done once, done forever."** Inventories, patching and access reviews are continuous activities, not one-off projects.
