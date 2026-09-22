---
title: Hændelseshåndtering – faser, roller og frister for indberetning
term: security/incident-response
lang: da
---

## Hvad skal hændelseshåndtering kunne?

Midt i en hændelse er det sjældent tidspunktet at begynde at tænke. Når ransomware breder sig, eller kundedata lækker, klarer de organisationer sig bedst, som på forhånd har besluttet, hvem der gør hvad, hvem der må træffe hvilke beslutninger, og hvem der skal have besked inden hvornår. Hændelseshåndtering er netop den forberedelse – og den disciplinerede udførelse, når det gælder. Målene er enkle at formulere: begræns skaden, genopret normal drift, sikr beviserne, overhold lovens krav, og lær nok til, at den næste hændelse bliver mindre.

## NIST-modellen

Den mest udbredte model kommer fra NIST Special Publication 800-61. Revision 2 beskriver fire faser. Revision 3 fra 2025 har omlagt vejledningen, så den følger NIST Cybersecurity Framework 2.0, men de fire faser er stadig det fælles sprog i beredskabsplaner og øvelser.

| Fase                                     | Hvad sker der?                                         | Typiske leverancer                                                                     |
| ---------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| 1. Forberedelse                          | Opbyg evnen, før der er brug for den                   | Beredskabsplan, kontaktlister, drejebøger (playbooks), logning, backup, træning        |
| 2. Opdagelse og analyse                  | Opdag, at noget er galt, og find ud af hvad            | Alarmer fra SIEM/EDR, henvendelser fra brugere, triage, alvorlighedsgrad, hændelseslog |
| 3. Inddæmning, fjernelse og genopretning | Stop spredningen, fjern årsagen, få systemerne op igen | Isolerede maskiner, nulstillede adgange, patchede systemer, gendannede data            |
| 4. Efterfølgende evaluering              | Lær og forbedr                                         | Evalueringsmøde, afsluttende rapport, opdateret plan og kontroller                     |

Faserne er en cirkel og ikke en lige linje. Analysen fortsætter ofte, mens man inddæmmer, og alt det, man lærer, fører tilbage til forberedelsen.

### Forberedelse

Det er her, langt størstedelen af værdien skabes. En beredskabsplan bør som minimum beskrive: hvad der tæller som en hændelse, og hvordan alvorligheden vurderes; roller og stedfortrædere; kontaktoplysninger (interne, it-leverandør, forsikringsselskab, advokat, myndigheder), som kan findes, selv når netværket er nede; drejebøger for de mest sandsynlige scenarier som ransomware, phishing med overtagne konti og data sendt til den forkerte modtager; og det tekniske fundament – logning, testet offline-backup og et opdateret overblik over systemer og data.

### Opdagelse og analyse

Hændelser opdages af overvågningsværktøjer, af leverandører eller – meget ofte – af en medarbejder, der bemærker noget mærkeligt. Holdet skal hurtigt afklare: Er det reelt? Hvad er ramt? Er der personoplysninger involveret? Står det stadig på? Før fra første minut en log med tidspunkter for observationer og beslutninger. Den bliver jeres bevismateriale, grundlaget for indberetningen til myndighederne og udgangspunktet for evalueringen bagefter.

### Inddæmning, fjernelse og genopretning

Inddæmning køber tid: isolér ramte maskiner, spær konti, afbryd en kompromitteret forbindelse til en leverandør. Det indebærer ofte svære afvejninger, for når et system tages offline, går forretningen også i stå. Derfor skal planen sige, hvem der har mandat til at træffe den beslutning. Derefter fjernes årsagen – malwaren, angriberens adgang, den udnyttede sårbarhed – og systemerne genoprettes, ofte fra backup, mens man holder skarpt øje med tegn på, at angriberen er tilbage.

### Efterfølgende evaluering

Hold inden for få uger et evalueringsmøde uden syndebukke: Hvad skete der? Hvad virkede? Hvad virkede ikke? Hvad ændrer vi, hvem er ansvarlig, og hvornår er det gjort? Springer man denne fase over, er man næsten sikker på at få den samme hændelse igen.

## Roller og ansvar

Titlerne varierer, men et holdbart beredskab rummer typisk:

- **Hændelsesansvarlig (incident manager)** – koordinerer, prioriterer, holder styr på loggen og træffer beslutninger inden for sit mandat.
- **Teknikere** – den interne it-afdeling eller en ekstern leverandør, der undersøger og udbedrer.
- **Ledelse/krisestab** – træffer forretningsbeslutninger: lukning af produktion, køb af ekstern bistand, udtalelser til offentligheden.
- **Kommunikation** – interne beskeder, kunder, presse.
- **Jura og databeskyttelse (DPO)** – vurderer pligten til at indberette og forpligtelser i kontrakter.
- **Referent** – noterer tidspunkter, fakta og beslutninger, så den ansvarlige kan koncentrere sig om at lede.

Alle roller skal have en navngiven stedfortræder. Hændelser tager ikke hensyn til ferier.

## Eskalering og kommunikation

Planen skal indeholde klare kriterier for eskalering, fx når personoplysninger kan være berørt, når kritiske systemer er nede, når hændelsen kan være væsentlig efter NIS2, eller når der er udsigt til mediernes interesse. Der eskaleres til navngivne personer med navngivne stedfortrædere – og via kanaler, der stadig virker, hvis mail og netværk er kompromitteret, fx telefonnumre på papir eller en separat beskedtjeneste.

Kommunikationen skal komme fra få afsendere og bygge på én fælles version af sandheden. Medarbejderne skal vide, hvad de skal gøre (og at de ikke skal udtale sig til pressen). Kunder og samarbejdspartnere skal have rettidig og ærlig information, og udtalelser godkendes af krisestaben.

## Frister for indberetning

| Regelsæt                             | Hvem skal underrettes     | Frist                                                                                                                                              |
| ------------------------------------ | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| NIS2 art. 23 – tidlig varsling       | Kompetent myndighed/CSIRT | Senest 24 timer efter, at man er blevet bekendt med en væsentlig hændelse                                                                          |
| NIS2 art. 23 – hændelsesunderretning | Kompetent myndighed/CSIRT | Senest 72 timer, med en første vurdering                                                                                                           |
| NIS2 art. 23 – endelig rapport       | Kompetent myndighed/CSIRT | Senest én måned efter hændelsesunderretningen                                                                                                      |
| GDPR art. 33                         | Datatilsynet              | Senest 72 timer efter, at man er blevet bekendt med bruddet på persondatasikkerheden – medmindre det næppe indebærer en risiko for de registrerede |
| GDPR art. 34                         | De berørte personer       | Uden unødig forsinkelse, hvis bruddet sandsynligvis indebærer en høj risiko for dem                                                                |

Uret starter, når man bliver bekendt med hændelsen – ikke når undersøgelsen er færdig. Derfor indberetter man ofte på et ufuldstændigt grundlag og opdaterer senere. Én og samme hændelse kan udløse flere regelsæt på én gang, så planen bør udpege, hvem der vurderer indberetningspligten, og hvem der indsender hver enkelt indberetning.

## Table-top-øvelser

En plan, der aldrig er afprøvet, er kun en hypotese. Ved en table-top-øvelse samles de rigtige deltagere om et bord (eller på et videomøde) og føres gennem et realistisk scenarie, hvor en facilitator løbende giver nye oplysninger: "Det er fredag kl. 16.30, og servicedesken melder, at filerne på det fælles drev har fået mærkelige filendelser …" Deltagerne fortæller, hvad de ville gøre, hvem de ville ringe til, og hvad de ville beslutte.

Gode øvelser er korte (en til tre timer), bygger på et scenarie, der er relevant for netop jeres organisation, inddrager ledelsen og afprøver bevidst de svage punkter: stedfortræderen i stedet for den ansvarlige, 24-timersfristen i NIS2, en backup, der viser sig at være ufuldstændig. Resultatet er en liste med forbedringer af planen – præcis det, en rigtig evaluering ville give, men uden at man først skal igennem hændelsen.
