---
title: GDPR for sikkerhedskoordinatorer - principper, sikkerhedskrav og brud på persondatasikkerheden
term: security/gdpr
lang: da
---

## Hvad er GDPR, og hvem er omfattet?

Databeskyttelsesforordningen - forordning (EU) 2016/679, i daglig tale GDPR - har gældt siden 25. maj 2018. I modsætning til NIS2 er den en _forordning_ og gælder derfor direkte i alle medlemslande. National lovgivning udfylder kun de huller, forordningen selv åbner for. I Danmark er det databeskyttelsesloven, og tilsynsmyndigheden er Datatilsynet.

GDPR gælder for alle, der behandler **personoplysninger** - enhver oplysning om en identificeret eller identificerbar levende person - på en organiseret måde. Der er ingen størrelsesgrænse og ingen sektorliste: En webshop med to ansatte, en kommune og et hospital er alle omfattet. To roller er centrale:

- Den **dataansvarlige** bestemmer, hvorfor og hvordan oplysningerne behandles, og bærer hovedansvaret.
- **Databehandleren** behandler oplysninger på vegne af den dataansvarlige - fx en cloududbyder, et lønbureau eller en IT-leverandør.

Forordningen rækker også ud over EU, når en virksomhed udbyder varer eller tjenester til personer i EU eller overvåger deres adfærd.

## De centrale krav

**Artikel 5 - principperne.** Resten af forordningen udspringer af dem:

| Princip                                  | Hvad det betyder                                                    |
| ---------------------------------------- | ------------------------------------------------------------------- |
| Lovlighed, rimelighed og gennemsigtighed | Hav et retsgrundlag, overrask ikke folk, og fortæl dem, hvad I gør  |
| Formålsbegrænsning                       | Indsaml til bestemte formål, og genbrug ikke til noget uforeneligt  |
| Dataminimering                           | Kun det, der er nødvendigt for formålet                             |
| Rigtighed                                | Hold oplysningerne korrekte og ajourførte                           |
| Opbevaringsbegrænsning                   | Slet eller anonymisér, når oplysningerne ikke længere er nødvendige |
| Integritet og fortrolighed               | Beskyt dem med passende sikkerhed                                   |
| Ansvarlighed (art. 5, stk. 2)            | Kunne _påvise_, at reglerne overholdes                              |

Artikel 6 angiver de seks behandlingsgrundlag (samtykke, kontrakt, retlig forpligtelse, vitale interesser, offentlig myndighedsudøvelse og legitime interesser). Artikel 9 skærper reglerne for følsomme oplysninger som helbredsdata, og artikel 15-22 giver de registrerede rettigheder: indsigt, berigtigelse, sletning, begrænsning, dataportabilitet og indsigelse.

**Artikel 25 - databeskyttelse gennem design og standardindstillinger.** Beskyttelsen skal bygges ind i systemer og processer fra begyndelsen, og standardindstillingerne må kun behandle det nødvendige. For koordinatoren betyder det at komme med tidligt i projekterne - ikke at gennemgå dem ugen før idriftsættelse.

**Artikel 28 - databehandlere.** Når en leverandør behandler personoplysninger for jer, skal der være en skriftlig **databehandleraftale**. Den skal bl.a. fastslå, at databehandleren kun handler efter dokumenteret instruks, at medarbejderne har tavshedspligt, at sikkerheden efter artikel 32 er på plads, at underdatabehandlere kun bruges med godkendelse, at databehandleren bistår ved de registreredes rettigheder og ved brud, og at data slettes eller returneres ved ophør. Den dataansvarlige skal også føre tilsyn - fx ved at gennemgå leverandørens revisionserklæringer.

**Artikel 30 - fortegnelse over behandlingsaktiviteter.** En oversigt over, hvilke oplysninger I behandler, hvorfor, om hvem og hvor længe. Den er rygraden i det meste GDPR-arbejde.

**Artikel 32 - behandlingssikkerhed.** Den dataansvarlige og databehandleren skal gennemføre "passende tekniske og organisatoriske foranstaltninger", der står mål med risikoen. Artiklen nævner pseudonymisering og kryptering, vedvarende fortrolighed, integritet, tilgængelighed og robusthed, evnen til at genoprette data efter en hændelse og regelmæssig afprøvning af foranstaltningerne. Det er her, GDPR møder ISO 27001 og CIS-kontrollerne.

**Artikel 33 og 34 - brud på persondatasikkerheden.**

| Hvem                                            | Hvornår                                                                                          | Hvad                                                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Dataansvarlig → Datatilsynet (art. 33)          | Uden unødig forsinkelse og så vidt muligt inden 72 timer efter at have fået kendskab til bruddet | Anmeld, medmindre bruddet sandsynligvis ikke indebærer en risiko for de registrerede |
| Databehandler → dataansvarlig (art. 33, stk. 2) | Uden unødig forsinkelse                                                                          | Underret, så fristen kan begynde at løbe                                             |
| Dataansvarlig → de berørte (art. 34)            | Uden unødig forsinkelse                                                                          | Når bruddet sandsynligvis indebærer en _høj_ risiko                                  |
| Dataansvarlig (art. 33, stk. 5)                 | Altid                                                                                            | Dokumentér alle brud internt, også dem der ikke anmeldes                             |

Artikel 35 kræver en **konsekvensanalyse** (DPIA) ved behandling med høj risiko, og artikel 37 kræver en databeskyttelsesrådgiver i visse tilfælde, bl.a. hos offentlige myndigheder. Artikel 83 har to bødeniveauer: op til 10 mio. euro eller 2 % af den globale årsomsætning og op til 20 mio. euro eller 4 % for overtrædelse af principperne og de registreredes rettigheder - i begge tilfælde det højeste beløb. I Danmark fastsættes bøder som hovedregel af domstolene, efter at Datatilsynet har politianmeldt sagen.

## Sammenhængen med de andre rammeværker

- **NIS2** beskytter de tjenester, samfundet er afhængigt af; GDPR beskytter menneskers oplysninger. De overlapper på sikkerhed og hændelsesindberetning. Ét ransomwareangreb hos en NIS2-omfattet virksomhed kan kræve både en tidlig varsling efter NIS2 inden for 24 timer og en anmeldelse til Datatilsynet inden for 72 timer.
- **ISO 27001** giver et ledelsessystem, der gør artikel 32 og ansvarlighedsprincippet dokumenterbare. Anneks A har en særskilt kontrol om privatliv og beskyttelse af personoplysninger, og ISO/IEC 27701 udvider standarden med egentlige privatlivskrav.
- **CIS-kontrollerne** giver de konkrete tiltag bag "passende sikkerhed" - især databeskyttelse (kontrol 3), adgangsstyring (kontrol 5 og 6) og genopretning af data (kontrol 11).
- **D-mærket** kombinerer IT-sikkerhed med ansvarlig dataanvendelse og er derfor en naturlig ramme for mindre virksomheder, der behandler mange personoplysninger.

## Hvad gør koordinatoren i praksis?

- Holder **fortegnelsen efter artikel 30** levende - opdaterer den, hver gang et nyt system eller en ny leverandør kommer til.
- Vedligeholder **oversigten over databehandlere** og deres aftaler og fører tilsyn med dem mindst én gang om året.
- Driver **proceduren for brud**: hvem vurderer risikoen, hvem anmelder til Datatilsynet, hvem kommunikerer med de berørte? Øv den sammen med NIS2-proceduren, hvis begge gælder.
- Bringer **privacy by design** ind i projekter og indkøb og sætter en konsekvensanalyse i gang, når behandlingen indebærer høj risiko.
- Tager GDPR med i **awareness**: Fejlsendte e-mails er blandt de hyppigste brud, og medarbejderne skal vide, at de skal melde dem.

## Typiske misforståelser

- **"GDPR handler om samtykke."** Samtykke er kun ét af seks behandlingsgrundlag - og ofte ikke det bedste.
- **"Det er databehandlerens ansvar."** Den dataansvarlige er stadig ansvarlig for at vælge og føre tilsyn med sine databehandlere.
- **"Kun store læk skal anmeldes."** Alle brud skal dokumenteres; om de skal anmeldes, afhænger af risikoen, ikke af størrelsen.
- **"72 timer fra det skete."** Fristen løber fra det tidspunkt, hvor den dataansvarlige får _kendskab_ til bruddet - derfor bør databehandleraftalen give leverandøren en kort, fast frist for at give besked.
- **"GDPR er juristernes opgave."** Artikel 32 er et sikkerhedskrav, og det er sikkerhedsfolkene, der kan opfylde det.
