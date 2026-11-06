# SplitnDutch

**Split bills. Pay by UPI. Stay friends.**

Free, open-source expense splitting built for India: flatmates, trips, hostels, couples, office chai rounds, weddings. No ads, no daily limits, no premium tier.

## What's in it

| | |
|---|---|
| **UPI settle-up** | “You owe Rohan ₹1,250” → *Pay with any UPI app* opens GPay, PhonePe or Paytm with the amount filled in. A QR code covers laptops. Then one tap records the payment. |
| **Friends without accounts** | Add people by email (they get an invite with their balance waiting) or just by name. Add their email later; if they already have an account, the two are merged. |
| **WhatsApp-first** | A group invite link to drop in the chat. One-tap WhatsApp payment nudges, plus email reminders (rate-limited, once a day). |
| **Trip mode** | 32 destinations (Sikkim, Spiti, Meghalaya, Ziro, Hampi, Goa, Ladakh, Bhutan, Bali…), each with a themed group, local currency, trip countdown, budget tracker, fact of the day, lesser-known places nearby, tips and a packing checklist. Public guides live at `/explore`. |
| **Smart entry** | Calculator amounts (`450+320+90`, `2400/3`) and a category guessed from the description (“Swiggy” → food, “Ola” → transport). |
| **India-native** | ₹1,23,456 lakh grouping, IST dates, and Indian categories (Chai & snacks, Maid & cook, Rent & PG, Wi-Fi & recharge, Fuel & tolls…). INR default, plus 22 currencies for travel. |
| **Every split** | Equal, exact, percent, shares; multiple payers; simplify debts per group; repeating rent and bills; comments; CSV export. |
| **Accounts done properly** | Email confirmation, password reset, invite links, log out everywhere, JSON data export, account deletion (DPDP Act-style erasure), email-notification preferences. |
| **Launch basics** | Privacy policy, terms, about page, PWA manifest (add to home screen), sitemap and robots, security headers, rate limiting, dark mode, mobile layout. |

## Run it

Requires Node.js 20+.

```bash
npm install
cp .env.example .env.local   # optional for local dev
npm run dev                  # http://localhost:3000
```

With `DEMO_MODE` on (the default in dev), an empty database gets a demo household. Log in as `ananya@splitndutch.app` / `demo1234`, or click **Try the demo**.

Production:

```bash
npm run build
DEMO_MODE=0 APP_URL=https://your.domain npm start
```

To put a machine at home on the internet, a tunnel such as Cloudflare Tunnel works well (`cloudflared tunnel --url http://localhost:3000`). Set `APP_URL` to the public address so emails and invite links point to it.

## Email (Resend)

1. Create a free account at [resend.com](https://resend.com) and verify your domain.
2. Set `RESEND_API_KEY`, `EMAIL_FROM` (an address on that domain) and `CONTACT_EMAIL` in `.env.local`.

Without a key, every email (invites, resets, reminders) is printed to the server log, so you can test flows locally.

## Data and the ledger mirror

- Live data: one SQLite file, `data/splitndutch.db` (change it with `DATA_DIR`). Schema changes migrate automatically on start; existing data is kept.
- CSV mirror: one sheet per table in `data/ledger-sheets/`, with amounts in paise/cents. Sessions and one-time tokens are never exported.

```bash
npm run ledger -- export     # write the CSVs
npm run ledger -- push       # write, then git commit + push inside LEDGER_DIR
npm run ledger -- restore    # load CSVs into an empty database
```

For automatic backups to a **private** repo, clone it into `LEDGER_DIR` (for example `git clone git@github.com:you/splitndutch-ledger.git data/ledger-sheets`), then set `LEDGER_AUTOSYNC=1` and `LEDGER_GIT_PUSH=1`. The CSVs include password hashes so accounts can be restored, which is why that repo must stay private.

## Tests

```bash
npm test          # balance maths, money/UPI/CSV helpers, plus an end-to-end run on a throwaway DB
npm run typecheck
```

## Project layout

```
app/              pages (App Router): public site, auth flows, (app)/ logged-in area, api/ exports
components/       UI (forms, PayPanel, Share, shells)
lib/
  balances.ts     who-owes-whom and debt simplification
  mutations.ts    all writes: accounts, invites, guests, groups, expenses, reminders
  queries.ts      all reads
  destinations.ts trip guides (add places here)
  ledger.ts       CSV mirror, restore and git push
  email.ts        Resend + dev log fallback
scripts/          tests and the ledger CLI
```

## Contributing

Issues and pull requests are welcome, especially new destinations in `lib/destinations.ts`. Keep facts verifiable, and phrase permits, fees and visa rules as “check before you go”.

## License

MIT
