---
title: CIS-kontrollerne — en prioriteret liste over, hvad man skal gøre først
term: security/cis-controls
lang: da
---

## Hvad er CIS-kontrollerne, og hvem er de til?

CIS Critical Security Controls er et gratis, offentligt tilgængeligt sæt sikkerhedsforanstaltninger, som udgives af Center for Internet Security, en amerikansk nonprofitorganisation. De begyndte i 2008 som "SANS Top 20" – en liste over de forsvarstiltag, der rent faktisk stoppede virkelige angreb – og vedligeholdes af et fællesskab af praktikere. Version 8 fra 2021 samlede listen i **18 kontroller** med i alt **153 safeguards** (delkontroller). Version 8.1 fra 2024 strammede formuleringerne op og tilføjede et styringsperspektiv, så kontrollerne flugter med NIST CSF 2.0, men grundstrukturen er den samme.

Det, der adskiller CIS-kontrollerne fra ISO 27001 og NIS2, er, at de er **konkrete og prioriterede**. De beder dig ikke om at opbygge et ledelsessystem eller selv finde frem til dine tiltag; de fortæller dig i en ret bestemt rækkefølge, hvilke tekniske og organisatoriske tiltag der giver mest beskyttelse for indsatsen. Derfor er de populære hos små og mellemstore virksomheder og i IT-driftsafdelinger, der gerne vil have en håndgribelig opgaveliste.

CIS-kontrollerne er frivillige. Man kan ikke certificeres efter dem, og ingen EU-lov nævner dem – men de bruges ofte til at vise, at der er "passende" sikkerhed på et niveau, der svarer til det aktuelle tekniske stade.

## Indholdet

### De 18 kontroller

| #   | Kontrol                                               | Kort fortalt                                                  |
| --- | ----------------------------------------------------- | ------------------------------------------------------------- |
| 1   | Fortegnelse over og kontrol med virksomhedens aktiver | Kend alle enheder på netværket                                |
| 2   | Fortegnelse over og kontrol med software              | Vid, hvilken software der kører, og bloker det, der ikke skal |
| 3   | Databeskyttelse                                       | Klassificér, håndtér, opbevar og slet data sikkert            |
| 4   | Sikker konfiguration af aktiver og software           | Skærp standardindstillingerne                                 |
| 5   | Kontohåndtering                                       | Hav styr på alle konti, og luk dem, der ikke bruges           |
| 6   | Adgangsstyring                                        | Giv mindst mulige rettigheder, og brug MFA                    |
| 7   | Løbende sårbarhedsstyring                             | Find og luk svagheder, og patch til tiden                     |
| 8   | Håndtering af logs                                    | Indsaml og gennemgå logs                                      |
| 9   | Beskyttelse af e-mail og browser                      | Begræns phishing og skadeligt webindhold                      |
| 10  | Forsvar mod malware                                   | Forebyg og opdag skadelig software                            |
| 11  | Genopretning af data                                  | Tag backup, og test, at den kan genskabes                     |
| 12  | Styring af netværksinfrastruktur                      | Hold netværksudstyr sikkert og opdateret                      |
| 13  | Netværksovervågning og -forsvar                       | Hold øje med angreb på netværket                              |
| 14  | Awareness og kompetenceudvikling                      | Træn medarbejderne                                            |
| 15  | Styring af tjenesteudbydere                           | Vurdér og følg op på leverandører                             |
| 16  | Sikkerhed i applikationer                             | Udvikl og køb software sikkert                                |
| 17  | Hændelseshåndtering                                   | Vær klar til at opdage, reagere og genoprette                 |
| 18  | Penetrationstest                                      | Test forsvaret, som en angriber ville gøre                    |

Rækkefølgen er bevidst. Man kan ikke beskytte enheder, man ikke ved, man har (kontrol 1 og 2), og man kan ikke styre adgangen til konti, man ikke har overblik over (kontrol 5). De første kontroller er fundamentet, som de senere bygger på.

### Implementeringsgrupper

Hver safeguard er placeret i én eller flere **implementeringsgrupper** (IG). De beskriver ambitionsniveauer – ikke virksomhedsstørrelser:

| Gruppe  | Safeguards (v8) | Typisk organisation                                                                                                                                                           |
| ------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **IG1** | 56              | Lille eller mellemstor virksomhed med begrænset IT-ekspertise, der primært beskytter almindelige forretningsdata. CIS kalder IG1 "essentiel cyberhygiejne" – minimum for alle |
| **IG2** | IG1 + 74 = 130  | Virksomhed med egne IT-medarbejdere, flere afdelinger og nogle følsomme data eller lovkrav                                                                                    |
| **IG3** | IG2 + 23 = 153  | Virksomhed med sikkerhedsspecialister, følsomme data og en reel risiko for målrettede, avancerede angreb                                                                      |

IG1 er det praktiske udgangspunkt: overblik over enheder og software, sikker konfiguration, grundlæggende konto- og adgangsstyring inklusive MFA, opdateringer, beskyttelse mod malware, backup, awareness-træning og en enkel plan for hændelseshåndtering. Nogle kontroller – fx penetrationstest – begynder først i IG2.

## Sammenhængen med de andre rammeværker

- **NIS2**'s artikel 21 kræver "grundlæggende cyberhygiejne" og en række tiltag uden at sige hvordan. IG1 er en udbredt, konkret fortolkning af den hygiejne, og IG2 dækker en stor del af resten af artikel 21 på den tekniske side. Styringsdelen – ledelsens godkendelse, indberetningsfrister, leverandørpolitik – må komme andetsteds fra.
- **ISO 27001** er ledelsessystemet; CIS-kontrollerne kan fungere som den detaljerede tekniske udmøntning af de teknologiske kontroller i Anneks A. CIS udgiver officielle mappinger til ISO 27001, NIST CSF og andre rammeværker.
- **GDPR**'s artikel 32 kræver passende sikkerhed for personoplysninger; her er især kontrol 3, 5, 6 og 11 relevante.
- **D-mærket**s kriterier for IT-sikkerhed overlapper med IG1-emner som opdateringer, backup, adgange og træning, så arbejdet med det ene hjælper det andet.

## Hvad gør koordinatoren i praksis?

Koordinatoren er sjældent den, der konfigurerer firewalls, men spiller en central rolle i at få kontrollerne gennemført:

1. **Vælg den rette implementeringsgruppe** sammen med IT og ledelsen ud fra risikoprofil, data og ressourcer.
2. **Gennemfør en selvevaluering** af de valgte safeguards – CIS stiller gratis værktøjer til rådighed – og notér for hver: gennemført, delvist gennemført eller ikke gennemført.
3. **Prioritér og planlæg**: Luk hullerne i IG1, før I går i gang med IG2, og gør listen til en køreplan med ejere og datoer.
4. **Håndtér barriererne**: gamle systemer, der ikke kan opdateres, mangel på hænder, modstand mod MFA. Det er lige så meget organisatoriske som tekniske problemer.
5. **Rapportér fremdriften** til ledelsen i et klart sprog, fx "vi opfylder nu 48 af 56 safeguards i IG1; resten afhænger af, at det gamle ERP-system bliver udskiftet".
6. **Tag selv ejerskab for de ikke-tekniske kontroller**: awareness-træning (14), opfølgning på leverandører (15) og planen for hændelseshåndtering (17).

## Typiske misforståelser

- **"CIS er kun for små virksomheder."** IG1 passer til de små, men IG2 og IG3 bruges af store og stærkt regulerede organisationer.
- **"CIS erstatter ISO 27001 eller NIS2."** Kontrollerne giver det tekniske indhold, men ikke styringen, risikoprocessen, dokumentationen og indberetningspligterne.
- **"Man skal gennemføre alle 18 kontroller."** Man gennemfører de safeguards, der hører til den valgte gruppe – og alene IG1 er et stort skridt for mange virksomheder.
- **"Kontrollerne er rent tekniske."** Awareness, leverandørstyring og hændelseshåndtering er centrale dele af listen.
- **"Én gang gjort er altid gjort."** Overblik over aktiver, opdateringer og gennemgang af adgange er løbende opgaver, ikke engangsprojekter.
