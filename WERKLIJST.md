# Werkafspraken

Taken staan in [GitHub Issues](https://github.com/SamSlaats/SamSlaats.github.io/issues), per fase in een milestone.
Sluit een issue vanuit een commit met `Closes #<nummer>` in het commitbericht.

Deze repo is openbaar: geen wachtwoorden, geheimen of persoonsgegevens in issues of in dit bestand.

## Afspraken

- Sam commit en pusht zelf. Claude beheert de issues en pusht geen code.
- Uitzondering: Claude mag de projectdocumentatie zelf committen en pushen: bouwlogs
  (`bouwlog-*.md`), `beslissingen.md` en `storingen.md`. Voorwaarden:
  - Alleen op basis van keuzes die Sam heeft gemaakt en uitvoer die Sam heeft laten zien.
    Claude verzint geen resultaten en vult geen bewijs aan dat er niet is.
  - Wat niet vastgesteld is, staat er ook zo in ("oorzaak niet vastgesteld").
  - Sam leest de wijziging na de push na, en moet de inhoud zelf kunnen uitleggen.
  - Alle andere bestanden (`lab.ts`, componenten, config) blijven bij Sam.
- Stageproject: bedrijf anoniem, medestudent niet bij naam, geen tenant-ID's of adressen.
- Configs zonder wachtwoorden of `secret`-regels publiceren.
- Een machine is pas `gebouwd: true` als hij zijn rol vervult en dat getest is.
- In VMware altijd op MAC-adres controleren welke netwerkkaart waar hangt.
