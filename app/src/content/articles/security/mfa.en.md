---
title: 'Multi-factor authentication: why one password is not enough — and why not all MFA is equal'
term: security/mfa
lang: en
---

## What it is

**Multi-factor authentication (MFA)** means that logging in requires at least two pieces of evidence from _different categories_. The password alone is no longer the key to the door; an attacker who steals or guesses it still lacks the second proof.

The idea is old — a bank card plus a PIN is two-factor authentication — and most people in Denmark use MFA every day through **MitID**: the MitID app on a phone or a code display is something you have, and the app is itself unlocked with something you know or are (a PIN or a fingerprint), while the code display is combined with a password. In an organisation, MFA brings the same protection to email, cloud services, remote access and business systems. It has become one of the most important controls in modern IT security, because stolen passwords are the raw material of so many attacks, and it is one of the few controls the EU's NIS2 directive mentions by name.

## How it works

### The three factor categories

| Category               | Description                                     | Examples                                                                         |
| ---------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------- |
| **Something you know** | A secret held in memory                         | Password, PIN, answer to a security question                                     |
| **Something you have** | A physical or digital object in your possession | Phone with an authenticator app, hardware security key, smart card, code display |
| **Something you are**  | A biometric trait                               | Fingerprint, face recognition                                                    |

The factors must come from **different** categories. A password plus a security question is still just two things you know — if one leaks through a phishing site, the other usually leaks with it.

Biometrics in everyday devices are usually used _locally_: your fingerprint unlocks a key stored on your phone, and it is that key which proves your identity to the service. The fingerprint itself is not sent anywhere.

### Not all MFA is equally strong

The US NIST guidelines on digital identity (**SP 800-63B**) and security agencies in many countries distinguish sharply between different kinds of second factor. Roughly from weakest to strongest:

1. **SMS or voice codes.** Better than nothing, but codes can be intercepted through SIM swapping (an attacker persuades a mobile operator to move your number to their SIM card) and — crucially — a user can be tricked into typing the code into a fake website. NIST treats SMS as a "restricted" authenticator that organisations should only use with awareness of its risks.
2. **One-time codes from an app (TOTP)**, the six-digit codes that change every 30 seconds. They avoid the phone network, but can still be phished: a fake login page simply asks for the code and relays it in real time.
3. **Push notifications** ("Approve this sign-in?"). Convenient, but vulnerable to **push fatigue** (also called MFA bombing): the attacker, who already has the password, triggers prompt after prompt — often late at night — until the tired or confused user taps "Approve". Mitigations include **number matching**, where the user must type a number shown on the login screen, and showing the location and application of the request.
4. **Phishing-resistant MFA**, such as **FIDO2/WebAuthn security keys and passkeys**, or smart cards. Here the cryptographic proof is bound to the genuine website's address. A look-alike domain simply does not receive a valid answer, so there is no code for the user to give away. This removes the human judgement call from the most common attack.

Modern phishing kits often work as an _adversary-in-the-middle_: they sit between the user and the real login page, pass everything through, and capture both password and one-time code — or the session cookie that results. This is why the distinction between "MFA" and "phishing-resistant MFA" matters so much.

## What it means for an organisation and a coordinator

- **Policy.** The access control or authentication policy should state where MFA is mandatory. Priorities are typically: email and cloud services reachable from the internet, remote access (VPN), administrator accounts and any system holding sensitive data.
- **NIS2.** Article 21(2)(j) explicitly lists "the use of multi-factor authentication or continuous authentication solutions" among the cybersecurity risk-management measures, as appropriate. Being able to document where MFA is enforced — and where it is not, and why — is a concrete compliance task.
- **Exceptions and legacy systems.** Some old systems cannot do MFA. They should be recorded as risks, with compensating controls and a plan, rather than silently accepted.
- **Recovery processes.** An attacker who cannot beat MFA may call the service desk and ask to "reset my phone". The reset procedure must verify identity as carefully as the login does.
- **Awareness.** Staff need a few clear rules: never approve a prompt you did not trigger yourself; never read a code aloud to anyone who calls you; report unexpected prompts immediately — they mean the password is probably already known to someone else.
- **Incident handling.** An unexpected MFA prompt or a burst of rejected prompts should be treated as a signal that credentials are compromised: reset the password, review sign-in logs and check for new mail forwarding rules or registered devices.
- **Rollout.** Adoption succeeds when the reason is explained, support is ready and staff have a backup method registered before they lose their phone.

## Common misunderstandings

- **"We have MFA, so phishing can't hurt us."** Codes and push approvals can be phished or fatigued. Only phishing-resistant methods close that gap, and even then attackers may target the recovery process instead.
- **"Two passwords are two factors."** They are two instances of the same factor.
- **"SMS codes are useless."** They are the weakest common option, but still far better than a password alone. Move up the ladder where you can; do not remove SMS without a replacement.
- **"MFA is only for IT people and managers."** Attackers often start with ordinary accounts and escalate from there. Every account with access to email or company data benefits.
- **"Biometrics send my fingerprint to the company."** In most modern setups the biometric only unlocks a key stored on your own device.
- **"MFA fixes weak passwords."** It makes them far less dangerous, but password hygiene still matters — especially for systems where MFA cannot be enforced.
