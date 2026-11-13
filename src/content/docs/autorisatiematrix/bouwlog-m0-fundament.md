---
title: 'Bouwlog M0: fundament'
description: Ontwikkelomgeving, opbouw van de code, CI, testtenant en inloggen met een app-rol.
sidebar:
  order: 5.0
---

## Doel

Een fundament waarop de rest van de app kan worden gebouwd: een ontwikkelomgeving waarin
ik lokaal kan bouwen en testen, een opbouw van de code die de rechtenlogica los houdt van
Entra ID, een pipeline die elke wijziging controleert, een eigen testtenant, en een app
waar alleen de Matrixbeheerder in komt.

:::note[Stand van zaken]
M0 is af. De app draait lokaal in WSL2, CI bouwt en test elke pull request, de
testtenant staat klaar met testgebruikers en `AUTH-`groepen, en de app laat alleen
gebruikers met de app-rol Matrixbeheerder binnen. Er is nog geen eigen logica: die komt
in M1. M0 is gebouwd in vijf issues, elk op een eigen branch met een pull request.
:::

## Wat ik gebouwd heb

**Ontwikkelomgeving**

Op mijn Windows-pc staat Smart App Control aan, en dat blokkeert test-DLL's die ik zelf
bouw. Daarom werk ik in WSL2 met Ubuntu: Linux-programma's vallen er niet onder.

- .NET SDK 10.0.114 uit de pakketbron van Ubuntu, in WSL2 en niet in Windows
- VS Code met de WSL-extensie; de repo staat in mijn Linux-home (`~/repos/`), niet op een
  Windows-schijf
- Git en de GitHub CLI ingesteld binnen WSL2

**Opbouw van de code**

Vijf projecten in één solution (`Autorisatiematrix.slnx`). De afhankelijkheden lopen één
kant op, naar Domain toe:

| Project | Verwijst naar |
|---|---|
| Domain | niets |
| Application | Domain |
| Infrastructure | Application |
| Web | Application, Infrastructure |
| Tests | Domain, Application |

Infrastructure wijst naar Application en niet andersom: Application beschrijft wat de app
nodig heeft, Infrastructure levert het. Zo kent de rechtenlogica Microsoft Graph niet.

Gedeelde instellingen staan in `Directory.Build.props`: `net10.0`, nullable aan, implicit
usings aan, en waarschuwingen zijn fouten.

**CI**

Een workflow in GitHub Actions die bij elke pull request en elke push naar `main` op een
verse Ubuntu-machine draait:

1. Code ophalen (`actions/checkout@v7`)
2. .NET installeren volgens `global.json` (`actions/setup-dotnet@v6`)
3. `dotnet restore`
4. `dotnet build --no-restore`
5. `dotnet test --no-build`

Tests schrijf ik met xUnit v3 en Shouldly. Voor nu is er één dummytest, om te laten zien
dat de opzet werkt. In `global.json` staat de SDK vast op de 10.0.1xx-band, zodat CI met
dezelfde SDK bouwt als ik lokaal.

**Testtenant**

De tenant die al bij mijn Microsoft-account hoorde, op Entra ID Free, hernoemd naar
Verbeek Logistiek: hetzelfde fictieve bedrijf als in [mijn VMware-lab](/verbeek-logistiek/).

- Een apart beheeraccount met Global Administrator en MFA; mijn privé-account blijft
  alleen als noodaccount
- Acht testgebruikers in vijf afdelingen, met afdeling en functie als eigenschap op de
  gebruiker
- Zes beveiligingsgroepen met de naamconventie `AUTH-`, niet rol-toewijsbaar
- Eén chauffeur zit bewust in `AUTH-Boekhouding`: een afwijking die de vergelijking in M4
  moet vinden
- Een app-registratie met de application permissions `GroupMember.ReadWrite.All` en
  `User.Read.All`, met admin consent

De gegevens waarmee de app zich aanmeldt (tenant-ID, client-ID en een client secret) staan
in `dotnet user-secrets`, buiten de repo.

**Inloggen met een app-rol**

- `Microsoft.Identity.Web` voor het inloggen met OpenID Connect, met de authorization code
  flow (`ResponseType: code`)
- Een app-rol `Matrixbeheerder` op de app-registratie, toegewezen aan een testgebruiker op
  ICT **zonder** beheerdersrol in Entra
- Een policy `Matrixbeheerder` die de rol eist, ingesteld als fallback: hij geldt voor elke
  pagina zonder eigen regel
- Een pagina `/geen-toegang` voor wie wel is ingelogd maar de rol niet heeft. Die pagina
  heeft `[AllowAnonymous]`, anders valt hij zelf onder de fallback en ontstaat een
  oneindige lus

## Bewijs

| Wat | Hoe aangetoond |
|---|---|
| Lokaal bouwen en testen | `dotnet build`: alle vijf de projecten in de volgorde Domain → Application → Infrastructure → Tests/Web. `dotnet test` in WSL2: 1 geslaagd |
| CI vangt een falende test | Verwachte uitkomst bewust op 31 gezet. Lokaal: `uitkomst should be 31 but was 30`, exitcode 2. In CI faalde alleen de stap Testen, met `Process completed with exit code 2`. Teruggedraaid met `git revert` |
| CI bouwt met dezelfde SDK | Na de aanpassing van `global.json` toonde de log van CI dezelfde SDK als lokaal: 10.0.114 |
| Geen geheimen in Git | `git log -p --all` doorzocht op het secret, via een variabele zodat het niet in beeld kwam: 0 treffers, vóór het pushen |
| Zonder inloggen geen pagina | Nieuw privévenster op `https://localhost:7022`: direct doorgestuurd naar de inlogpagina van Microsoft |
| Met de rol | De testgebruiker met de app-rol komt op de startpagina, met "Ingelogd als …" |
| Zonder de rol | Een testgebruiker zonder de rol komt op Geen toegang, met opmaak |

In de claims van de ingelogde gebruiker staat de rol onder het type
`http://schemas.microsoft.com/ws/2008/06/identity/claims/role`. In het token van Entra
heet die claim `roles`; ASP.NET Core zet hem bij het inlezen om naar die lange naam, en
daar kijkt `RequireRole` naar.

## Wat niet in één keer werkte

**Templates zonder naam en map.** De eerste keer maakte ik de projecten zonder `-n` en
`-o`, waardoor alles in de hoofdmap als `autorisatiematrix.csproj` terechtkwam. Bij het
derde project gebruikte ik `--force`, terwijl de melding vooraf zei welk bestand
overschreven zou worden. Opgeruimd met `git clean`, eerst als proefrun. Daarna nog een
webproject als gewone bibliotheek, en een testproject in `obj/`, een map die in
`.gitignore` staat. Dat laatste zou nooit in Git zijn gekomen.

**Een template met een andere .NET-versie.** Het xUnit-template koos `net8.0`, waardoor
het testproject niet naar de andere projecten kon verwijzen. Opgelost door de versie in
`Directory.Build.props` te zetten. Een template schrijft wel altijd een eigen versie in een
nieuw projectbestand, en die wint van `Directory.Build.props`: bij een nieuw project moet
die regel weg.

**Hoofdletters in Linux.** `Directory.Build.Props` met een hoofdletter P werd niet
gevonden. Op Windows had het gewerkt.

**YAML-inspringing.** In de workflow stonden `name`, `pull_request` en `jobs` eerst op het
verkeerde niveau. In YAML bepaalt de inspringing waar iets bij hoort.

**Een push die werd geweigerd.** Het token van de GitHub CLI mocht geen workflows aanmaken.
Daarvoor is een apart recht nodig (`workflow`), omdat een workflow code draait met
toegang tot de geheimen van de repo.

**CI met een andere SDK.** Met `rollForward: latestFeature` gebruikte CI SDK 10.0.403,
terwijl ik lokaal 10.0.114 heb. Een andere feature band kan andere waarschuwingen geven, en
omdat waarschuwingen fouten zijn, kan CI dan rood worden terwijl het lokaal groen is.
Gevonden door de log van een groene run te lezen. Aangepast naar `latestPatch`.

**De verkeerde waarde als secret.** In user-secrets had ik de Secret ID opgeslagen in plaats
van het secret zelf. Gevonden bij het hernoemen van de instellingen, met een controle op de
lengte van de waarden: het secret was 36 tekens, de lengte van een GUID. Hersteld met een
nieuw secret; het oude is verwijderd. Bij het eerste opslaan kwam de waarde ook in mijn
shellgeschiedenis, doordat ik hem direct achter `read -rs` had geplakt in plaats van na
Enter. Dat vond ik met een controle op de geschiedenis, en heb ik opgeruimd; de controle
gaf daarna 0. Omdat er toen de Secret ID werd gebruikt, is er waarschijnlijk ook daar geen
echt geheim uitgelekt.

**Twee foutcodes bij het eerste inloggen.**

| Foutcode | Oorzaak | Oplossing |
|---|---|---|
| AADSTS700054 | `Microsoft.Identity.Web` vraagt standaard om een id_token, en dat stond terecht uit in de app-registratie | `ResponseType: code` in de configuratie, in plaats van de oudere flow aan te zetten |
| AADSTS50011 | De app draaide door een tikfout op het http-profiel, en gaf `http://localhost:5026` op als redirect URI | De app met het https-profiel starten; het http-adres niet aan de portal toevoegen |

**Een groene pipeline met een kapotte startpagina.** Bij het aanpassen van de startpagina
viel twee keer de regel `@page "/"` weg, waardoor de startpagina Not Found gaf. De tweede
keer stond het al in de pull request en was CI groen. CI bouwt en test, maar er is nog geen
test die controleert of de startpagina bestaat. Gevonden bij het nalezen van de pull
request, en daarna gecontroleerd door de app zelf te starten, voordat ik mergede.
