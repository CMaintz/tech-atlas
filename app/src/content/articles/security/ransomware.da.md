---
title: 'Ransomware: sådan forløber et angreb, og hvad der reelt beskytter'
term: security/ransomware
lang: da
---

## Hvad er ransomware?

**Ransomware** – på dansk også kaldet løsepengeangreb – er skadelig software, der gør en organisations data eller systemer ubrugelige, som regel ved at kryptere dem, og derefter kræver betaling, typisk i kryptovaluta, for nøglen til at låse dem op.

De tidlige udgaver ramte enkelte pc'er mere eller mindre tilfældigt. I dag står organiserede kriminelle grupper bag de fleste angreb. De bryder bevidst ind i virksomheder, bruger tid inde i netværket og forsøger at skabe størst mulig skade, før de giver sig til kende. Mange arbejder efter en forretningsmodel kaldet **Ransomware-as-a-Service (RaaS)**: Én gruppe udvikler den skadelige software og driver betalingssystemet, mens "partnere" står for selve indbruddene og deler udbyttet.

Ransomware er først og fremmest et angreb på **tilgængelighed** – en af informationssikkerhedens tre søjler sammen med fortrolighed og integritet. Men som det fremgår nedenfor, rammer moderne angreb ofte også fortroligheden.

## Sådan forløber et angreb

### Angrebets faser

Når filerne bliver krypteret, er angrebet som regel ved at være _slut_ – ikke ved at begynde. Et typisk forløb ser sådan ud:

| Fase                                              | Hvad sker der?                                                                                             | Eksempler                                                                                                                                                                                                                             |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Adgang**                                     | Angriberen får et første fodfæste                                                                          | Phishing-mail med skadelig vedhæftning eller link; stjålne eller gættede adgangskoder til fjernadgang (VPN, fjernskrivebord) uden MFA; en upatchet sårbarhed i et system, der vender mod internettet; adgang købt af andre kriminelle |
| **2. Fastholdelse**                               | Der installeres værktøjer, så angriberen kan komme tilbage                                                 | Fjernstyringsprogrammer, planlagte opgaver                                                                                                                                                                                            |
| **3. Flere rettigheder og bevægelse i netværket** | Angriberen samler adgangskoder og bevæger sig fra maskine til maskine med administratorrettigheder som mål | Opsamling af loginoplysninger, misbrug af administrationsværktøjer                                                                                                                                                                    |
| **4. Kortlægning og sabotage af genopretning**    | Netværket kortlægges, de værdifulde data findes – og backuppen opsøges                                     | Sletning af backupkopier, deaktivering af sikkerhedssoftware                                                                                                                                                                          |
| **5. Dataudtræk**                                 | Data kopieres ud af organisationen                                                                         | Upload til en cloudtjeneste, angriberen styrer                                                                                                                                                                                        |
| **6. Kryptering og krav**                         | Systemerne krypteres, ofte samtidig og uden for arbejdstid                                                 | Omdøbte filer og en løsepengebesked på alle skærme                                                                                                                                                                                    |

Det er vigtigt at forstå, fordi hver fase er en mulighed for at opdage og stoppe angrebet. En organisation, der bemærker usædvanlige administratorlogins eller store mængder data på vej ud i fase 3 eller 5, kan undgå fase 6 helt.

### Dobbelt afpresning

Fordi velforberedte ofre kunne nøjes med at genskabe fra backup, fandt de kriminelle grupper en ekstra løftestang: De stjæler data, _før_ de krypterer, og truer med at lægge dem ud på en såkaldt lækageside, hvis der ikke betales. Det kaldes **dobbelt afpresning** (_double extortion_). Nogle grupper går endnu videre – nogle gange kaldet tredobbelt afpresning – ved at kontakte offerets kunder og samarbejdspartnere direkte eller ved at lave overbelastningsangreb for at øge presset.

Konsekvensen er vigtig: **Et ransomwareangreb er meget ofte også et databrud**, med de anmeldelsespligter det kan udløse, fx til Datatilsynet efter GDPR, hvis der er personoplysninger involveret.

### Derfor skal backup være offline eller uforanderlig

Backup er det vigtigste enkeltstående værn mod krypteringsdelen af et angreb – men kun hvis angriberen ikke kan nå den. Angribere leder aktivt efter backupsystemer og sletter eller krypterer dem i fase 4. Nogle gode principper:

- **3-2-1-reglen:** mindst tre kopier af data, på to forskellige typer medier, hvoraf én opbevares et andet sted.
- **Mindst én kopi offline eller uforanderlig (_immutable_):** afkoblet fra netværket eller gemt, så den ikke kan ændres eller slettes i en fastsat periode – heller ikke af en administrator.
- **Separate adgange:** Backupsystemet bør ikke administreres med de samme konti som resten af netværket.
- **Test genskabelse jævnligt.** En backup, der aldrig er blevet genskabt, er et håb, ikke en plan. Vid, hvor lang tid en fuld genskabelse af de kritiske systemer faktisk tager.

## Hvad betyder det for organisationen og koordinatoren?

- **Risikovurdering.** Ransomware bør stå som scenarie i risikoregisteret med et ærligt bud på, hvor længe organisationen kan fungere uden sine vigtigste systemer.
- **Forebyggende kontroller.** MFA på fjernadgang og mail, hurtig opdatering af systemer, der vender mod internettet, begrænsede administratorrettigheder, netværkssegmentering og beskyttelse af endpoints rammer hver sin fase i forløbet.
- **Awareness.** Phishing er stadig en almindelig vej ind. Medarbejderne skal vide, hvordan de melder en mistænkelig mail, og at det altid er rigtigt at melde hurtigt – også selvom man allerede har klikket.
- **Beredskab.** Beredskabs- og kontinuitetsplanerne bør indeholde en ransomware-drejebog: Hvem beslutter hvad? Hvordan isoleres systemerne? Hvordan kommunikerer vi, når mail og intranet er nede? Hvem kan kontaktes uden for arbejdstid? Table-top-øvelser afslører hullerne.
- **Spørgsmålet om betaling.** Om man vil betale, er en ledelsesbeslutning, der skal være gennemtænkt på forhånd – ikke improviseret under pres. Betaling giver ingen garanti for fungerende dekrypteringsnøgler eller for, at stjålne data bliver slettet, den kan finansiere mere kriminalitet og rejse juridiske spørgsmål. Politiet og Center for Cybersikkerhed (CFCS) fraråder generelt at betale, og angreb bør anmeldes til politiet.
- **NIS2.** Artikel 21, stk. 2, kræver foranstaltninger til håndtering af hændelser (litra b) og driftskontinuitet, herunder backupstyring, reetablering efter katastrofer og krisestyring (litra c). Artikel 23 fastsætter underretning af CSIRT eller den kompetente myndighed: en tidlig varsling inden for 24 timer efter, at man er blevet opmærksom på en væsentlig hændelse, en hændelsesunderretning inden for 72 timer og en endelig rapport senest en måned efter hændelsesunderretningen.

## Typiske misforståelser

- **"Vi har backup, så vi er sikre."** Kun hvis den er offline eller uforanderlig og testet – og selv da betyder dobbelt afpresning, at stjålne data stadig kan blive lækket.
- **"Hvis vi betaler, får vi det hele tilbage."** Dekrypteringsværktøjer kan være langsomme eller fejlbehæftede, og man kan ikke kontrollere, at stjålne data rent faktisk slettes.
- **"Vi er for små til at være et mål."** Mange angreb er opportunistiske: Automatiske scanninger leder efter ethvert sårbart system, der er eksponeret på internettet, uanset hvem der ejer det.
- **"Det er et IT-problem."** Et ransomwareangreb lammer hele forretningen. Prioritering af genopretning, kommunikation og spørgsmålet om betaling er ledelsesmæssige og organisatoriske beslutninger.
- **"Antivirus fanger det."** Angribere slår ofte sikkerhedsværktøjer fra, før de krypterer, og bruger legitime administrationsprogrammer, der ikke udløser alarm. Der er brug for flere lag af kontroller og overvågning.
