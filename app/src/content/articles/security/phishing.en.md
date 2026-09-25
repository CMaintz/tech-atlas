---
title: 'Phishing: the many faces of a fake message — and how an organisation fights back'
term: security/phishing
lang: en
---

## What it is

**Phishing** is an attempt to trick someone into doing something that benefits an attacker — typing a password into a fake page, opening a harmful attachment, approving a payment or handing over information — by sending a message that pretends to come from someone trustworthy. The name is a play on "fishing": bait is cast widely, and the sender only needs a few people to bite.

Phishing is a form of **social engineering**: it attacks human judgement rather than technical weaknesses. That is exactly why it is so persistent. Firewalls and patches do not help much when the legitimate user opens the door from the inside. Phishing is a frequent first step in larger attacks, including ransomware and data breaches.

## How it works

### Variants

The basic trick is always the same, but it comes in many forms:

| Variant                                         | What characterises it                                                                                                                                                            |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bulk phishing**                               | The same generic message sent to thousands: "Your parcel is delayed", "Your mailbox is full"                                                                                     |
| **Spear phishing**                              | Targeted at a specific person or group, using details from LinkedIn, the company website or earlier leaks to look credible                                                       |
| **Whaling**                                     | Spear phishing aimed at senior executives, whose access and authority are especially valuable                                                                                    |
| **Business Email Compromise (BEC) / CEO fraud** | The attacker poses as — or has taken over the mailbox of — a manager or supplier and asks for an urgent transfer or a change of bank details. Often no link or attachment at all |
| **Smishing**                                    | Phishing via SMS or messaging apps                                                                                                                                               |
| **Vishing**                                     | Phishing by phone call — for example a fake "IT support" or "bank" asking the victim to read out a code or approve a login, including with MitID                                 |
| **Quishing**                                    | A QR code in an email or on a poster leading to a fake page; it moves the victim to a phone, often outside the company's protections                                             |
| **Clone phishing**                              | A copy of a genuine email the victim has received before, with the link or attachment swapped for a malicious one                                                                |

Some attacks also use an **adversary-in-the-middle** technique: the fake login page relays everything to the real service in real time and captures not only the password but also the one-time code and the resulting session. This is why ordinary MFA reduces, but does not eliminate, the risk.

### The psychology

Phishing messages exploit a handful of predictable levers:

- **Urgency** — "within 24 hours", "your account will be closed".
- **Authority** — the CEO, the tax authority, the bank, the police.
- **Fear or curiosity** — an unpaid invoice, a salary adjustment, a shared document you "must" see.
- **Helpfulness and routine** — a request that looks like everyday work.

### Red flags

No single sign is conclusive, but these should make anyone pause:

- The sender address or domain is slightly off (`micros0ft.com`, a free-mail address for a "company").
- The link text says one thing, but hovering shows a different destination.
- An unexpected request to log in, pay, change bank details or share a code.
- Pressure to act quickly or keep it confidential ("don't tell anyone yet").
- An unexpected attachment, especially archives, macros or files that ask you to "enable content".
- A message that breaks the normal process — a supplier's new bank account announced only by email.
- A tone or form of address that does not fit the supposed sender.

Well-crafted spear phishing may have none of the classic spelling mistakes. The most reliable defence is therefore **process**: verify unusual requests through a different, known channel.

## What it means for an organisation and a coordinator

Phishing sits right at the intersection of technology, people and process — the core territory of a coordinator or awareness role.

- **Layered technical controls.** Email filtering, authentication of sending domains (SPF, DKIM, DMARC), marking of external emails, blocking of risky attachment types and, above all, MFA — preferably phishing-resistant — reduce both the number of messages that arrive and the damage when someone clicks.
- **Process controls.** Payments and changes to bank details should require verification via a known phone number or a second approver, regardless of who seems to be asking. This single rule defeats most CEO fraud.
- **Awareness programme.** Training should be short, recurring and relevant to the recipients' actual work. Phishing simulations can be useful for learning and measurement, but they should be designed to build skills and trust, not to shame people.
- **Make reporting easy.** A "report phishing" button and a quick, friendly response are essential. Staff who report a click within minutes give the security team a chance to reset passwords and block the site before damage spreads. Blaming people teaches them to stay quiet.
- **Meaningful KPIs.** The reporting rate and time-to-report often say more about the security culture than the click rate alone.
- **Incident handling.** The playbook for a reported phishing email should cover: check whether others received it, remove it from inboxes, block links and senders, reset any exposed credentials and review sign-ins.
- **NIS2.** Article 21(2)(g) requires "basic cyber hygiene practices and cybersecurity training", and Article 20 requires members of management bodies to follow training too. A documented awareness programme with phishing as a central theme is a natural way to meet this. In Denmark, Center for Cybersikkerhed (CFCS), now part of Styrelsen for Samfundssikkerhed (the Danish Resilience Agency), publishes threat assessments and guidance that can serve as a starting point.

## Common misunderstandings

- **"Only careless or non-technical people fall for phishing."** Well-targeted messages fool experienced professionals, including security staff. Everyone can be caught on a busy day.
- **"Phishing is just about email."** SMS, phone calls, messaging apps, QR codes and collaboration tools are all used.
- **"You can always spot it by the bad spelling."** Attackers increasingly produce fluent, well-formatted messages, including in Danish and other smaller languages.
- **"Clicking the link is the dangerous part; nothing happens if I don't enter anything."** Usually true for links, but opening an attachment can be enough — and the safe response is to report either way.
- **"A good simulation result means we are safe."** Simulations measure behaviour on one day with one scenario. Technical controls and verification processes must carry the load when a real, better-crafted message gets through.
