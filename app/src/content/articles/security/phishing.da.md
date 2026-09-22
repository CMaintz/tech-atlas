---
title: 'Phishing: falske beskeder i mange former – og hvordan organisationen tager kampen op'
term: security/phishing
lang: da
---

## Hvad er phishing?

**Phishing** er forsøg på at narre nogen til at gøre noget, der gavner en angriber – taste sin adgangskode ind på en falsk side, åbne en skadelig vedhæftning, godkende en betaling eller udlevere oplysninger – ved at sende en besked, der udgiver sig for at komme fra en afsender, man stoler på. Ordet er et ordspil på engelsk _fishing_: Madding kastes bredt ud, og afsenderen behøver kun, at nogle få bider på.

Phishing er en form for **social engineering**, dvs. manipulation af mennesker. Angrebet går efter vores dømmekraft frem for tekniske svagheder, og det er præcis derfor, det er så sejlivet: Firewalls og opdateringer hjælper ikke meget, når den legitime bruger selv åbner døren indefra. Phishing er ofte første skridt i større angreb, herunder ransomware og databrud.

## Sådan fungerer det

### Varianter

Grundtricket er altid det samme, men det findes i mange udgaver:

| Variant                                                 | Kendetegn                                                                                                                                                                                |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Masse-phishing**                                      | Samme generiske besked til tusindvis: "Din pakke er forsinket", "Din indbakke er fuld"                                                                                                   |
| **Spear phishing**                                      | Målrettet en bestemt person eller gruppe og gjort troværdig med oplysninger fra LinkedIn, virksomhedens hjemmeside eller tidligere læk                                                   |
| **Whaling**                                             | Spear phishing rettet mod topledere, hvis adgang og beføjelser er særligt værdifulde                                                                                                     |
| **Direktørsvindel / BEC** (_Business Email Compromise_) | Angriberen udgiver sig for – eller har overtaget mailen hos – en leder eller leverandør og beder om en hasteoverførsel eller nye kontooplysninger. Ofte helt uden link eller vedhæftning |
| **Smishing**                                            | Phishing via SMS eller beskedapps                                                                                                                                                        |
| **Vishing**                                             | Phishing via telefonopkald – fx en falsk "it-support" eller "bank", der beder offeret læse en kode op eller godkende et login, også med MitID                                            |
| **Quishing**                                            | En QR-kode i en mail eller på en plakat, der fører til en falsk side; offeret flyttes over på mobilen, ofte uden for virksomhedens beskyttelse                                           |
| **Klon-phishing**                                       | En kopi af en ægte mail, som offeret tidligere har fået, hvor linket eller vedhæftningen er byttet ud med noget skadeligt                                                                |

Nogle angreb bruger desuden en **adversary-in-the-middle**-teknik: Den falske login-side sender alt videre til den rigtige tjeneste i realtid og opsnapper ikke kun adgangskoden, men også engangskoden og den session, der kommer ud af det. Derfor mindsker almindelig MFA risikoen, men fjerner den ikke.

### Psykologien bag

Phishing-beskeder spiller på nogle få, forudsigelige knapper:

- **Tidspres** – "inden for 24 timer", "din konto lukkes".
- **Autoritet** – direktøren, Skattestyrelsen, banken, politiet.
- **Frygt eller nysgerrighed** – en ubetalt faktura, en lønregulering, et delt dokument, du "skal" se.
- **Hjælpsomhed og rutine** – en anmodning, der ligner almindeligt dagligt arbejde.

### Advarselstegn

Intet enkelt tegn er afgørende, men disse bør få alle til at stoppe op:

- Afsenderens adresse eller domæne er en anelse forkert (`micros0ft.com` eller en gratis mailadresse for en "virksomhed").
- Linkteksten siger én ting, men holder man musen over, peger den et andet sted hen.
- En uventet anmodning om at logge ind, betale, ændre kontonummer eller oplyse en kode.
- Pres for at handle hurtigt eller holde det hemmeligt ("sig det ikke til nogen endnu").
- En uventet vedhæftning, især komprimerede filer eller dokumenter, der beder dig "aktivere indhold".
- En besked, der bryder den normale proces – fx en leverandørs nye kontonummer, der kun meldes via mail.
- En tone eller tiltaleform, der ikke passer til den formodede afsender.

Velformuleret spear phishing har måske ingen af de klassiske stavefejl. Det mest pålidelige forsvar er derfor **processer**: Bekræft usædvanlige anmodninger via en anden, kendt kanal.

## Hvad betyder det for organisationen og koordinatoren?

Phishing ligger lige i krydsfeltet mellem teknik, mennesker og processer – præcis det felt, hvor en koordinator- eller awareness-rolle arbejder.

- **Tekniske kontroller i lag.** Mailfiltrering, autentificering af afsenderdomæner (SPF, DKIM og DMARC), markering af eksterne mails, blokering af risikable filtyper og frem for alt MFA – helst phishing-resistent – reducerer både antallet af beskeder, der når frem, og skaden, når nogen klikker.
- **Proceskontroller.** Betalinger og ændringer af kontooplysninger bør altid kræve bekræftelse via et kendt telefonnummer eller en ekstra godkender, uanset hvem der tilsyneladende spørger. Den ene regel stopper det meste direktørsvindel.
- **Awareness-program.** Træningen skal være kort, tilbagevendende og relevant for modtagernes faktiske arbejde. Phishing-simulationer kan være nyttige til læring og måling, men de skal designes til at opbygge kompetencer og tillid – ikke til at hænge folk ud.
- **Gør det nemt at melde.** En "Rapportér phishing"-knap og en hurtig, venlig respons er afgørende. Medarbejdere, der melder et klik inden for få minutter, giver sikkerhedsfolkene en chance for at nulstille adgangskoder og blokere siden, før skaden breder sig. Skyld og skam lærer folk at tie.
- **Meningsfulde KPI'er.** Andelen, der melder, og hvor hurtigt de gør det, siger ofte mere om sikkerhedskulturen end klikraten alene.
- **Hændelseshåndtering.** Drejebogen for en indrapporteret phishing-mail bør dække: Har andre fået den? Fjern den fra indbakkerne, bloker links og afsender, nulstil eventuelt kompromitterede loginoplysninger, og gennemgå logins.
- **NIS2.** Artikel 21, stk. 2, litra g, kræver grundlæggende cyberhygiejne og uddannelse i cybersikkerhed, og artikel 20 kræver, at også medlemmerne af ledelsen deltager i uddannelse. Et dokumenteret awareness-program med phishing som centralt tema er en naturlig måde at leve op til det på. Center for Cybersikkerhed (CFCS) udgiver trusselsvurderinger og vejledninger, der kan bruges som afsæt.

## Typiske misforståelser

- **"Det er kun de uopmærksomme eller utekniske, der hopper på phishing."** Målrettede beskeder narrer erfarne fagfolk, også sikkerhedsfolk. Alle kan blive fanget på en travl dag.
- **"Phishing handler kun om mail."** SMS, telefonopkald, beskedapps, QR-koder og samarbejdsværktøjer bliver alle brugt.
- **"Man kan altid kende det på det dårlige dansk."** Angribere laver i stigende grad flydende og pænt opsatte beskeder – også på dansk.
- **"Det farlige er at klikke; der sker ikke noget, hvis jeg ikke taster noget ind."** Ofte rigtigt for links, men at åbne en vedhæftning kan være nok – og det rigtige svar er under alle omstændigheder at melde det.
- **"Et godt resultat i simulationen betyder, at vi er sikre."** En simulation måler adfærden én dag med ét scenarie. Tekniske kontroller og bekræftelsesprocedurer skal bære læsset, når en rigtig og bedre udformet besked slipper igennem.
