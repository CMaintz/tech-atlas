---
title: Modellen for delt ansvar — hvem sikrer hvad i skyen
term: platform/shared-responsibility-model
lang: da
---

## Hvad er det?

**Modellen for delt ansvar** beskriver, hvordan sikkerheds- og driftsopgaver fordeles mellem en cloududbyder og kunden. Udbyderen har ansvaret for sikkerheden _af_ skyen – datacentre, hardware, netværk og de softwarelag, den driver – mens kunden har ansvaret for sikkerheden _i_ skyen: sine data, sine brugere og adgangsrettigheder og den måde, den konfigurerer de tjenester, den køber.

Udtrykket blev udbredt af Amazon Web Services i begyndelsen af 2010'erne, da kunder, der flyttede til skyen, gik ud fra, at "udbyderen tager sig af sikkerheden nu". AWS offentliggjorde diagrammer med en streg mellem udbyder og kunde, og Microsoft, Google og andre fulgte med deres egne versioner. Ideen er siden taget op af Cloud Security Alliance, hvis Cloud Controls Matrix (CCM) for hver kontrol angiver, om den typisk ejes af udbyderen, kunden eller begge. Modellen er ikke i sig selv en lov eller en standard, men det er det sprog, kontrakter, revisioner og tilsynsmyndigheder bruger, når de spørger, hvem der gør hvad.

## Hvordan virker det?

### Stregen flytter sig med servicemodellen

Fordelingen afhænger af, hvor meget af stakken udbyderen driver:

| Lag                                  | Eget hus | IaaS    | PaaS    | SaaS    |
| ------------------------------------ | -------- | ------- | ------- | ------- |
| Data og klassifikation af dem        | Kunde    | Kunde   | Kunde   | Kunde   |
| Brugerkonti og adgang                | Kunde    | Kunde   | Kunde   | Kunde   |
| Applikation                          | Kunde    | Kunde   | Delt    | Udbyder |
| Afviklingsmiljø, mellemlag, database | Kunde    | Kunde   | Udbyder | Udbyder |
| Styresystem og patching              | Kunde    | Kunde   | Udbyder | Udbyder |
| Virtualisering                       | Kunde    | Udbyder | Udbyder | Udbyder |
| Servere, lager, netværk              | Kunde    | Udbyder | Udbyder | Udbyder |
| Fysisk datacenter                    | Kunde    | Udbyder | Udbyder | Udbyder |

To rækker flytter sig aldrig: **data** og **identitet og adgang** bliver hos kunden i alle modeller. Selv med SaaS er det dig, der bestemmer, hvem der får en konto, om MFA er slået til, hvad der deles eksternt, og hvilke data der lægges ind i tjenesten.

### "Delt" betyder, at begge parter handler

Nogle kontroller er reelt delte. Kryptering er et typisk eksempel: Udbyderen kan tilbyde kryptering af lagrede data, men kunden beslutter, om der skal bruges egne nøgler, og hvem der kan administrere dem. Logning er et andet: Udbyderen producerer logs, men kunden skal slå de relevante til, gemme dem længe nok og faktisk kigge på dem.

### Hvor det går galt

De fleste cloudhændelser skyldes ikke, at udbyderen bliver kompromitteret. De kommer fra kundens side af stregen: en lagerbeholder, der står åben mod internettet, en administratorkonto uden MFA, for brede API-nøgler, logs der aldrig blev slået til. Det er former for **fejlkonfiguration i skyen**, og de opstår oftest dér, hvor hver part troede, at den anden havde ansvaret.

Backup er det klassiske hul. Mange SaaS-udbydere garanterer tjenestens _tilgængelighed_ og beskytter mod deres egne hardwarefejl, men ikke mod, at kunden sletter data ved en fejl, en ondsindet medarbejder eller ransomware, der krypterer synkroniserede filer. At gendanne en brugers postkasse fra for seks måneder siden er måske slet ikke muligt, medmindre kunden selv har sørget for backup.

## Hvad betyder det for en organisation og en koordinator?

Modellen er kun nyttig, når den er skrevet ned for hver enkelt tjeneste. Udbydernes generelle diagrammer er et udgangspunkt; den faktiske fordeling afhænger af kontrakten, abonnementsniveauet og de funktioner, man har slået til.

- **Fordel kontrollerne på ejere.** Gå for hver vigtig cloudtjeneste jeres kontrolsæt igennem – ISO 27001 Anneks A, CSA CCM eller NIS2's minimumskrav – og marker hver kontrol som udbyder, kunde eller delt.
- **Få dokumentation for udbyderens del.** Certifikater, revisionserklæringer (ISAE 3402, SOC 2) og udbyderens egen beskrivelse af delt ansvar viser, at udbyderens side er dækket. Tjek omfanget.
- **Udpeg interne ejere for jeres del.** "Kunden" er ikke en ejer. Navngiv det team eller den rolle, der har ansvaret for hver kundekontrol.
- **Skriv det ind i kontrakter og leverandørstyring.** Fordelingen hører hjemme i leverandørgennemgangen og så vidt muligt i kontrakten og databehandleraftalen.

### Et eksempel fra praksis

Emma er GRC-studerende i et dansk revisionsfirma og skal deltage i den årlige leverandørgennemgang af firmaets SaaS-samarbejdspakke (mail, fildeling, chat). Som i eksemplet fra begrebets definition bygger hun et regneark med firmaets ISO 27001 Anneks A-kontroller i rækkerne og tre kolonner: udbyder, kunde, delt.

De fleste rækker er ligetil. Udbyderens ISO 27001-certifikat og SOC 2-rapport dækker fysisk sikkerhed, hardware og patching. Kundekolonnen fyldes med brugeradministration, MFA, indstillinger for ekstern deling og dataklassifikation. Så når hun til kontrol 8.13, backup af information. IT gik ud fra, at udbyderen tog backup af det hele; udbyderens dokumentation siger, at slettede elementer gemmes i en begrænset periode, og at der er beskyttelse mod udbyderens egne fejl, men at langsigtet backup med gendannelse til et bestemt tidspunkt er kundens ansvar. Ingen ejer den.

Emma registrerer hullet i risikoregistret, vurderer konsekvensen (tab af klientfiler ældre end opbevaringsperioden efter et ransomwareangreb eller en fejlsletning) og foreslår en backuptjeneste fra en tredjepart til pakken. Ledelsen godkender det, og kontrollen har nu en navngiven ejer og en kvartalsvis gendannelsestest.

## Typiske misforståelser

- **"Vi er i skyen, så sikkerhed er udbyderens opgave."** Udbyderen sikrer sin infrastruktur. Jeres data, brugere og indstillinger er jeres i alle servicemodeller.
- **"SaaS betyder, at udbyderen gør alt."** SaaS flytter mest ansvar til udbyderen, men identitet, adgang, data og ofte backup bliver hos jer.
- **"Udbyderens certifikat dækker os."** Det dækker udbyderens side inden for certifikatets omfang. Det siger intet om, hvordan I har konfigureret tjenesten.
- **"Fordelingen er den samme hos alle udbydere."** Den varierer efter udbyder, tjeneste og kontrakt. Læs dokumentationen for hver tjeneste, I er afhængige af.
- **"Ansvaret kan outsources."** Opgaver kan outsources; ansvaret kan ikke. Efter GDPR og NIS2 er organisationen stadig ansvarlig for sine data og sine sikkerhedsforanstaltninger.
