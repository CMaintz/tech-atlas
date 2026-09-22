---
title: 'Ransomware: how an attack unfolds and what actually protects you'
term: security/ransomware
lang: en
---

## What it is

**Ransomware** is harmful software that makes an organisation's data or systems unusable — usually by encrypting them — and then demands payment, typically in cryptocurrency, for the key to unlock them.

Early ransomware hit individual PCs more or less at random. Today's attacks are mostly carried out by organised criminal groups that deliberately break into companies, spend time inside the network, and aim to cause the maximum possible disruption before announcing themselves. Many operate as a business model known as **Ransomware-as-a-Service (RaaS)**: one group develops the malware and runs the payment infrastructure, while "affiliates" carry out the break-ins and share the proceeds.

Ransomware is primarily an attack on **availability** — one of the three pillars of information security, alongside confidentiality and integrity. But as the next section shows, modern attacks often hit confidentiality too.

## How it works

### The lifecycle of an attack

The moment the files are encrypted is usually the _end_ of the attack, not the beginning. A typical course looks like this:

| Phase                                            | What happens                                                                                      | Examples                                                                                                                                                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Initial access**                            | The attacker gets a first foothold                                                                | Phishing email with a malicious attachment or link; stolen or guessed passwords for remote access (VPN, remote desktop) without MFA; an unpatched vulnerability in an internet-facing system; access bought from another criminal |
| **2. Establishing control**                      | Tools are installed so the attacker can come back                                                 | Remote access software, scheduled tasks                                                                                                                                                                                           |
| **3. Privilege escalation and lateral movement** | The attacker gathers passwords and moves from machine to machine, aiming for administrator rights | Harvesting credentials from memory, abusing admin tools                                                                                                                                                                           |
| **4. Discovery and sabotage of recovery**        | The attacker maps the network, finds the valuable data — and looks for the backups                | Deleting backup copies, disabling security software                                                                                                                                                                               |
| **5. Exfiltration**                              | Data is copied out of the organisation                                                            | Uploading to cloud storage controlled by the attacker                                                                                                                                                                             |
| **6. Encryption and ransom note**                | Systems are encrypted, often simultaneously and outside office hours                              | Files renamed, a note on every screen                                                                                                                                                                                             |

This matters because every phase is a chance to detect and stop the attack. An organisation that notices unusual administrator logins or large outbound data transfers in phase 3 or 5 may avoid phase 6 altogether.

### Double extortion

Because well-prepared victims could simply restore from backup, criminal groups added a second lever: they steal data _before_ encrypting it and threaten to publish it on a "leak site" unless the ransom is paid. This is **double extortion**. Some groups go further — sometimes called triple extortion — by contacting the victim's customers or partners directly, or by launching denial-of-service attacks to increase the pressure.

The consequence is important: **a ransomware attack is very often also a data breach**, with the reporting duties that follow, for example under the GDPR if personal data is involved.

### Why offline and immutable backups matter

Backups are the single most important safeguard against the encryption part of an attack — but only if the attacker cannot reach them. Attackers actively search for backup systems and delete or encrypt them in phase 4. Useful principles:

- **The 3-2-1 rule:** at least three copies of the data, on two different types of media, with one copy kept off-site.
- **At least one copy offline or immutable:** disconnected from the network, or stored in a way that cannot be changed or deleted for a set period, even by an administrator.
- **Separate credentials:** the backup system should not be administered with the same accounts as the rest of the network.
- **Test restores regularly.** A backup that has never been restored is a hope, not a plan. Know how long a full restore of critical systems actually takes.

## What it means for an organisation and a coordinator

- **Risk assessment.** Ransomware should appear as a scenario in the risk register, with an honest estimate of how long the organisation can operate without its key systems.
- **Preventive controls.** MFA on remote access and email, prompt patching of internet-facing systems, limited administrator rights, network segmentation and endpoint protection all target specific phases of the lifecycle.
- **Awareness.** Phishing remains a common entry point. Staff should know how to report a suspicious email and that reporting quickly — even after clicking — is always the right move.
- **Preparedness.** The incident response and business continuity plans should include a ransomware playbook: who decides what, how to isolate systems, how to communicate when email and the intranet are down, and who can be reached outside office hours. Tabletop exercises reveal the gaps.
- **The ransom decision.** Whether to pay is a management decision that must be considered in advance, not improvised under pressure. Paying gives no guarantee of working decryption keys or that stolen data will be deleted, may fund further crime and can raise legal issues. Law enforcement and national security agencies generally advise against paying.
- **NIS2.** Article 21(2) requires measures for incident handling (point b) and business continuity, "such as backup management and disaster recovery, and crisis management" (point c). Article 23 sets out reporting to the CSIRT or competent authority: an early warning within 24 hours of becoming aware of a significant incident, an incident notification within 72 hours, and a final report within one month.

## Common misunderstandings

- **"We have backups, so we're safe."** Only if they are offline or immutable, tested — and even then, double extortion means stolen data can still be leaked.
- **"If we pay, we get everything back."** Decryption tools can be slow or faulty, and there is no way to verify that stolen data is deleted.
- **"We're too small to be a target."** Many attacks are opportunistic: automated scans look for any exposed, vulnerable system, regardless of who owns it.
- **"It's an IT problem."** A ransomware attack stops the whole business. Recovery priorities, communication and the ransom question are management and organisational decisions.
- **"Antivirus will catch it."** Attackers often disable security tools before encrypting, and use legitimate admin software that raises no alarm. Layered controls and monitoring are needed.
