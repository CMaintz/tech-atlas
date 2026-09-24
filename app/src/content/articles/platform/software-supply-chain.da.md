---
title: Softwareforsyningskæden — hvorfor jeres sikkerhed afhænger af kode, I ikke selv har skrevet
term: platform/software-supply-chain
lang: da
---

## Hvad er det?

**Softwareforsyningskæden** er alt og alle, der er involveret i at få software fra idé til kørende system: udviklerne, de open source-biblioteker og kommercielle komponenter, de genbruger, værktøjerne, der oversætter og pakker koden, de **CI/CD-pipelines**, der tester og leverer den, de registre og opdateringsservere, der distribuerer den, og de personer og systemer, der installerer den. En svaghed i ét led kan forplante sig til alle længere nede i kæden.

Moderne software bliver snarere samlet end skrevet. En typisk applikation består hovedsageligt af komponenter fra tredjeparter, hver med sine egne afhængigheder, ofte flere lag ned. Det sparer meget arbejde, men betyder også, at en organisation indirekte stoler på tusindvis af mennesker, den aldrig har mødt.

Flere hændelser gjorde begrebet til et emne på bestyrelsesniveau:

- **SolarWinds (2020).** Angribere brød ind i byggesystemet til SolarWinds' netværksstyringsprodukt Orion og indsatte en bagdør i legitime, digitalt signerede opdateringer. Omkring 18.000 kunder installerede den inficerede opdatering, herunder amerikanske myndigheder.
- **Log4Shell (december 2021).** En kritisk sårbarhed i Log4j, et lille, gratis logningsbibliotek vedligeholdt af frivillige, viste sig at findes i en enorm andel af verdens Java-software. Mange organisationer brugte uger alene på at finde ud af, hvor de brugte det.
- **xz Utils (2024).** En angriber brugte omkring to år på at vinde tillid hos vedligeholderen af et komprimeringsbibliotek, der bruges i Linux-distributioner, og gemte derefter en bagdør i det. Den blev opdaget ved et tilfælde, kort før den nåede de almindelige udgivelser.

Myndighederne reagerede. En amerikansk præsidentordre (executive order) fra 2021 skubbede på for softwarestyklister og krav om sikker udvikling hos leverandører til den amerikanske forbundsregering, og NIST udgav vejledninger som SP 800-218 (Secure Software Development Framework) og SP 800-204D om sikring af CI/CD-pipelines. I EU kræver **NIS2** udtrykkeligt sikkerhed i forsyningskæden, og **Cyber Resilience Act** (forordningen om cyberrobusthed) stiller sikkerhedskrav til produkter med digitale elementer, der sælges på EU-markedet: Producenternes pligt til at indberette aktivt udnyttede sårbarheder og alvorlige hændelser gælder fra 11. september 2026, og de fulde krav gælder fra 11. december 2027.

## Hvordan virker det?

### Leddene i kæden

| Led                      | Eksempel på, hvad der kan gå galt                                                    |
| ------------------------ | ------------------------------------------------------------------------------------ |
| Kildekode                | En udviklers konto overtages, og der indsættes ondsindet kode                        |
| Afhængigheder            | En populær pakke kapres, eller et navn, der ligner til forveksling, narrer udviklere |
| Byggesystem              | Angribere ændrer byggeresultatet uden at røre kildekoden                             |
| Hemmeligheder i pipeline | Adgangstokens i pipelinen lækker og bruges til at udgive versioner                   |
| Distribution             | En opdateringsserver eller et pakkeregister kompromitteres                           |
| Forbruger                | En organisation installerer opdateringer uden at tjekke, hvor de kommer fra          |

### Vigtige forsvar

- **Softwarestykliste (SBOM).** En maskinlæsbar liste over alle komponenter og versioner i et stykke software. Den forhindrer ikke angreb, men når den næste Log4Shell kommer, forvandler den "bruger vi det her?" fra ugers søgen til en forespørgsel.
- **Oprindelse og signering.** At registrere og kryptografisk signere, hvor og hvordan hvert artefakt er bygget, så forbrugerne kan kontrollere, at det kom fra den forventede pipeline. OpenSSF's rammeværk **SLSA** (Supply-chain Levels for Software Artifacts) definerer stigende sikkerhedsniveauer for dette.
- **Hærdning af pipelines.** At behandle byggesystemer som produktion: MFA for udviklere, mindste privilegium for pipelinetokens, beskyttede branches, isolerede byggemiljøer og **håndtering af hemmeligheder** i stedet for adgangskoder i konfigurationsfiler.
- **Styring af afhængigheder.** At låse versioner, scanne for kendte sårbarheder (**CVE'er**), gennemgå nye afhængigheder og fjerne ubrugte.
- **Leverandørstyring.** For købt software: at spørge leverandørerne, hvordan de sikrer deres egen udvikling og bygning, og om de kan levere SBOM'er og varsling om sårbarheder.

## Hvad betyder det for en organisation og en koordinator?

Næsten alle organisationer er _forbrugere_ i softwareforsyningskæden, og mange er også _producenter_ – enhver virksomhed, der bygger en webshop, en app eller en integration. Koordinatorens opgave er at gøre begge roller synlige i risikoarbejdet.

Som forbruger er spørgsmålene: Hvilken software er vi afhængige af, hvem leverer den, hvordan sikrer de den, og hvor hurtigt får vi at vide, når noget i den er sårbart? Som producent: Hvilke komponenter bruger vi, er vores pipeline beskyttet, og kan vi inden for et døgn fortælle en kunde, om vi er ramt af en ny sårbarhed? NIS2's artikel 21, stk. 2, litra d (forsyningskædesikkerhed) og litra e (sikkerhed ved anskaffelse, udvikling og vedligeholdelse) dækker begge sider.

### Et eksempel fra praksis

Clara er GRC-studerende i en dansk virksomhed, der laver bookingsoftware til tandlægeklinikker. En nyhed breder sig om angribere, der brød ind i en softwareproducents byggesystem og gemte malware i en almindelig opdatering, som tusindvis af kunder derefter installerede, fordi den kom fra en betroet leverandør – mønstret fra begrebets definition. Direktøren spørger: "Kan det ske for os – eller gennem os?"

Clara kortlægger kæden sammen med udviklingsteamet. Opstrøms bruger produktet omkring 900 open source-pakker; der er ingen SBOM, og ingen kan hurtigt sige, hvilke versioner der er i produktion. Byggepipelinen kører på en hostet CI-tjeneste med et langtidsholdbart token, der kan udgive versioner, gemt som en almindelig variabel. Nedstrøms installerer 300 klinikker opdateringer automatisk.

Hun vurderer risikoen som høj – en kompromittering ville ramme alle kunder, og klinikkerne har helbredsoplysninger. Hendes forslag til plan: Generer en SBOM ved hvert build, og scan den for kendte sårbarheder; flyt udgivelsestokenet over i en løsning til håndtering af hemmeligheder med kortlivede adgangsoplysninger; kræv MFA og beskyttede branches for alle udviklere; signer udgivelser, så klinikkernes installationsprogram kan kontrollere dem; og tilføj de tre mest kritiske leverandører til leverandørgennemgangen. Hun noterer også, at installeret software, der sælges på EU-markedet, sandsynligvis falder ind under Cyber Resilience Act, så arbejdet samtidig er forberedelse til den. Ledelsen godkender en køreplan på seks måneder.

## Typiske misforståelser

- **"Forsyningskæderisiko handler om vores fysiske leverandører."** Det omfatter hvert stykke kode og hvert værktøj, der indgår i den software, man bygger eller kører.
- **"Open source er problemet."** Kommerciel software er bygget af de samme open source-dele, og SolarWinds var et kommercielt produkt. Problemet er ustyret tillid, ikke licenstypen.
- **"En SBOM gør os sikre."** En SBOM er en fortegnelse, ikke et forsvar. Værdien opstår, når den holdes opdateret og tjekkes mod nye sårbarheder.
- **"Signerede opdateringer er sikre."** SolarWinds' opdateringer var signerede. En signatur beviser, hvor noget kom fra, ikke at byggesystemet var rent.
- **"Vi køber bare software, så det er leverandørens problem."** Køberen vælger leverandører, fastsætter kontraktvilkår og bestemmer, hvordan opdateringer installeres. Efter NIS2 er styring af leverandørrisici organisationens egen pligt.
