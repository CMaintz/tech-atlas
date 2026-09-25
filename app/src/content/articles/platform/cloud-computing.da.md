---
title: Cloud computing - hvad "skyen" egentlig er, og hvad den ændrer for sikkerhed og compliance
term: platform/cloud-computing
lang: da
---

## Hvad er det?

**Cloud computing** betyder at leje regnekraft, lager og software over et netværk fra en udbyder og betale for forbruget i stedet for selv at købe og drive det. Den mest citerede definition kommer fra NIST Special Publication 800-145 (2011): en model, der giver bekvem adgang efter behov via netværket til en fælles pulje af konfigurerbare IT-ressourcer, som hurtigt kan tages i brug og frigives med minimal administration eller kontakt med udbyderen.

Ideen om it som en forsyning er årtier gammel - i 1960'erne solgte man processortid på mainframes i minutter. Den moderne sky begyndte i 2006, da Amazon Web Services lancerede lagertjenesten S3 og tjenesten EC2 med virtuelle servere, så alle kunne leje en server med et kreditkort og slukke den igen en time senere. Microsoft Azure og Google Cloud fulgte efter, og software solgt som abonnement over nettet (Salesforce, senere Microsoft 365 og Google Workspace) gjorde skyen til standardmåden at købe forretningssoftware på. Under det hele ligger **virtualisering**: En **hypervisor** lader én fysisk **server** køre mange adskilte **virtuelle maskiner**, så en udbyder kan dele hardware mellem tusindvis af kunder.

## Hvordan virker det?

### De fem kendetegn

NIST nævner fem egenskaber, der tilsammen gør noget til "cloud" frem for almindelig hosting:

| Kendetegn                 | Hvad det betyder i praksis                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| Selvbetjening efter behov | Du opretter selv servere, databaser eller konti via en portal eller et API - uden at oprette en sag |
| Bred netværksadgang       | Tjenesterne er tilgængelige via netværket fra almindelige enheder                                   |
| Fælles ressourcepulje     | Udbyderen betjener mange kunder fra fælles hardware, adskilt fra hinanden                           |
| Hurtig elasticitet        | Kapaciteten kan vokse og skrumpe hurtigt, ofte automatisk                                           |
| Målt forbrug              | Forbruget måles, og du betaler for det, du bruger                                                   |

### De tre servicemodeller

- **IaaS (Infrastructure as a Service)** - du lejer virtuelle maskiner, netværk og lager og administrerer alt fra styresystemet og opefter.
- **PaaS (Platform as a Service)** - du lægger din kode eller dine data på en administreret platform (en databasetjeneste, et afviklingsmiljø); udbyderen driver styresystem og mellemlag.
- **SaaS (Software as a Service)** - du bruger en færdig applikation i browseren; udbyderen driver næsten alt, og du administrerer brugere, indstillinger og data.

Hvert skridt fra IaaS mod SaaS overdrager mere arbejde - og mere kontrol - til udbyderen. Den forskydning er grundlaget for **modellen for delt ansvar**.

### De fire udrulningsmodeller

NIST skelner også mellem **offentlig sky** (delt af mange kunder), **privat sky** (forbeholdt én organisation, i eller uden for dens egne lokaler), **fællesskabssky** (delt af organisationer med fælles behov, fx en gruppe kommuner) og **hybrid sky** (en kombination). De fleste organisationer er i praksis hybride i dag, med nogle systemer i eget hus og mange SaaS-abonnementer.

## Hvad betyder det for en organisation og en koordinator?

At flytte til skyen fjerner ikke sikkerhedsarbejdet; det ændrer dets form. Fysisk sikkerhed, hardware og en stor del af patchingen flytter til udbyderen. Tilbage - eller større - bliver identitets- og adgangsstyring, konfiguration, databeskyttelse og **leverandørstyring**.

- **Kontrakter og databeskyttelse.** En cloududbyder, der behandler personoplysninger, er **databehandler** efter GDPR, så der kræves en **databehandleraftale**, herunder hvor data opbevares, og hvilke underdatabehandlere der bruges. Overførsler uden for EU/EØS kræver et retsgrundlag.
- **Konfiguration.** Mange cloudhændelser er ikke udbyderens fejl, men kundens indstillinger: en lagerbeholder (bucket), der står åben for alle, en administratorkonto uden MFA. **Fejlkonfiguration i skyen** er en af de hyppigste årsager til datalæk i cloudmiljøer.
- **Afhængighed og exit.** Hvad sker der, hvis udbyderen har nedbrud, hæver priserne eller går konkurs? En exitplan og backup uden for udbyderen hører hjemme i beredskabsplanlægningen.
- **Regulering.** For NIS2-enheder dækker forsyningskædesikkerhed (artikel 21, stk. 2, litra d) forholdet til leverandører og tjenesteudbydere, herunder cloududbydere, som desuden selv er omfattet af NIS2. Den finansielle sektors DORA har detaljerede regler for tredjepartsleverandører af IKT.

### Et eksempel fra praksis

Jonas er GRC-studerende og hjælper en dansk kommune, der flytter sit sagsbehandlingssystem ud af sit eget serverrum og ind i en udbyders datacenter, som man får adgang til via internettet - eksemplet fra begrebets definition. IT-afdelingen har valgt en SaaS-løsning; Jonas bliver spurgt, hvad compliance-teamet skal gøre.

Han starter med data: Systemet indeholder borgernes personoplysninger, nogle af dem følsomme, så der skal være en **databehandleraftale**, og han tjekker udbyderens liste over underdatabehandlere og datalokationer. Han gennemgår leverandørens ISO 27001-certifikat og dets omfang og beder om den seneste uafhængige revisionserklæring (fx ISAE 3402 eller SOC 2). Derefter tegner han fordelingen efter **modellen for delt ansvar** for løsningen: Udbyderen driver platformen og backup af tjenesten; kommunen ejer brugeradministration, MFA-indstillinger, adgangsgennemgange og beslutningen om, hvilke data der lægges ind. Til sidst opdaterer han risikoregistret med to nye risici - nedbrud hos udbyderen og fejlkonfigurerede brugerrettigheder - og foreslår en exitklausul og en årlig leverandørgennemgang.

## Typiske misforståelser

- **"Skyen er bare en andens computer."** Delvist rigtigt, men skyen tilføjer selvbetjening, elasticitet og målt forbrug - og dermed nye risici; alle med en konto kan oprette ressourcer på få minutter.
- **"Udbyderen tager sig af sikkerheden."** Udbyderen sikrer selve skyen; du har stadig ansvaret for det, du lægger i den, og hvordan du konfigurerer den.
- **"Eget serverrum er automatisk sikrere."** Store udbydere har ofte bedre fysisk sikkerhed og patching end et lille serverrum. Det egentlige spørgsmål er, hvilke risici man bytter, og om man styrer de nye.
- **"Data i skyen er uden for GDPR's rækkevidde."** GDPR følger data. Placering, underdatabehandlere og overførsler skal alt sammen dokumenteres.
- **"Det sparer automatisk penge at flytte til skyen."** Betaling efter forbrug kan blive dyrt uden omkostningsstyring og oprydning i ubrugte ressourcer.
