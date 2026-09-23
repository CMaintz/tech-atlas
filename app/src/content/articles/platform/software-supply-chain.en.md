---
title: The software supply chain — why your security depends on code you did not write
term: platform/software-supply-chain
lang: en
---

## What it is

The **software supply chain** is everything and everyone involved in getting software from idea to running system: the developers, the open-source libraries and commercial components they reuse, the tools that compile and package the code, the **CI/CD pipelines** that test and ship it, the registries and update servers that distribute it, and the people and systems that install it. A weakness at any link can be passed on to everyone further down the chain.

Modern software is assembled more than it is written. A typical application consists mainly of third-party components, each with its own dependencies, often several layers deep. That brings enormous productivity, but it also means an organisation implicitly trusts thousands of people it has never met.

Several incidents made the term a boardroom topic:

- **SolarWinds (2020).** Attackers broke into the build system of SolarWinds' Orion network management product and inserted a backdoor into legitimate, digitally signed updates. Around 18,000 customers installed the tainted update, including US government agencies.
- **Log4Shell (December 2021).** A critical vulnerability in Log4j, a small, free logging library maintained by volunteers, turned out to be present in a huge share of Java software worldwide. Many organisations spent weeks just finding out where they used it.
- **xz Utils (2024).** An attacker spent about two years gaining the trust of the maintainer of a compression library used in Linux distributions, then hid a backdoor in it. It was caught by chance, shortly before reaching mainstream releases.

Governments responded. A 2021 US executive order pushed software bills of materials and secure development requirements for suppliers to the federal government, and NIST published guidance such as SP 800-218 (the Secure Software Development Framework) and SP 800-204D on securing CI/CD pipelines. In the EU, **NIS2** explicitly requires supply chain security, and the **Cyber Resilience Act** sets security requirements for products with digital elements sold on the EU market, with obligations phasing in over the coming years.

## How it works

### The links in the chain

| Link             | Example of what can go wrong                                               |
| ---------------- | -------------------------------------------------------------------------- |
| Source code      | A developer's account is taken over and malicious code is committed        |
| Dependencies     | A popular package is hijacked, or a look-alike name tricks developers      |
| Build system     | Attackers alter the output of the build without touching the source        |
| Pipeline secrets | Access tokens stored in the pipeline leak and are used to publish releases |
| Distribution     | An update server or package registry is compromised                        |
| Consumer         | An organisation installs updates without checking where they came from     |

### Key defences

- **Software bill of materials (SBOM).** A machine-readable list of every component and version in a piece of software. It does not prevent attacks, but when the next Log4Shell happens, it turns "do we use this?" from weeks of searching into a query.
- **Provenance and signing.** Recording and cryptographically signing where and how each artefact was built, so consumers can verify it came from the expected pipeline. The OpenSSF's **SLSA** framework (Supply-chain Levels for Software Artifacts) defines increasing levels of assurance for this.
- **Pipeline hardening.** Treating build systems as production: MFA for developers, least privilege for pipeline tokens, protected branches, isolated build environments and **secrets management** instead of passwords in configuration files.
- **Dependency management.** Pinning versions, scanning for known vulnerabilities (**CVEs**), reviewing new dependencies and removing unused ones.
- **Supplier management.** For bought software, asking suppliers how they secure their own development and build process, and whether they can provide SBOMs and vulnerability notifications.

## What it means for an organisation and a coordinator

Almost every organisation is a _consumer_ in the software supply chain, and many are also _producers_ — any company that builds a web shop, an app or an integration. The coordinator's job is to make both roles visible in the risk work.

As a consumer, the questions are: which software do we depend on, who supplies it, how do they secure it, and how quickly will we know when something in it is vulnerable? As a producer: which components do we use, is our pipeline protected, and could we tell a customer within a day whether we are affected by a new vulnerability? NIS2 Article 21(2)(d) (supply chain security) and (e) (security in acquisition, development and maintenance) cover both sides.

### A worked scenario

Clara is a GRC student at a Danish company that makes booking software for dental clinics. A news story breaks about attackers who broke into a software maker's build system and hid malware inside a normal update, which thousands of customers then installed because it came from a trusted supplier — the pattern described in the term's definition. The CEO asks: "Could that happen to us, or through us?"

Clara maps the chain with the development team. Upstream, the product uses around 900 open-source packages; there is no SBOM, and nobody can say quickly which versions are in production. The build pipeline runs on a hosted CI service with a long-lived token that can publish releases, stored as a plain variable. Downstream, 300 clinics install updates automatically.

She rates the risk as high — a compromise would reach every customer, and the clinics hold health data. Her proposed plan: generate an SBOM on every build and scan it for known vulnerabilities; move the publishing token into a secrets manager with short-lived credentials; require MFA and protected branches for all developers; sign releases so the clinics' installer can verify them; and add the three most critical suppliers to the supplier review. She also notes that installed software sold on the EU market is likely to fall under the Cyber Resilience Act, so the work doubles as preparation for that. Management approves a six-month roadmap.

## Common misunderstandings

- **"Supply chain risk is about our physical suppliers."** It includes every piece of code and every tool that goes into the software you build or run.
- **"Open source is the problem."** Commercial software is built from the same open-source parts, and SolarWinds was a commercial product. The issue is unmanaged trust, not licence type.
- **"An SBOM makes us secure."** An SBOM is an inventory, not a defence. Its value comes when it is kept current and checked against new vulnerabilities.
- **"Signed updates are safe."** SolarWinds' updates were signed. Signing proves where something came from, not that the build system was clean.
- **"We only buy software, so this is the vendor's problem."** Buyers choose suppliers, set contract terms and decide how updates are installed. Under NIS2, managing supplier risk is the organisation's own duty.
