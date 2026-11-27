# AI akcelerátor

Osobní ranní aplikace pro práci a učení s AI. Běží jako Claude Artifact: https://claude.ai/artifact/788QXdgtE75gkvDaXc7aYE

- **Dnes:** oblouk tří ranních kroků, brief novinek z AI, výzva týdne
- **Učit se:** lektor, kontrolní otázky, zápisník
- **Trasa:** 29 témat v šesti etapách s opakováním po dni, týdnu a měsíci
- **Knihovna:** videa a kurzy na později
- **Systémy:** deník vlastních skillů, automatizací a appek

## Technologie

Vite, React, TypeScript a Tailwind, stejně jako [Elektroměr](https://github.com/tobiaslicek/elektromer).

```bash
npm install
```

```bash
npm run build
```

Sestavení zkontroluje typy a vytvoří `dist/artifact.html` a `dist/assets/app.js` a `app.css`. Tyhle tři soubory se publikují jako artifact.

## Struktura

- `src/lib/store.ts`: data z databáze artifactu, lektor, opakování a všechny akce
- `src/lib/topics.ts`: témata trasy
- `src/views/`: pět obrazovek
- `src/components/`: oblouk, rozsvěcený text, otázky
- `src/index.css`: vzhled (směr Záře)

Data (brief, postup, knihovna, systémy) nejsou v repozitáři, drží je databáze artifactu. Lektor, čtení nahlas a diktování fungují jen při otevření v Claude.
