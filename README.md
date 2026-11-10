# Trade Journal (MERN)

A free-to-host trading journal for traders. React (Vite) website + Express API + MongoDB Atlas.

* Add trades (XAUUSD, XAGUSD, BTC, Ethereum, Solana), see your journal, weekly / monthly / yearly reports
* Pie charts: **Strategy, Time frame, Session, Profit & Loss**, plus P&L by strategy and an equity curve
* Download Excel (everything, or just the report period) and restore from Excel
* Many users, each sees only their own trades. An **admin** can open every account
* Works in a phone browser (bottom tab bar, card layout) and can be installed to the home screen

```
trade-journal-mern/
  server/   Express API  (src/routes, src/models, src/seed.js)
  client/   React website (src/components, src/utils.js, src/excel.js)
```

## What is stored where

| In MongoDB Atlas (only the essentials) | In the browser only (localStorage) |
|---|---|
| Users: username, password hash, role, security question + hashed answer, disabled flag | Notes, mood, "followed my plan", take profit (per trade) |
| Trades: date & time, market, direction, strategy, time frame, session, entry, stop loss, close, exit, position size, RR, P&L | Theme, last used market/strategy/time frame, journal filters, report period |
| | Unsaved form draft, and a saved copy of the trade list (so the app opens fast) |

Reports and charts are calculated in the browser and never stored. The browser-only details do not sync between devices.
They ARE included in the Excel download, and come back when you use "Restore from Excel".

## 1. Run it on your computer

You need **Node.js 18 or newer** (https://nodejs.org).

**a) Free database (MongoDB Atlas)**
1. Create a free account at https://www.mongodb.com/atlas and create a free **M0** cluster.
2. *Database Access*: add a database user (username + password).
3. *Network Access*: add IP address `0.0.0.0/0` (allow from anywhere).
4. *Connect > Drivers*: copy the connection string. Put the database name before the `?`, like
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/tradejournal?retryWrites=true&w=majority`

**b) API**
```
cd server
copy .env.example .env        (Mac/Linux: cp .env.example .env)
```
Open `.env` and fill in `MONGODB_URI`, `JWT_SECRET` (any long random text) and `ADMIN_PASSWORD`. Then:
```
npm install
npm run seed      (optional: creates demo user "demo" / "demo1234" with about 150 sample trades)
npm run dev
```
The first admin account (`ADMIN_USERNAME` / `ADMIN_PASSWORD`) is created automatically.

**c) Website** (a second terminal)
```
cd client
npm install
npm run dev
```
Open http://localhost:5173. To try it on your phone (same Wi-Fi): `npm run dev -- --host`, then open the "Network" address it prints.

## 2. Deploy for free

1. **Database**: the Atlas M0 cluster from step 1 is already online.
2. **API on Render** (https://render.com): New > Web Service > connect your GitHub repo.
   Root directory `server`, build command `npm install`, start command `npm start`, plan **Free**.
   Environment variables: `MONGODB_URI`, `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ALLOW_REGISTER=true`, `CLIENT_URL` (fill in after step 3).
3. **Website on Netlify, Cloudflare Pages or Vercel**: root/base directory `client`, build command `npm run build`,
   output directory `dist`. Add the environment variable `VITE_API_URL` = your Render address (no trailing slash).
4. Go back to Render and set `CLIENT_URL` to your website address, then redeploy.
5. Open the website, log in as admin, and create your friend's account (or let him register). Then set `ALLOW_REGISTER=false`
   on Render if you want to close public sign-up.

**Free server sleeps.** Render's free plan puts the API to sleep after a period without visits, and the first request then takes up to a
minute (the app shows a "waking up" message and opens from its saved copy meanwhile). To keep it awake, add a free monitor
(for example UptimeRobot) that opens `https://YOUR-API/api/health` every 5 minutes.

*Optional:* `server/vercel.json` and `server/api/index.js` let you host the API on Vercel instead (serverless, no sleeping). Untested here.

## 3. Admin

Log in as admin and open the **Admin** tab: list of users with trade counts, **Open** (work inside a user's journal and reports),
**Reset password**, **Disable/Enable**, **Delete** (also deletes their trades), and **Download Excel (all users)**.

## 4. Keep it safe and free for years

* Free plans can change. Download an Excel backup every month (Journal > Download Excel).
* Security here is intentionally simple: a login token stored in the browser, passwords hashed, forgot-password by security question,
  no rate limiting and no two-factor. Do not reuse an important password. Use a long random `JWT_SECRET`.
* Atlas M0 has 512 MB, which is many years of trades for one trader.

## Notes

* All times are Indian Standard Time (UTC+5:30). Sessions: Sydney 03:30-12:30, Tokyo 06:00-15:00, London 12:30-21:30, New York 18:30-03:30.
* P&L auto-calculation: gold 1 lot = 100 oz, silver 1 lot = 5,000 oz, crypto = units. You can always type the broker's figure.
* Admin edits use `?userId=` on the normal `/api/trades` routes (admin only).
