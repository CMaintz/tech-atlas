---
title: TLS forklaret for dem, der stiller kravene
term: cs/tls
lang: da
---

## Hvad er TLS?

Transport Layer Security (TLS) er protokollen bag hængelåsen i browseren og "s'et" i https. Den beskytter også mail mellem mailservere, forbindelser fra apps til deres bagvedliggende systemer, API-kald mellem systemer og mange VPN- og fjernadgangsløsninger. TLS ligger mellem applikationen (websiden, mailen) og netværket. Applikationen sender sine data, som den plejer, og TLS sørger for at beskytte dem undervejs.

Man behøver ikke forstå matematikken for at styre TLS godt. Man skal vide, hvad TLS beskytter, hvad den ikke beskytter, og hvilke indstillinger man skal kræve af IT-afdelingen og leverandørerne.

## Hvad TLS beskytter - og hvad den ikke gør

TLS giver tre ting for data under transport:

| Egenskab                    | Betydning                                   | Hvad den beskytter mod                                                         |
| --------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------ |
| Fortrolighed                | Ingen undervejs kan læse data               | Aflytning på offentligt wifi eller i et kompromitteret netværk                 |
| Integritet                  | Enhver ændring af data undervejs opdages    | At nogen ændrer en betaling eller indsætter skadeligt indhold                  |
| Autentificering af serveren | Man taler faktisk med den server, man ville | En falsk side eller en "man-in-the-middle", der udgiver sig for at være banken |

Autentificering af klienten - hvor serveren også tjekker klientens certifikat, ofte kaldet mutual TLS (mTLS) - er valgfri og bruges mest mellem systemer.

Lige så vigtigt er det, TLS **ikke** gør:

- Den beskytter kun data, **mens de er på vej**. Når de er fremme, gemmes de, som serveren nu gemmer dem. Kryptering af data i hvile er en selvstændig kontrol.
- Den siger intet om, hvorvidt serveren er **til at stole på**. En phishingside kan sagtens have en helt gyldig hængelås. TLS beviser kun, at man er forbundet til netop _det_ domæne.
- Den skjuler ikke, **hvem** man kommunikerer med. Domænenavne og IP-adresser er som regel synlige på netværket.

## Håndtrykket i grove træk

Før der sendes data, gennemfører klient og server et kort håndtryk:

1. **Goddag.** Klienten fortæller, hvilke TLS-versioner og cipher suites (kombinationer af algoritmer) den understøtter. Serveren vælger den stærkeste mulighed, som begge understøtter.
2. **Bevis for identitet.** Serveren sender sit certifikat. Klienten kontrollerer, at det er udstedt af en betroet certifikatudsteder, at det ikke er udløbet, og at navnet passer til den side, den bad om.
3. **Nøgleaftale.** Ved hjælp af asymmetrisk kryptografi bliver de to parter enige om nye sessionsnøgler, uden at selve nøglerne nogensinde sendes over netværket. I TLS 1.3 sker det altid på en måde, der giver _forward secrecy_: Hvis serverens langtidsnøgle senere bliver stjålet, kan den ikke bruges til at låse optagelser af tidligere sessioner op.
4. **Beskyttet session.** Herefter krypteres og integritetsbeskyttes alle data med hurtig symmetrisk kryptering baseret på sessionsnøglerne.

I TLS 1.3 klares det hele med én enkelt runde frem og tilbage. Det er en af grundene til, at versionen er både hurtigere og sikrere end sine forgængere.

## Certifikater og certifikatudstedere

Et certifikat er et digitalt dokument, der knytter en offentlig nøgle til et navn, fx `www.example.dk`, og som er signeret af en **certifikatudsteder (CA)**. Browsere og styresystemer leveres med en liste over udstedere, de har tillid til. Fører signaturkæden tilbage til en af dem, godtages certifikatet.

Det, der går galt i praksis, er som regel administrativt og ikke kryptografisk:

- **Udløbne certifikater** lægger tjenester ned uden varsel. Hav en oversigt med udløbsdatoer, og automatiser fornyelsen, hvor det er muligt (fx med ACME-protokollen). Den maksimale levetid for offentlige certifikater bliver gradvist kortere - fra 398 til 200 dage i marts 2026 og til 47 dage i 2029 - så automatisering bliver en nødvendighed.
- **Selvsignerede certifikater eller certifikater fra en intern CA** giver advarsler, og brugerne lærer at klikke dem væk - en vane, som en angriber kan udnytte.
- **De private nøgler**, der hører til certifikaterne, skal beskyttes. Den, der har dem, kan udgive sig for at være tjenesten.

## Derfor er SSL og de tidlige TLS-versioner udfaset

TLS stammer fra Netscapes SSL, og hver ny generation har rettet svagheder i den foregående:

| Version        | Status                                                                       |
| -------------- | ---------------------------------------------------------------------------- |
| SSL 2.0        | Forbudt (RFC 6176)                                                           |
| SSL 3.0        | Udfaset (RFC 7568), brudt af POODLE-angrebet                                 |
| TLS 1.0 og 1.1 | Udfaset i 2021 (RFC 8996); bygger på forældede algoritmer og konstruktioner  |
| TLS 1.2        | Acceptabel, når den er sat op med moderne cipher suites                      |
| TLS 1.3        | Den aktuelle version (RFC 8446); fjerner de gamle, svage valgmuligheder helt |

De gamle versioner tillader svage krypteringsalgoritmer og har kendte angreb, og de store browsere vil ikke længere forbinde med dem. Lader man dem stå slået til "af hensyn til kompatibiliteten", hjælper man primært angriberne, som i nogle tilfælde kan tvinge forbindelsen ned på den svageste version, begge parter stadig accepterer.

Mange siger stadig "SSL-certifikat" af gammel vane. Det betyder ikke, at den gamle protokol er i brug - men det er værd at tjekke efter.

## Det bør koordinatoren stille krav om

TLS er et område, hvor det er let at formulere klare krav, der kan efterprøves:

- **TLS 1.2 som minimum og helst TLS 1.3** på alle eksterne og interne tjenester. SSL og TLS 1.0/1.1 slået fra.
- **Kun moderne cipher suites** til TLS 1.2 (med forward secrecy; ingen RC4, 3DES, eksport- eller null-algoritmer).
- **Certifikater fra en betroet udsteder**, en navngiven ejer af hvert certifikat, en oversigt med udløbsdatoer og automatisk fornyelse.
- **HTTPS overalt** på websites, hvor HTTP omdirigeres til HTTPS, og HSTS er slået til.
- **TLS mellem mailservere**, hvor det understøttes, og krypterede forbindelser mellem systemer og til leverandører - ikke kun på det offentlige website.
- **Løbende test**, fx med en offentlig TLS-scanner for eksterne sites, hvor resultaterne rapporteres som ethvert andet fund.
- **Klausuler i leverandørkontrakter** med de samme minimumskrav, så også hostede tjenester og cloudtjenester lever op til dem.

NIS2 artikel 21, stk. 2, litra h, nævner politikker for brug af kryptografi og kryptering som en udtrykkelig foranstaltning til styring af cybersikkerhedsrisici. Dokumenterede og testede krav til TLS er en af de enkleste måder at vise, at foranstaltningen er på plads.
