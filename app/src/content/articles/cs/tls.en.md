---
title: TLS explained for people who write the requirements
term: cs/tls
lang: en
---

## What TLS is

Transport Layer Security (TLS) is the protocol behind the padlock in the browser and the "s" in https. It also protects email between mail servers, connections from apps to their back ends, API calls between systems, and many VPN and remote-access products. TLS sits between the application (the web page, the email) and the network, so the application can send data as usual while TLS takes care of protecting it on the way.

You do not need to understand the mathematics to govern TLS well. You need to know what it protects, what it does not, and which settings to require from IT and suppliers.

## What it protects - and what it does not

TLS delivers three things for data in transit:

| Property              | Meaning                                           | Threat it counters                                             |
| --------------------- | ------------------------------------------------- | -------------------------------------------------------------- |
| Confidentiality       | Nobody along the route can read the data          | Eavesdropping on public wifi or a compromised network          |
| Integrity             | Any change to the data in transit is detected     | Someone altering a payment or injecting malicious content      |
| Server authentication | You are really talking to the server you intended | A fake site or a "man in the middle" pretending to be the bank |

Client authentication (the server checking the client's certificate, often called mutual TLS or mTLS) is optional and mostly used between systems.

What TLS does **not** do is equally important:

- It protects data only **while it travels**. Once it arrives, it is stored however the server stores it - encryption at rest is a separate control.
- It says nothing about whether the server is **trustworthy**. A phishing site can have a perfectly valid padlock; TLS only proves you are connected to _that_ domain.
- It does not hide **who** you talk to. The domain names and IP addresses involved are generally visible to the network.

## The handshake, conceptually

Before any data is sent, client and server run a short handshake:

1. **Hello.** The client says which TLS versions and cipher suites (combinations of algorithms) it supports. The server picks the strongest option both support.
2. **Proof of identity.** The server sends its certificate. The client checks that it was issued by a trusted certificate authority, that it has not expired, and that the name matches the site it asked for.
3. **Key agreement.** Using asymmetric cryptography, the two sides agree on fresh session keys without ever sending those keys across the network. In TLS 1.3 this is always done in a way that gives _forward secrecy_: stealing the server's long-term key later does not unlock recordings of past sessions.
4. **Protected session.** From here, all data is encrypted and integrity-protected with fast symmetric encryption using the session keys.

In TLS 1.3 this takes a single round trip, which is one reason it is faster as well as safer than its predecessors.

## Certificates and certificate authorities

A certificate is a digital document that binds a public key to a name, such as `www.example.dk`, and is signed by a **certificate authority (CA)**. Browsers and operating systems ship with a list of CAs they trust. If the signature chain leads back to one of those, the certificate is accepted.

Things that go wrong in practice are usually administrative, not cryptographic:

- **Expired certificates** take services down without warning. Keep an inventory with expiry dates and automate renewal where possible (for example with the ACME protocol). The maximum lifetime of public certificates is being shortened in steps - from 398 days to 200 days in March 2026, and to 47 days by 2029 - which makes automation a necessity.
- **Self-signed or internal CA certificates** trigger warnings, and users learn to click past warnings - a habit an attacker can exploit.
- **Private keys** belonging to certificates must be protected; anyone holding them can impersonate the service.

## Why SSL and early TLS are retired

TLS descends from Netscape's SSL. Each generation fixed weaknesses in the one before:

| Version         | Status                                                                       |
| --------------- | ---------------------------------------------------------------------------- |
| SSL 2.0         | Prohibited (RFC 6176)                                                        |
| SSL 3.0         | Deprecated (RFC 7568), broken by the POODLE attack                           |
| TLS 1.0 and 1.1 | Deprecated in 2021 (RFC 8996); rely on outdated algorithms and constructions |
| TLS 1.2         | Acceptable when configured with modern cipher suites                         |
| TLS 1.3         | Current version (RFC 8446); removes old, weak options entirely               |

The old versions allow weak ciphers and have known attacks, and major browsers no longer connect using them. Keeping them enabled "for compatibility" mainly helps attackers, who can sometimes force a connection down to the weakest version both sides still accept.

People still say "SSL certificate" out of habit. It does not mean the old protocol is in use - but it is worth checking.

## What a coordinator should require

TLS is an easy area to write clear, testable requirements for:

- **TLS 1.2 as the minimum, TLS 1.3 preferred**, on all external and internal services. SSL and TLS 1.0/1.1 disabled.
- **Modern cipher suites only** for TLS 1.2 (forward secrecy; no RC4, 3DES, export or null ciphers).
- **Certificates from a trusted CA**, a named owner for each, an inventory with expiry dates, and automated renewal.
- **HTTPS everywhere** on websites, with HTTP redirecting to HTTPS and HSTS enabled.
- **TLS between mail servers** where supported, and encrypted connections between systems and to suppliers - not only on the public website.
- **Regular testing**, for example with a public TLS scanner for external sites, and the results reported like any other finding.
- **Supplier clauses** that state the same minimums, so hosted and cloud services meet them too.

NIS2 Article 21(2)(h) names policies on the use of cryptography and encryption as an explicit risk-management measure. Documented, tested TLS requirements are one of the simplest ways to show that this measure is in place.
