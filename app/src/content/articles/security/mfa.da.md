---
title: 'Multifaktorgodkendelse: hvorfor én adgangskode ikke er nok – og hvorfor MFA ikke er ens'
term: security/mfa
lang: da
---

## Hvad er MFA?

**Multifaktorgodkendelse (MFA)** betyder, at et login kræver mindst to beviser fra _forskellige kategorier_. Adgangskoden alene åbner ikke længere døren; en angriber, der har stjålet eller gættet den, mangler stadig det andet bevis.

De fleste danskere bruger MFA hver dag uden at tænke over det. Når du logger på med **MitID**, skal du bruge noget, du har (MitID-appen på din telefon eller en kodeviser), og appen er selv låst med noget, du ved eller er (en pinkode eller dit fingeraftryk) – eller kodeviseren kombineres med en adgangskode. Dankortet med pinkode er samme princip. I en virksomhed handler MFA om at få samme beskyttelse ind på mail, cloudtjenester, fjernadgang og fagsystemer – og det er en af de få kontroller, som NIS2-direktivet nævner ved navn.

## Sådan fungerer det

### De tre faktorkategorier

| Kategori         | Beskrivelse                                       | Eksempler                                                               |
| ---------------- | ------------------------------------------------- | ----------------------------------------------------------------------- |
| **Noget du ved** | En hemmelighed, du husker                         | Adgangskode, pinkode, svar på et kontrolspørgsmål                       |
| **Noget du har** | En fysisk eller digital genstand i din besiddelse | Telefon med godkendelsesapp, sikkerhedsnøgle, chipkort, MitID-kodeviser |
| **Noget du er**  | Et biometrisk kendetegn                           | Fingeraftryk, ansigtsgenkendelse                                        |

Faktorerne skal komme fra **forskellige** kategorier. En adgangskode plus et kontrolspørgsmål er stadig to ting, du ved – lækker den ene via en falsk hjemmeside, lækker den anden typisk samtidig.

Biometri på telefoner og bærbare bruges som regel _lokalt_: Dit fingeraftryk låser en nøgle op, der ligger på din egen enhed, og det er nøglen, der beviser din identitet over for tjenesten. Selve fingeraftrykket sendes ikke nogen steder hen.

### MFA er ikke bare MFA

Den amerikanske NIST-vejledning om digital identitet (**SP 800-63B**) og sikkerhedsmyndigheder i mange lande skelner skarpt mellem forskellige typer anden faktor. Groft sagt fra svagest til stærkest:

1. **Koder via SMS eller opkald.** Bedre end ingenting, men koden kan opsnappes via SIM-swap (hvor angriberen får teleselskabet til at flytte dit nummer til sit SIM-kort), og – vigtigst – brugeren kan narres til at taste koden ind på en falsk side. NIST betegner SMS som en "begrænset" metode, der kun bør bruges med bevidsthed om risikoen.
2. **Engangskoder fra en app (TOTP)** – de sekscifrede koder, der skifter hvert 30. sekund. De undgår telenettet, men kan stadig phishes: Den falske login-side beder bare om koden og sender den videre med det samme.
3. **Push-beskeder** ("Vil du godkende dette login?"). Nemt for brugeren, men sårbart over for **push-træthed** (_MFA bombing_): Angriberen, som allerede har adgangskoden, sender besked efter besked – gerne midt om natten – indtil den trætte eller forvirrede bruger trykker "Godkend". Modtræk er bl.a. **talmatchning**, hvor brugeren skal indtaste et tal fra login-skærmen, og visning af hvor og til hvad anmodningen kommer fra.
4. **Phishing-resistent MFA**, fx **FIDO2/WebAuthn-sikkerhedsnøgler og passkeys** eller chipkort. Her er det kryptografiske bevis bundet til den ægte hjemmesides adresse. Et lignende, falsk domæne får simpelthen ikke et gyldigt svar, så der er ingen kode, brugeren kan komme til at udlevere. Det fjerner den menneskelige vurdering fra det mest almindelige angreb.

Moderne phishing-værktøjer fungerer ofte som en _adversary-in-the-middle_: De står mellem brugeren og den rigtige login-side, sender alt videre og opsnapper både adgangskode og engangskode – eller den sessionscookie, der kommer ud af det. Derfor betyder forskellen på "MFA" og "phishing-resistent MFA" så meget.

## Hvad betyder det for organisationen og koordinatoren?

- **Politik.** Adgangsstyrings- eller autentifikationspolitikken bør fastslå, hvor MFA er obligatorisk. Typisk prioriteres mail og cloudtjenester, der kan nås fra internettet, fjernadgang (VPN), administratorkonti og systemer med følsomme data.
- **NIS2.** Artikel 21, stk. 2, litra j, nævner direkte brug af multifaktorautentificering eller løsninger med kontinuerlig autentificering blandt de foranstaltninger, der skal indføres, hvor det er relevant. At kunne dokumentere, hvor MFA er slået til – og hvor det ikke er, og hvorfor – er en helt konkret compliance-opgave.
- **Undtagelser og ældre systemer.** Nogle gamle systemer kan ikke håndtere MFA. De skal registreres som risici med kompenserende kontroller og en plan – ikke bare accepteres i stilhed.
- **Gendannelse.** En angriber, der ikke kan komme uden om MFA, ringer måske til servicedesken og beder om at "nulstille telefonen". Den procedure skal kontrollere identiteten lige så grundigt som selve loginet.
- **Awareness.** Medarbejderne skal have få og klare regler: Godkend aldrig en anmodning, du ikke selv har startet. Læs aldrig en kode op for nogen, der ringer til dig. Meld straks uventede anmodninger – de betyder, at adgangskoden sandsynligvis allerede er kendt af en anden.
- **Hændelseshåndtering.** Uventede MFA-anmodninger eller en række afviste anmodninger er et tegn på kompromitterede loginoplysninger: Skift adgangskoden, gennemgå login-loggen, og tjek for nye videresendelsesregler i mailen eller nyregistrerede enheder.
- **Udrulning.** Indførelsen lykkes, når formålet er forklaret, supporten er klar, og medarbejderne har registreret en reservemetode, før de mister telefonen.

## Typiske misforståelser

- **"Vi har MFA, så phishing kan ikke ramme os."** Koder og push-godkendelser kan phishes eller "trættes" igennem. Kun phishing-resistente metoder lukker det hul – og selv da kan angriberen gå efter gendannelsesprocessen i stedet.
- **"To adgangskoder er to faktorer."** Det er to eksemplarer af den samme faktor.
- **"SMS-koder er ubrugelige."** De er den svageste udbredte løsning, men stadig langt bedre end en adgangskode alene. Ryk op ad stigen, hvor det er muligt, men fjern ikke SMS uden en afløser.
- **"MFA er kun for it-folk og ledere."** Angribere starter ofte med helt almindelige konti og arbejder sig op derfra. Alle konti med adgang til mail eller virksomhedsdata har gavn af det.
- **"Biometri sender mit fingeraftryk til arbejdsgiveren."** I de fleste moderne løsninger låser biometrien kun en nøgle op, der ligger på din egen enhed.
- **"MFA løser problemet med svage adgangskoder."** Det gør dem langt mindre farlige, men god adgangskodehygiejne betyder stadig noget – især på systemer, hvor MFA ikke kan håndhæves.
