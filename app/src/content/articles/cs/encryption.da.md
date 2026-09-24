---
title: Kryptering – nøgler, datatilstande og de rette krav
term: cs/encryption
lang: da
---

## Grundideen

Kryptering omdanner læsbare data (klartekst) til ulæselige data (kryptotekst) ved hjælp af en algoritme og en **nøgle**. Kun den, der har den rigtige nøgle, kan vende processen om. Selve algoritmerne er offentlige og grundigt afprøvede – AES, RSA, elliptisk kurvekryptografi – og hele sikkerheden hviler på, at nøglerne holdes hemmelige. Det ene forhold forklarer det meste af, hvad der går godt og skidt med kryptering i praksis: Stærke algoritmer er den nemme del. Det svære er at styre nøglerne.

## Symmetrisk og asymmetrisk kryptering

|                    | Symmetrisk                                                        | Asymmetrisk (offentlig nøgle)                                                              |
| ------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Nøgler             | Én fælles hemmelig nøgle, der både krypterer og dekrypterer       | Et nøglepar: en offentlig nøgle, som alle må kende, og en privat nøgle, som kun ejeren har |
| Hastighed          | Meget hurtig og velegnet til store datamængder                    | Langt langsommere og bruges til små datamængder                                            |
| Typiske algoritmer | AES, ChaCha20                                                     | RSA, algoritmer baseret på elliptiske kurver (ECDH, ECDSA)                                 |
| Største udfordring | At få den fælles nøgle sikkert over til modparten                 | At bevise, at en offentlig nøgle faktisk tilhører den, den påstås at tilhøre               |
| Typisk anvendelse  | Diskkryptering, databasekryptering, hovedparten af en TLS-session | Nøgleudveksling, digitale signaturer, certifikater                                         |

I praksis kombinerer man de to. Den asymmetriske kryptografi bruges til at aftale eller beskytte en symmetrisk nøgle, og den symmetriske nøgle klarer derefter det tunge arbejde. Sådan fungerer TLS, krypteret mail og de fleste værktøjer til filkryptering.

Asymmetrisk kryptografi gør også **digitale signaturer** mulige: Ejeren signerer med sin private nøgle, og alle kan kontrollere signaturen med den offentlige nøgle. Det giver ikke hemmeligholdelse, men integritet og bevis for afsenderen – og det er grundlaget for certifikater og signerede softwareopdateringer.

## Data under transport og data i hvile

Data skal beskyttes i to tilstande, og de dækkes af forskellige kontroller:

- **Under transport** – når data bevæger sig over et netværk: webtrafik, mail, API-kald, backup, der sendes til en cloudtjeneste. Beskyttes med TLS, VPN og sikre protokoller som SSH.
- **I hvile** – når data ligger lagret på en disk, i en database, på et USB-stik eller i en backup. Beskyttes med fuld diskkryptering (fx BitLocker eller FileVault), kryptering af databaser eller filer og krypteret backup.

Et system kan sagtens klare den ene tilstand godt og overse den anden. Et website med en perfekt hængelås kan stadig gemme kundedata ukrypteret på serveren, og en fuldt krypteret bærbar sender stadig data i klartekst, hvis forbindelserne ikke er beskyttet. Kravene bør derfor altid nævne begge dele.

Den tredje tilstand, **i brug** (data, der behandles i hukommelsen), er sværere at beskytte og hviler typisk på adgangsstyring og specialiseret teknologi frem for almindelig kryptering.

## Hashing er ikke kryptering

Hashing forveksles ofte med kryptering, men det er et andet værktøj:

- En hashfunktion laver et vilkårligt input om til et fingeraftryk med fast længde (fx med SHA-256).
- Den er **envejs**: Der er ingen nøgle, og det oprindelige input kan ikke genskabes ud fra hashværdien.
- Det samme input giver altid den samme hashværdi, og en ganske lille ændring giver en helt anden.

Derfor er hashing nyttig til **integritet** (er filen blevet ændret?) og til **opbevaring af adgangskoder**. Systemet gemmer en hashværdi i stedet for selve adgangskoden og sammenligner hashværdier, når brugeren logger ind. Til adgangskoder skal man bruge algoritmer, der er bevidst langsomme, bruger salt og er lavet til formålet – fx Argon2, bcrypt eller scrypt – så en stjålet database med adgangskoder er dyr at knække.

Pointen for den, der stiller krav: Hvis en leverandør siger, at adgangskoderne er "krypteret", så spørg, hvad de mener. Krypterede adgangskoder kan dekrypteres af enhver, der får fat i nøglen. Korrekt hashede adgangskoder kan slet ikke genskabes.

## Nøglehåndtering

Kryptering er aldrig stærkere end håndteringen af nøglerne. God nøglehåndtering dækker hele nøglens levetid:

- **Generering** – nøgler dannes af egnede værktøjer med stærk tilfældighed og vælges aldrig af mennesker.
- **Opbevaring** – nøgler holdes adskilt fra de data, de beskytter, helst i en nøgleboks (key vault), et hardwaresikkerhedsmodul (HSM) eller en TPM-chip – aldrig i kildekode eller et delt regneark.
- **Adgang** – så få personer og systemer som muligt kan bruge hver nøgle, og brugen logges.
- **Udskiftning** – nøgler udskiftes efter en fast plan og straks ved mistanke om kompromittering.
- **Backup og genopretning** – gendannelsesnøgler (fx til krypterede bærbare) opbevares sikkert, så en glemt adgangskode ikke betyder tabte data.
- **Udfasning** – gamle nøgler tilbagekaldes og destrueres, når der ikke længere er brug for dem.

Et spørgsmål, der ofte dukker op ved cloudtjenester, er: **Hvem har nøglen?** Styrer udbyderen nøglerne, kan udbyderen teknisk set læse data. Med kundestyrede nøgler flyttes kontrollen – og ansvaret – over til jer selv.

## Derfor er kryptering et krav i NIS2

NIS2 artikel 21, stk. 2, litra h, nævner "politikker og procedurer vedrørende brug af kryptografi og, hvor det er relevant, kryptering" blandt minimumsforanstaltningerne til styring af cybersikkerhedsrisici. GDPR artikel 32 nævner kryptering som eksempel på en passende teknisk foranstaltning, og efter GDPR artikel 34 kan det være unødvendigt at underrette de berørte personer, hvis de kompromitterede personoplysninger var gjort uforståelige, fx ved kryptering med en nøgle, der ikke er kompromitteret.

For en koordinator betyder det typisk, at man skal have:

1. En **kryptografipolitik**, der fastlægger, hvilke data der skal krypteres under transport og i hvile, og hvilke algoritmer og protokolversioner der er tilladt (fx AES-256 eller tilsvarende, TLS 1.2 eller nyere).
2. **Procedurer for nøglehåndtering**, der dækker hele levetiden ovenfor, med navngivne ejere.
3. **Kontrol af dækningen**: Er alle bærbare, mobile enheder, backups og databaser med følsomme data faktisk krypteret – og hvordan ved vi det?
4. **Krav til leverandører**, så de samme regler gælder for cloud- og hostingudbydere.
5. En plan for **kryptoagilitet**: et overblik over, hvor kryptografi bruges, så algoritmer kan skiftes ud, når de svækkes. Emnet får stigende opmærksomhed, efterhånden som organisationer forbereder sig på post-kvante-kryptografi.

Kryptering forhindrer sjældent, at et angreb finder sted. Men den afgør, hvor alvorlige konsekvenserne bliver, når data går tabt, bliver stjålet eller aflyttet – og derfor hører den hjemme i enhver plan for risikohåndtering.
