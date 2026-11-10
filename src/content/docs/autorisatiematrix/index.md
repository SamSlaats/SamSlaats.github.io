---
title: Autorisatiematrix
description: Eigen webapp die een autorisatiematrix (functie × recht) beheert en doorvoert naar Entra ID en later on-prem AD. Leerproject in C# en .NET, in ontwikkeling.
sidebar:
  label: Overzicht
  order: 1
---

Bij elk bedrijf staat ergens vastgelegd welke functie welke rechten krijgt: een planner
krijgt het planningssysteem en de map van Planning, een chauffeur alleen het
transportsysteem. Dat overzicht heet een autorisatiematrix. In de praktijk is het vaak een
Excel-bestand, en in de praktijk lopen het bestand en de werkelijke rechten uit elkaar.

Ik bouw een webapp die de matrix bijhoudt als **gewenste toestand**, die vergelijkt met wat
er echt in Entra ID staat, de verschillen laat zien en ze pas na goedkeuring doorvoert. Een
leerproject: ik wil C# en .NET beter leren, en het beheer van identiteit en rechten van de
kant van de code begrijpen.

| | |
|---|---|
| **Status** | In ontwikkeling: fase M0 (fundament) bijna af |
| **Platform** | ASP.NET Core met Blazor Server, .NET 10, in WSL2 |
| **Koppelingen** | Microsoft Entra ID via Microsoft Graph; later on-prem Active Directory in het lab |
| **Herkomst** | Eigen leerproject |

## Hoe het werkt

| Begrip | In de app |
|---|---|
| **Recht** | Altijd een beveiligingsgroep. In Entra ID met de naamconventie `AUTH-` |
| **Rol** | Een functie, zoals Planner of Chauffeur. De matrix is rol × recht |
| **Uitzondering** | Een recht dat iemand buiten zijn functie krijgt. Alleen toevoegend, met een reden, een eigenaar en een vervaldatum |
| **Afwijking** | Iemand heeft in Entra een recht dat niet uit zijn rol of een uitzondering volgt |

Het ontwerp: de app voert pas iets door nadat de Matrixbeheerder het overzicht met
verschillen heeft goedgekeurd, en houdt van elke wijziging en elke doorgevoerde actie een
log bij dat niet meer kan worden aangepast.

## Testomgeving

Alles draait tegen een eigen testtenant op Entra ID Free, met hetzelfde fictieve bedrijf
als in [mijn VMware-lab](/verbeek-logistiek/): Verbeek Logistiek. Er staan acht
testgebruikers in, verdeeld over vijf afdelingen, en zes `AUTH-`groepen voor onder meer het
transportsysteem, het magazijnsysteem, de boekhouding en de gedeelde mappen.

Eén chauffeur zit bewust in de groep van de boekhouding. Dat is een afwijking die de app
straks moet vinden: zo weet ik van tevoren wat de uitkomst van de vergelijking hoort te zijn.

## Fasen

| Fase | Inhoud | Stand |
|---|---|---|
| M0 Fundament | Ontwikkelomgeving, opbouw van de code, CI, testtenant, inloggen met app-rol | Bijna af: inloggen in uitvoering |
| M1 Domein en opslag | Het model en de berekening van rechten, test-first; database en auditlog | Gepland |
| M2 Entra lezen | De werkelijke groepsleden ophalen via Microsoft Graph | Gepland |
| M3 Matrix | De matrix bekijken en bewerken, rollen toewijzen | Gepland |
| M4 Vergelijken | Gewenst tegenover werkelijk, met een overzicht van verschillen | Gepland |
| M5 Doorvoeren | Goedgekeurde verschillen doorvoeren in Entra ID | Gepland |
| M6 Uitzonderingen | Uitzonderingen beheren en afwijkingen afhandelen | Gepland |
| M7 Hybride | On-prem AD in het lab, gekoppeld met Cloud Sync | Gepland |

De afwegingen achter de keuzes tot nu toe staan bij [Beslissingen](/autorisatiematrix/beslissingen/).
