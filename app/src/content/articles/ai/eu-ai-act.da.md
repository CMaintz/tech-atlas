---
title: EU's AI-forordning i praksis - risikoniveauer, frister og koordinatorens opgaver
term: ai/eu-ai-act
lang: da
---

## Hvad er AI-forordningen, og hvem er omfattet?

AI-forordningen er forordning (EU) 2024/1689. Den trådte i kraft 1. august 2024 og er - i modsætning til NIS2 - en _forordning_: Den gælder direkte i alle medlemslande uden at skulle skrives ind i national lov. Nationale regler udfylder kun detaljer som, hvilke myndigheder der fører tilsyn, og hvordan bøder håndteres. Kommissionen fremsatte forslaget i april 2021; forhandlingerne blev overhalet af ChatGPT's gennembrud i slutningen af 2022, og derfor indeholder den endelige tekst et særskilt kapitel om AI-modeller til almen brug, som ikke var med i det oprindelige forslag.

Forordningen er produktsikkerhedslovgivning. Den regulerer AI-systemer som produkter, der bringes i omsætning eller tages i brug, og den fordeler pligter efter **rolle**:

- **Udbydere** udvikler et AI-system (eller får det udviklet) og markedsfører det under eget navn. De fleste pligter ligger her.
- **Idriftsættere** bruger et AI-system i deres egen erhvervsmæssige virksomhed - en bank, der bruger et kreditvurderingsværktøj, en kommune, der bruger et system til at sortere sager.
- **Importører, distributører og bemyndigede repræsentanter** har understøttende pligter til at kontrollere, at det, de videreformidler, overholder reglerne.

Forordningen rammer også udbydere uden for EU, når deres systemer bruges i EU. En organisation, der ændrer et højrisikosystem væsentligt eller sætter sit eget navn på det, kan selv blive udbyder.

## De centrale krav

### Fire risikoniveauer

| Niveau                             | Eksempler                                                                                                                                                  | Konsekvens                                                              |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Uacceptabel risiko                 | Social scoring, manipulation der udnytter sårbarheder, ikke-målrettet indsamling af ansigtsbilleder, følelsesgenkendelse på arbejdspladser og i skoler     | Forbudt                                                                 |
| Høj risiko                         | AI som sikkerhedskomponent i regulerede produkter (bilag I); AI i rekruttering, uddannelse, kredit, væsentlige tjenester, retshåndhævelse m.m. (bilag III) | Skrappe krav før og under brug                                          |
| Begrænset risiko (gennemsigtighed) | Chatbots, deepfakes, AI-genereret tekst offentliggjort for at informere offentligheden                                                                     | Folk skal have at vide, at de har med AI eller AI-skabt indhold at gøre |
| Minimal risiko                     | Spamfiltre, AI i spil, de fleste kontorværktøjer                                                                                                           | Ingen nye pligter                                                       |

Ud over niveauerne har **AI-modeller til almen brug** - de store modeller, der ligger under mange produkter - deres egne pligter: teknisk dokumentation, information til udbydere længere nede i kæden, en ophavsretspolitik og et resumé af træningsindholdet. Modeller med "systemisk risiko" (de mest avancerede) skal desuden evalueres, have alvorlige hændelser indberettet og være tilstrækkeligt sikret.

### Pligter for højrisikosystemer

Udbydere skal have en dokumenteret **risikostyringsproces** gennem hele systemets levetid, bruge træningsdata af passende kvalitet og med øje for skævheder, føre teknisk dokumentation og automatiske logs, give idriftsættere klare brugsanvisninger, designe for **menneskeligt tilsyn** og opnå passende nøjagtighed, robusthed og cybersikkerhed. De skal have et kvalitetsstyringssystem, gennemføre en overensstemmelsesvurdering, CE-mærke systemet, registrere det i EU-databasen og indberette alvorlige hændelser til markedsovervågningsmyndighederne.

Idriftsættere skal bruge systemet efter anvisningerne, udpege kompetente personer til at føre tilsyn med det, opbevare de logs, de har kontrol over, overvåge driften og oplyse personer, når et højrisikosystem bruges til at træffe afgørelser om dem. Visse idriftsættere, især offentlige myndigheder, skal lave en konsekvensanalyse for grundlæggende rettigheder. Berørte personer kan kræve en forklaring på afgørelser, der bygger på højrisikosystemer.

### Tidsplanen, inklusive ændringen i 2026

| Dato             | Hvad gælder                                                                                        |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| 1. august 2024   | Ikrafttræden                                                                                       |
| 2. februar 2025  | Forbudte praksisser forbydes; bestemmelser om AI-færdigheder                                       |
| 2. august 2025   | Regler for AI-modeller til almen brug; rammerne for forvaltning og sanktioner                      |
| 2. august 2026   | Krav om gennemsigtighed for chatbots, deepfakes og lignende                                        |
| 2. december 2027 | Højrisikokrav for anvendelser i bilag III (rekruttering, kredit, uddannelse, offentlige ydelser …) |
| 2. august 2028   | Højrisikokrav for AI indbygget i produkter omfattet af EU's produktlovgivning (bilag I)            |

De to sidste datoer er ikke dem, der stod i den oprindelige tekst fra 2024, som var august 2026 og august 2027. Fordi de harmoniserede standarder og den vejledning, der skal til for at overholde reglerne, blev forsinket, vedtog EU **forordning (EU) 2026/1744** (en del af den såkaldte "Digital Omnibus"), der flyttede højrisikofristerne til 2. december 2027 for bilag III og 2. august 2028 for bilag I. Ældre undervisningsmateriale og mange blogindlæg viser stadig de oprindelige datoer.

De maksimale bøder er 35 mio. euro eller 7 % af den globale omsætning for forbudte praksisser, 15 mio. euro eller 3 % for de fleste andre overtrædelser og 7,5 mio. euro eller 1 % for at give myndighederne forkerte oplysninger.

## Sammenhængen med de andre rammeværker

- **GDPR** beskytter personoplysninger, uanset hvor de bruges; AI-forordningen regulerer AI-systemer som produkter, uanset om de behandler personoplysninger. Et værktøj til CV-screening er omfattet af begge: GDPR for lovlig behandling og automatiske afgørelser, AI-forordningen for systemets design og tilsyn.
- **NIS2** og AI-forordningen mødes om cybersikkerhed og indberetning af hændelser. En alvorlig AI-hændelse kan udløse indberetninger efter begge regelsæt til forskellige myndigheder.
- **ISO/IEC 42001**, ledelsessystemstandarden for AI, spiller den rolle, ISO 27001 spiller for informationssikkerhed: Den er ikke lig med overholdelse, men giver det governance-skelet, forordningen forudsætter.
- **NIST AI RMF** er et frivilligt amerikansk rammeværk, som mange bruger til at strukturere arbejdet med AI-risici, og det kan rimeligt godt kobles til forordningens krav om risikostyring.

## Hvad gør koordinatoren i praksis?

Tag scenariet fra begrebets definition. Sofie er GRC-studerende i praktik hos et dansk rekrutteringsfirma, der bruger et CV-screeningsværktøj købt hos en leverandør.

1. **Kortlægning.** Hun oplister alle AI-systemer i brug, også funktioner gemt i HR- og CRM-platforme. CV-værktøjet, chatassistenten på hjemmesiden og en oversættelsestjeneste dukker op.
2. **Klassifikation.** Chatassistenten er begrænset risiko (besøgende skal have at vide, at de taler med AI, fra august 2026). Oversættelse er minimal risiko. CV-screening står i bilag III (beskæftigelse), så det er **høj risiko**.
3. **Afklar rollen.** Firmaet har ikke bygget værktøjet, så det er **idriftsætter**. Leverandøren er udbyder og bærer de tunge designkrav - men hvis firmaet gentræner værktøjet på egne data og markedsfører det som sit eget, kan det ændre sig.
4. **Gap-analyse af idriftsætterens pligter.** Hvem fører tilsyn med værktøjet og kan underkende dets rangeringer? Føres der log? Bliver kandidaterne informeret? Er der en dokumenteret test for skæve resultater, fx på tværs af køn og alder? Hun kører GDPR-sporet parallelt: En konsekvensanalyse (DPIA) er meget sandsynligt påkrævet.
5. **Opfølgning hos leverandøren.** Hun beder udbyderen om en tidsplan for overensstemmelsesvurdering, CE-mærkning og brugsanvisning inden **2. december 2027** og får pligterne skrevet ind i kontrakten.
6. **Governance.** Hun foreslår en AI-politik godkendt af ledelsen, en ejer for hvert AI-system og uddannelse, så medarbejderne forstår de værktøjer, de bruger.

## Typiske misforståelser

- **"Den gælder kun virksomheder, der bygger AI."** Idriftsættere har også pligter, især for højrisikosystemer.
- **"Fristen er august 2026."** Ikke længere for højrisikokravene: Forordning (EU) 2026/1744 flyttede dem til december 2027 og august 2028. Forbuddene og reglerne for modeller til almen brug gælder allerede.
- **"Hvis der ikke indgår persondata, er det ikke reguleret."** AI-forordningen afhænger ikke af persondata; det er GDPR's udløser.
- **"Al AI er nu stramt reguleret."** De fleste systemer er minimal risiko og får ingen nye pligter. Vægten ligger på en afgrænset liste af højrisikoanvendelser.
- **"Udskydelsen betyder, at vi kan vente."** Pligterne er ikke ændret, kun datoerne. Kortlægning, klassifikation og dialog med leverandører tager tid, og forbuddene og kravene om gennemsigtighed venter ikke.
