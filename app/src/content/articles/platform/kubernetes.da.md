---
title: Kubernetes — hvordan container-orkestrering virker, og hvor risiciene ligger
term: platform/kubernetes
lang: da
---

## Hvad er det?

**Kubernetes** (ofte forkortet **K8s** efter de otte bogstaver mellem K og s) er et open source-system til at køre **containere** på tværs af en gruppe maskiner. Det er den mest udbredte implementering af **container-orkestrering**: at bestemme, hvor hver container kører, genstarte den, når den fejler, fordele belastningen, rulle nye versioner ud og forbinde delene via netværket.

Kubernetes udsprang af Googles erfaringer med Borg, et internt system, der siden midten af 2000'erne havde kørt Googles tjenester på enorme klynger af maskiner. Googles ingeniører lancerede Kubernetes som open source-projekt i juni 2014, året efter at Docker havde gjort containere populære blandt udviklere. Version 1.0 udkom i juli 2015, og samtidig donerede Google projektet til den nystiftede Cloud Native Computing Foundation (CNCF) under Linux Foundation, hvor det stadig udvikles af et stort fællesskab. Inden for få år havde det slået de konkurrerende orkestreringsværktøjer, og i dag tilbyder alle store cloududbydere Kubernetes som administreret tjeneste. Navnet er græsk for "rorsmand" – den, der styrer skibet fyldt med containere.

## Hvordan virker det?

### Ønsket tilstand og styringsløkken

Den centrale idé er **deklarativ konfiguration**. I stedet for at give trinvise kommandoer ("start en container på server 3") beskriver man i en fil den tilstand, man ønsker – "tre kopier af webshoppen, version 2.4, tilgængelig på port 443" – og sender den til klyngen. Kubernetes' **kontrolplan** arbejder derefter hele tiden på at få virkeligheden til at passe: Dør en kopi, starter den en ny; ændrer man versionen, udskifter den kopierne gradvist. Denne konstante sammenligning af ønsket og faktisk tilstand kaldes en **styringsløkke** – som en termostat, der bliver ved med at justere, til rummet har den indstillede temperatur.

### De vigtigste dele

| Del                | Rolle                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| Klynge (cluster)   | Hele samlingen af maskiner, der styres sammen                                                          |
| Kontrolplan        | "Hjernen": API-serveren, planlæggeren, controllerne og databasen etcd, der rummer al tilstand          |
| Node               | En arbejdsmaskine (virtuel eller fysisk), der kører arbejdsopgaver                                     |
| Pod                | Den mindste enhed, Kubernetes placerer og kører: én eller flere containere, der deler netværk og lager |
| Deployment         | Beskriver, hvor mange kopier af en pod der skal køre, og hvordan de opdateres                          |
| Service            | En stabil netværksadresse foran en skiftende gruppe pods                                               |
| Namespace          | En logisk opdeling af klyngen, ofte per team eller applikation                                         |
| Secret / ConfigMap | Objekter til at give pods konfiguration og hemmeligheder                                               |

Alle ændringer går gennem **API-serveren**. Mennesker bruger værktøjet `kubectl` eller en pipeline; controllerne i klyngen bruger det samme API. Det gør API-serveren til det allervigtigste at beskytte.

### Byggesten til sikkerhed

Kubernetes har et bredt udvalg af sikkerhedsfunktioner, men mange af dem er valgfrie eller lempeligt konfigureret som standard:

- **Rollebaseret adgangsstyring (RBAC)** afgør, hvem og hvad der må læse eller ændre hvilke objekter. For brede roller – "cluster-admin til alle" – er almindelige.
- **Netværkspolitikker** begrænser, hvilke pods der må tale med hinanden. Uden dem kan hver pod typisk nå alle andre pods.
- **Pod security standards**, der håndhæves per namespace via admission control, forhindrer containere i at køre som root, montere værtens filsystem eller få ekstra privilegier.
- **Secrets** er som standard kun base64-kodet, ikke krypteret; kryptering af lagrede data og en ekstern løsning til **håndtering af hemmeligheder** er separate valg.
- **Auditlogs** registrerer kald til API'et, men skal slås til og indsamles.

NIST SP 800-190, vejledningen om sikkerhed i container-applikationer, beskriver de vigtigste risikoområder: images, registre, selve orkestreringsværktøjet, containerne og værtens styresystem.

## Hvad betyder det for en organisation og en koordinator?

De fleste GRC-folk kommer aldrig til at skrive en Kubernetes-fil, men de møder Kubernetes i risikovurderinger, leverandørgennemgange og audits. De nyttige spørgsmål handler om ejerskab og konfiguration:

- **Hvem driver kontrolplanet?** Ved en administreret tjeneste fra en cloududbyder driver udbyderen kontrolplanet, mens kunden driver arbejdsopgaverne og de fleste indstillinger – **modellen for delt ansvar** anvendt på Kubernetes.
- **Hvem har administratorrettigheder, og hvordan gennemgås de?** RBAC bør følge princippet om mindste privilegium, og adgang til produktionsklynger bør logges og gennemgås som al anden privilegeret adgang.
- **Ligger konfigurationen i versionsstyring?** Fordi Kubernetes er deklarativt, kan den ønskede tilstand ligge i et repository (**GitOps**), hvilket giver ændringshistorik og review gratis.
- **Hvor kommer images fra?** Kubernetes kører de container-images, det får, og det gør det til en del af **softwareforsyningskæden**.

### Et eksempel fra praksis

Oliver er GRC-studerende hos en dansk netbutik. Driftsteamet kører webshoppen på en administreret Kubernetes-tjeneste og har bedt om tre kopier af den; da en maskine døde en nat, genstartede Kubernetes den tabte kopi på en anden maskine, før nogen var vågnet – eksemplet fra begrebets definition. Ledelsen er glad for oppetiden, og Olivers opgave er at tjekke sikkerhedssiden før den kommende ISO 27001-audit.

Med en kort tjekliste baseret på NIST SP 800-190 stiller han teamet fem spørgsmål og får disse svar: Alle udviklere har cluster-admin i produktion; der er ingen netværkspolitikker; secrets ligger ukrypteret i klyngen; auditlogning er slået fra; konfigurationen ligger i Git med review via pull requests. Han noterer én styrke (ændringsstyring via Git) og fire fund og vurderer dem sammen med teamet. De aftaler en plan: læseadgang for udviklere i produktion med en godkendt nødprocedure, netværkspolitikker, der som udgangspunkt afviser al trafik (først for betalingstjenesten), kryptering af lagrede secrets og auditlogs sendt til virksomhedens SIEM. Hvert punkt får en ejer og en dato, og audit-sporet viser, at risiciene blev identificeret og håndteret.

## Typiske misforståelser

- **"Kubernetes er sikkert som standard."** Det har gode sikkerhedsfunktioner, men mange er slået fra eller er lempelige fra start. Sikkerheden afhænger af konfigurationen.
- **"Containere er adskilt som virtuelle maskiner."** Containere deler værtens kerne. Adskillelsen er svagere, og derfor betyder pod-sikkerhedsindstillingerne noget.
- **"Kubernetes Secrets er krypteret."** I standard-Kubernetes er de som udgangspunkt kun kodet. Kryptering af lagrede data skal slås til (nogle administrerede tjenester gør det nu som standard), og adgangen til secrets skal begrænses.
- **"En administreret tjeneste betyder, at udbyderen tager sig af sikkerheden."** Udbyderen sikrer kontrolplanet; arbejdsopgaver, RBAC, netværkspolitikker og images er kundens.
- **"Vi skal have Kubernetes for at være moderne."** Det løser reelle problemer, men tilføjer kompleksitet. Til nogle få enkle applikationer kan et PaaS-tilbud give de samme fordele med langt mindre at sikre.
