---
title: Risikostyring fra første workshop til ledelsesrapport
term: security/risk-management
lang: da
---

## Hvorfor en fast proces?

Alle organisationer styrer allerede risici uformelt: Nogen bekymrer sig om backup, en anden om phishing, og budgettet ender hos den, der råber højest. Risikostyring erstatter mavefornemmelsen med en proces, der kan gentages, så beslutningerne kan forklares, sammenlignes fra år til år og forsvares over for revisor eller tilsynsmyndighed. NIS2 artikel 21 kræver "passende og forholdsmæssige" foranstaltninger ud fra en tilgang, der dækker alle typer farer, og ISO/IEC 27001 (afsnit 6.1 og 8) kræver en dokumenteret risikovurdering og en plan for risikohåndtering.

De to standarder, man oftest støder på, er **ISO 31000**, som beskriver risikostyring for enhver type organisation, og **ISO/IEC 27005**, som anvender den samme proces specifikt på informationssikkerhed. Grundlæggende følger de samme cyklus.

## Cyklussen trin for trin

| Trin                       | Det centrale spørgsmål                                   | Typisk resultat                                          |
| -------------------------- | -------------------------------------------------------- | -------------------------------------------------------- |
| Kontekst                   | Hvad beskytter vi, og hvor meget risiko kan vi leve med? | Afgrænsning, aktivliste, risikokriterier, risikoappetit  |
| Identifikation             | Hvad kan gå galt?                                        | Risikoregister: aktiv + trussel + sårbarhed + konsekvens |
| Analyse                    | Hvor sandsynligt, og hvor slemt?                         | Score for sandsynlighed og konsekvens pr. risiko         |
| Vurdering                  | Hvilke risici ligger over det, vi accepterer?            | Prioriteret liste, heat-map                              |
| Håndtering                 | Hvad gør vi ved hver enkelt?                             | Handlingsplan med ejere, frister og budget               |
| Monitorering og opfølgning | Virker det, og har noget ændret sig?                     | Opdateret register, nøgletal, næste gennemgang           |

Hele vejen igennem løber **kommunikation og inddragelse**. Det er procesejerne ude i forretningen, ikke kun sikkerhedsfolkene, der ved, hvad der rent faktisk kan gå galt. Uden dem kommer registeret til at beskrive en organisation, der ikke findes.

### Kontekst

Før den første risiko skrives ned, skal man være enige om afgrænsningen (hele virksomheden, én lokation eller én tjeneste), de vigtigste aktiver (information, systemer, medarbejdere, leverandører) og **risikokriterierne**: hvordan sandsynlighed og konsekvens scores, og hvor grænsen mellem acceptabelt og uacceptabelt går. Springer man dette trin over, ender risikoworkshoppen typisk i diskussioner, fordi deltagerne scorer ud fra hver sin skala.

### Identifikation

En brugbar risikobeskrivelse rummer et aktiv, en trussel, en sårbarhed og en konsekvens: "Ransomware (trussel) udnytter en upatchet VPN-løsning (sårbarhed) og krypterer ERP-systemet (aktiv), så ordrebehandlingen står stille i flere dage (konsekvens)." Input kan komme fra myndighedernes trusselsvurderinger, tidligere hændelser, revisionsfund, afhængigheder af leverandører og interviews med procesejerne.

### Analyse - kvalitativ eller kvantitativ

Ved en **kvalitativ** analyse bruger man skalaer, fx 1-5 for sandsynlighed og 1-5 for konsekvens, hvor hvert niveau er beskrevet med ord ("kan ske én gang på ti år", "tab af en nøglekunde"). Metoden er hurtig, kræver ikke mange data og passer til de fleste små og mellemstore organisationer. Svagheden er, at tallene ser præcise ud, men i virkeligheden er skøn - to personer kan sagtens score den samme risiko helt forskelligt.

En **kvantitativ** analyse udtrykker risikoen i kroner og øre, fx som forventet årligt tab eller et spænd af mulige tab beregnet ud fra anslået hyppighed og konsekvens. Den taler økonomidirektørens sprog og gør det let at sammenligne omkostning og gevinst, men den kræver data og tid, og resultatet bliver aldrig bedre end de skøn, der ligger bag.

Mange starter kvalitativt og supplerer med kvantitative beregninger for de få risici, hvor der skal træffes beslutning om en større investering.

### Vurdering og heat-map

Placerer man hver risiko i et gitter med sandsynlighed på den ene akse og konsekvens på den anden, får man et **heat-map** (en risikomatrix): grønne felter er lav risiko, gule mellem og røde høj. Holdt op mod risikokriterierne viser det, hvilke risici der skal håndteres, og i hvilken rækkefølge. Husk, at heat-mappet er et kommunikationsværktøj og ikke en regnemaskine - to risici i samme røde felt kan sagtens fortjene vidt forskellig opmærksomhed.

### Håndtering

For hver risiko over acceptgrænsen vælger man én eller flere af fire muligheder:

- **Reduktion** - indfør eller forbedr kontroller: patching, MFA, backup, uddannelse. Det er det mest almindelige valg.
- **Overførsel** - flyt en del af konsekvensen over på andre, typisk via en forsikring eller en kontrakt med en leverandør. Ansvaret bliver dog hos jer selv.
- **Undgåelse** - stop den aktivitet, der skaber risikoen, fx ved at udfase et system, der ikke længere understøttes, eller lade være med at lancere en tjeneste.
- **Accept** - lev bevidst med risikoen, fordi håndteringen koster mere end den skade, den forhindrer. Accept skal være en dokumenteret beslutning truffet af en person med den rette myndighed - ikke noget, der sker af sig selv.

Hvert tiltag får en ejer, en frist og et budget, og det hele samles i en plan for risikohåndtering.

### Monitorering og opfølgning

Trusler, systemer og leverandører ændrer sig, så registeret gennemgås efter en fast plan - ofte årligt og kvartalsvis for de største risici - og desuden, når der sker noget væsentligt: en alvorlig hændelse, et nyt system, en fusion eller ny lovgivning.

## Risikoappetit og restrisiko

**Risikoappetit** er den mængde risiko, ledelsen er villig til at løbe for at nå sine mål. Den skal fastsættes af ledelsen, ikke af sikkerhedsafdelingen, og formuleres, så ledelsen kan genkende den: "Vi accepterer højst én dags nedbrud i ordrebehandlingen" siger langt mere end "vi accepterer mellemstore risici".

**Restrisiko** er det, der er tilbage efter håndteringen. Ingen kontrol fjerner risikoen helt, så spørgsmålet er altid, om restrisikoen ligger inden for appetitten. Gør den ikke det, skal der enten flere tiltag til, eller også må ledelsen formelt acceptere forskellen. Når man registrerer både den oprindelige og den resterende score, bliver det synligt, hvad de indkøbte kontroller faktisk har givet.

## Sådan præsenterer du risici for ledelsen

Efter NIS2 skal ledelsen godkende foranstaltningerne til styring af cybersikkerhedsrisici, og ledelsen kan drages til ansvar for overtrædelser. Bestyrelse og direktion er altså ikke bare tilhørere, men beslutningstagere. Nogle gode vaner:

- **Start med konsekvensen for forretningen**, ikke med teknikken: "ordrerne står stille i tre dage", ikke "sårbarhed i VPN-gatewayen".
- **Vis de fem til ti største risici**, ikke hele registeret - gerne med et heat-map og en pil, der viser udviklingen siden sidst.
- **Bed om en beslutning.** Præsentér for hver større risiko mulighederne, hvad de koster, og hvilken restrisiko de efterlader, og lad ledelsen vælge - også udtrykkeligt at acceptere.
- **Vær ærlig om usikkerheden.** Et spænd ("mellem én og tre dage") virker mere troværdigt end et skinpræcist tal.
- **Følg op** næste gang: Hvad blev der gjort, og har scorerne flyttet sig?

Gjort på den måde bliver risikostyring bindeleddet mellem sikkerhedsarbejdet og organisationens budget og strategi - og ikke bare et regneark, der produceres én gang om året til revisor.
