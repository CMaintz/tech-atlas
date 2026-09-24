---
title: NIS2 i praksis — hvad direktivet kræver, og hvordan man arbejder med det
term: security/nis2
lang: da
---

## Hvad er NIS2, og hvem er omfattet?

NIS2 er direktiv (EU) 2022/2555 om foranstaltninger til sikring af et højt fælles cybersikkerhedsniveau i hele EU. Det afløser det første NIS-direktiv fra 2016, som kun omfattede en snæver kreds af "operatører af væsentlige tjenester" og blev gennemført meget forskelligt fra land til land. Et direktiv gælder ikke direkte – det skal skrives ind i national lovgivning. I Danmark er det sket med NIS2-loven, der trådte i kraft 1. juli 2025. Styrelsen for Samfundssikkerhed er koordinerende myndighed, mens en række sektormyndigheder fører tilsyn på deres egne områder. Hændelser indberettes via Virk.dk og håndteres af Forsvarets Efterretningstjeneste som nationalt CSIRT, mens Center for Cybersikkerhed (CFCS), hvis rådgivning siden januar 2025 har ligget i styrelsen, udgiver trusselsvurderinger og vejledninger. Den finansielle sektor er i vid udstrækning reguleret af DORA i stedet.

Om en virksomhed er omfattet, afhænger af **sektor** og **størrelse**:

- **Bilag I – sektorer med høj kritikalitet**: energi, transport, bankvirksomhed, finansielle markedsinfrastrukturer, sundhed, drikkevand, spildevand, digital infrastruktur, forvaltning af IKT-tjenester (B2B), offentlig forvaltning og rummet.
- **Bilag II – andre kritiske sektorer**: post- og kurertjenester, affaldshåndtering, kemikalier, fødevarer, fremstilling (fx medicinsk udstyr, elektronik, maskiner og køretøjer), digitale udbydere (onlinemarkedspladser, søgemaskiner og sociale netværk) samt forskning.
- **Størrelse**: Som hovedregel er kun _mellemstore_ (mindst 50 ansatte eller omsætning og balance over 10 mio. euro) og _store_ virksomheder omfattet. Visse enheder er dog omfattet uanset størrelse – fx DNS-udbydere, topdomæneregistre, tillidstjenesteudbydere og virksomheder, der er eneste udbyder af en kritisk tjeneste.

Omfattede virksomheder er enten **væsentlige** eller **vigtige** enheder. Kravene til sikkerhed og indberetning er de samme; forskellen ligger i tilsynet. Væsentlige enheder er under forudgående tilsyn, dvs. myndigheden kan komme på inspektion uden en konkret anledning. Vigtige enheder er under efterfølgende tilsyn, typisk udløst af en hændelse eller en klage. Direktivet kræver, at bødemaksimum er mindst 10 mio. euro eller 2 % af den globale omsætning for væsentlige enheder og 7 mio. euro eller 1,4 % for vigtige enheder – det højeste beløb gælder.

## De centrale krav

**Artikel 20 – ledelsesansvar.** Ledelsen skal _godkende_ foranstaltningerne til styring af cybersikkerhedsrisici, _føre tilsyn_ med gennemførelsen og kan _drages til ansvar_ for overtrædelser. Ledelsens medlemmer skal gennemgå uddannelse, og medarbejderne bør løbende tilbydes tilsvarende træning. Det er den artikel, der flytter sikkerhed fra IT-afdelingen til direktionen og bestyrelsen.

**Artikel 21 – minimumskrav.** Foranstaltningerne skal stå mål med risikoen og bygge på en tilgang, der dækker alle farer – ikke kun hackere, men også brand, strømsvigt og menneskelige fejl. Artikel 21, stk. 2, oplister ti minimumsområder:

|     | Minimumskrav                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------ |
| a   | Politikker for risikoanalyse og informationssystemers sikkerhed                                              |
| b   | Håndtering af hændelser                                                                                      |
| c   | Driftskontinuitet: backup, katastrofeberedskab og krisestyring                                               |
| d   | Forsyningskædesikkerhed, herunder forholdet til direkte leverandører                                         |
| e   | Sikkerhed ved anskaffelse, udvikling og vedligeholdelse, inkl. håndtering og offentliggørelse af sårbarheder |
| f   | Politikker og procedurer for vurdering af, om tiltagene virker                                               |
| g   | Grundlæggende cyberhygiejne og uddannelse i cybersikkerhed                                                   |
| h   | Kryptografi og, hvor det er relevant, kryptering                                                             |
| i   | Personalesikkerhed, adgangsstyring og styring af aktiver                                                     |
| j   | Multifaktorautentificering, sikret tale-, video- og tekstkommunikation samt sikret nødkommunikation          |

**Artikel 23 – indberetning.** En _væsentlig hændelse_ – en hændelse, der har givet eller kan give alvorlige driftsforstyrrelser eller økonomiske tab eller skade andre betydeligt – skal indberettes til CSIRT'en eller den kompetente myndighed i flere trin:

| Frist                                 | Indberetning                                                                                                                 |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Inden 24 timer efter man får kendskab | Tidlig varsling – mistanke om ondsindet handling? Mulig grænseoverskridende virkning?                                        |
| Inden 72 timer                        | Hændelsesunderretning – første vurdering af alvor, konsekvens og kompromitteringsindikatorer                                 |
| På anmodning                          | Foreløbig rapport om status                                                                                                  |
| Senest én måned efter underretningen  | Endelig rapport – grundårsag, iværksatte tiltag, grænseoverskridende virkning (statusrapport, hvis hændelsen stadig står på) |

Hvor det er relevant, skal virksomheden også orientere modtagerne af sine tjenester.

## Sammenhængen med de andre rammeværker

NIS2 beskriver, _hvad_ der skal opnås – ikke _hvordan_. Det er her, de frivillige rammeværker kommer ind:

- **ISO 27001** leverer ledelsessystemet: risikovurdering, politikker, intern audit og ledelsens evaluering. Kontrollerne i Anneks A dækker de ti områder i artikel 21 godt. Et certifikat er et stærkt bevis, men ikke automatisk NIS2-overholdelse – certifikatets omfang dækker måske ikke de relevante tjenester, og ISO indeholder ikke indberetningsfristerne i artikel 23.
- **CIS-kontrollerne** giver en prioriteret, teknisk opgaveliste. Implementeringsgruppe 1 er et realistisk udgangspunkt for "grundlæggende cyberhygiejne" (art. 21, stk. 2, litra g) i en mindre organisation.
- **D-mærket** kan bruges som en struktureret selvevaluering til at se, hvor langt virksomheden er fra NIS2-kravene – og til at vise modenhed over for kunder og samarbejdspartnere.
- **GDPR** løber sideløbende: Ét brud, der involverer persondata, kan kræve en tidlig varsling efter NIS2 inden for 24 timer _og_ en anmeldelse til Datatilsynet inden for 72 timer – to indberetninger til to forskellige myndigheder.

## Hvad gør koordinatoren i praksis?

1. **Afklar omfanget.** Er virksomheden omfattet – som væsentlig eller vigtig enhed? Skal den registreres hos myndigheden?
2. **Gap-analyse.** Sammenlign den nuværende praksis med de ti områder i artikel 21. Et regneark med "krav – status – ejer – næste skridt" er ofte nok til at komme i gang.
3. **Køreplan.** Prioritér hullerne efter risiko og indsats, og få ledelsen til at godkende planen og budgettet. Efter artikel 20 er den godkendelse en lovpligt, ikke en høflighed.
4. **Indberetningsprocedure.** Beskriv, hvem der afgør, om en hændelse er "væsentlig", hvem der sender den tidlige varsling, og hvordan GDPR-sporet håndteres parallelt. Afprøv det i en table-top-øvelse.
5. **Leverandører.** Kortlæg de kritiske leverandører, indarbejd sikkerhedskrav i kontrakterne, og følg op.
6. **Uddannelse og dokumentation.** Arrangér ledelsestræning, kør awareness for medarbejderne, og gem dokumentationen – referater, godkendelser, deltagerlister – for tilsynet vil bede om den.

## Typiske misforståelser

- **"Vi er for små."** Størrelsen tæller, men nogle er omfattet uanset størrelse – og leverandører til omfattede virksomheder mærker kravene gennem kontrakterne alligevel.
- **"Det er et IT-projekt."** Artikel 20 lægger ansvaret hos ledelsen. IT udfører mange af tiltagene, men godkendelse og tilsyn kan ikke uddelegeres væk.
- **"Vi er ISO 27001-certificerede, så vi overholder NIS2."** Det hjælper meget, men tjek omfang, indberetning og leverandørstyring særskilt.
- **"Vi indberetter, når vi har det fulde overblik."** Den tidlige varsling er netop tænkt til at blive sendt, _før_ man ved alt.
- **"Vigtige enheder får ikke tilsyn."** Det gør de – bare efterfølgende i stedet for forudgående, og pligterne er de samme.
