---
title: 'Zero Trust: fra borgmur til kontrol af hver eneste anmodning'
term: security/zero-trust
lang: da
---

## Hvad er Zero Trust?

I mange år har organisationer beskyttet deres IT som en middelalderborg: en stærk mur (firewallen) rundt om netværket og forholdsvis fri adgang for dem, der allerede var inden for. Tanken var, at "indenfor" betød "til at stole på". Den antagelse holder ikke længere. Medarbejdere arbejder hjemmefra, data ligger i cloudtjenester, leverandører har fjernadgang - og angribere har fundet ud af, at det er lettere at stjæle én medarbejders login end at bryde muren ned.

**Zero Trust** er svaret på det problem. Det er ikke et produkt, man kan købe, men et sæt designprincipper, der ofte opsummeres som **"stol aldrig blindt - verificér altid"** (på engelsk _never trust, always verify_). Ingen bruger, enhed eller netværksplacering får automatisk tillid. Hver anmodning om adgang - til en fil, et system eller en database - vurderes for sig, og adgangen gives kun til den konkrete session og kun i det omfang, opgaven kræver.

Den mest brugte definition stammer fra den amerikanske standardiseringsorganisation NIST i **Special Publication 800-207, _Zero Trust Architecture_** fra 2020. Her beskrives Zero Trust som et skift væk fra faste, netværksbaserede perimetre og hen imod at beskytte brugere, aktiver og ressourcer direkte.

## Sådan fungerer det

### De bærende principper

NIST SP 800-207 opstiller en række grundprincipper. Kort fortalt er de vigtigste:

- **Alle datakilder og tjenester er ressourcer, der skal beskyttes** - ikke kun servere, men også SaaS-løsninger og private enheder, der har adgang til virksomhedens data.
- **Al kommunikation sikres uanset netværksplacering.** At sidde på kontorets netværk giver ingen ekstra tillid.
- **Adgang gives pr. session.** At man måtte komme ind i HR-systemet kl. 9 betyder ikke, at man automatisk må det kl. 23 fra et andet land.
- **Adgangsbeslutninger er dynamiske** og bygger på brugerens identitet, enhedens tilstand (er den opdateret, administreret og krypteret?), hvor følsom ressourcen er, og andre signaler som placering og adfærd.
- **Organisationen overvåger løbende sine aktivers sikkerhedstilstand** og bruger informationen til at træffe bedre beslutninger.

### Beslutning og håndhævelse

NIST beskriver en logisk arkitektur med nogle få centrale komponenter:

| Komponent                          | Opgave                                                                                                                      | Hverdagssammenligning                                 |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **Policy Engine (PE)**             | Afgør, om en given anmodning skal godkendes, ud fra regler og input som identitet, enhedens tilstand og trusselsinformation | Sikkerhedschefen, der fastsætter og anvender reglerne |
| **Policy Administrator (PA)**      | Udfører beslutningen - åbner eller lukker forbindelsen mellem bruger og ressource                                           | Vagtcentralen, der giver besked videre                |
| **Policy Enforcement Point (PEP)** | Står foran ressourcen og tillader, overvåger eller afbryder selve forbindelsen                                              | Vagten ved afdelingsdøren                             |

Policy Engine og Policy Administrator kaldes tilsammen for Policy Decision Point. Pointen er, at brugeren aldrig taler direkte med ressourcen; al trafik går gennem et håndhævelsespunkt, som først har fået en afgørelse.

### Mikrosegmentering og mindst mulige rettigheder

Et klassisk "fladt" netværk lader en kompromitteret bærbar nå næsten alt. **Mikrosegmentering** deler miljøet op i små zoner - nogle gange helt ned til det enkelte system - hver med sin egen dørvogter. Sammen med princippet om **mindst mulige rettigheder** (_least privilege_), hvor personer og systemer kun får de rettigheder, opgaven kræver, begrænser det skaden ved et enkelt indbrud. En angriber, der overtager receptionens pc, skal ikke kunne nå økonomisystemet derfra.

### Identitet er den nye perimeter

Når netværket ikke længere giver tillid, er det identiteten, der bærer læsset. Stærk autentificering - i praksis MFA, gerne i en phishing-resistent udgave - er et fundament for Zero Trust, sammen med et pålideligt overblik over, hvilke enheder der findes, og om de er sunde.

## Hvad betyder det for organisationen og koordinatoren?

Zero Trust er en rejse, ikke en kontakt, man slår til. De fleste organisationer bevæger sig gradvist i retning af det, og meget af arbejdet er organisatorisk snarere end teknisk:

- **Kend jeres aktiver.** Man kan ikke beskytte noget, man ikke ved findes. En opdateret aktivliste og klassifikation af data er en forudsætning.
- **Afklar, hvem der skal have adgang til hvad.** Adgangsregler kræver, at forretningen tager stilling til, hvilke roller der har brug for hvilke data. Her er koordinatoren ofte bindeleddet mellem IT og afdelingslederne.
- **Skriv det ind i politikken.** Adgangsstyringspolitikken bør afspejle mindst mulige rettigheder, periodisk gennemgang af adgange og krav om stærk autentificering.
- **Prioritér.** Start med kronjuvelerne - de systemer, hvor tab eller læk vil gøre mest skade, som risikovurderingen har peget på.
- **Kommunikér.** Brugerne vil opleve flere kontroller. Awareness-indsatsen skal forklare, hvorfor "adgangskortet ved hver dør" er en fordel og ikke bare bøvl.

For virksomheder, der er omfattet af **NIS2** (i Danmark gennemført ved NIS2-loven), er Zero Trust ikke nævnt som et krav. Men tankegangen passer direkte på flere af foranstaltningerne i **artikel 21, stk. 2**: personalesikkerhed, adgangsstyring og styring af aktiver (litra i), brug af multifaktor- eller kontinuerlig autentificering (litra j) og grundlæggende cyberhygiejne (litra g). En Zero Trust-køreplan kan derfor være en praktisk måde at strukturere og dokumentere compliancearbejdet på.

## Typiske misforståelser

- **"Zero Trust betyder, at vi ikke stoler på vores medarbejdere."** Det handler om ikke at stole _automatisk_. Medarbejderne verificeres netop for, at de trygt kan få adgang hvor som helst fra.
- **"Vi har købt et Zero Trust-produkt, så nu er vi færdige."** Leverandører sælger byggeklodser, fx identitetsplatforme og sikre adgangsløsninger, men Zero Trust er en arkitektur og en måde at drive sikkerhed på. Intet enkelt produkt leverer det hele.
- **"Zero Trust erstatter firewallen."** Perimeterbeskyttelse har stadig værdi - den er bare ikke længere det eneste forsvar.
- **"Det er kun for store virksomheder."** Også små organisationer arbejder efter principperne, når de kræver MFA på alle cloudtjenester, lukker ubrugte konti og begrænser administratorrettigheder.
- **"Når det først er indført, er det på plads."** Behov, enheder og trusler ændrer sig hele tiden. Løbende overvågning og gennemgang er en del af selve modellen.
