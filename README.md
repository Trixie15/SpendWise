# SpendWise 💸
**Expense Tracker System — MERN Stack (MongoDB, Express, React, Node.js)**

## Project Structure
```
spendwise/
├── server/                 ← Phase 1 (done): Express + MongoDB API
│   ├── config/db.js        MongoDB connection
│   ├── models/             User, Category, Transaction, Budget
│   ├── middleware/         auth (JWT), validation, error handling
│   ├── controllers/        business logic
│   ├── routes/             API endpoints + input validation
│   ├── utils/              helpers (token, dates, default categories)
│   └── server.js           app entry point
└── client/                 ← Phase 2 (done): React + Vite + Tailwind frontend
    ├── index.html
    ├── vite.config.js      proxies /api to the backend
    └── src/
        ├── api/axios.js    API client (adds token automatically)
        ├── context/        AuthContext (login state)
        ├── components/     Layout, Modal, TransactionForm, etc.
        ├── pages/          Login, Register, Dashboard, Transactions,
        │                   Budgets, Categories, Settings, NotFound
        ├── utils/format.js money and date helpers
        └── index.css       Tailwind + SpendWise colors and fonts
```

## Running the whole app
You need **two terminals**, one for each part.

**Terminal 1 (backend):**
```bash
cd server
npm run dev
```

**Terminal 2 (frontend):**
```bash
cd client
npm install        # first time only
npm run dev
```
Open **http://localhost:5173** and log in or create an account.
The backend must be running, or the frontend will say it can't reach the server.

## Setup (Backend)
**Requirements:** Node.js 18+ and MongoDB (local install or a free MongoDB Atlas cluster)

```bash
cd server
npm install
cp .env.example .env        # Windows: copy .env.example .env
```
Edit `.env`:
- `MONGO_URI` → your local MongoDB or Atlas connection string
- `JWT_SECRET` → at least 32 random characters:
  `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- `ENCRYPTION_KEY` → exactly 64 hex characters (encrypts MFA secrets):
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

The server won't start if these are missing or too weak, and it will tell you which one to fix.

### Email codes for two-factor login (optional)
To send real emails with Gmail, add these to `server/.env`:
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_USER=your.gmail@gmail.com
EMAIL_PASS=your16characterapppassword
EMAIL_FROM=SpendWise <your.gmail@gmail.com>
```
`EMAIL_PASS` must be a Gmail **App Password** (Google Account → Security → 2-Step Verification → App passwords), not your normal password.
If these are left empty during development, codes are printed in the server terminal instead.

### Creating an admin
Register normally in the app, then run:
```bash
cd server
npm run make-admin -- your@email.com
```
Log in again and the **Admin** page appears.

```bash
npm run dev
```
You should see `MongoDB connected` and `SpendWise API running on port 5000`.
Test it: open http://localhost:5000/api/health

## Security
See **SECURITY.md** for how SpendWise meets each security criterion (input validation, MFA, role-based access, error handling, data protection, privacy, and session security).

## Features in Phase 1
- Register / login with JWT, hashed passwords (bcrypt)
- 12 default categories created automatically for each new user
- Custom categories (with icon and color)
- Income & expense CRUD with category, date, note, and payment method
- Filter by type, category, date range; search notes; sort; pagination
- Monthly budgets per category with spent / remaining / % used / status (ok, warning, over)
- Dashboard: balance, totals, this month's totals, recent transactions
- Chart data: spending by category (pie), monthly income vs expense trend (bar/line)

## API Reference
All routes except register/login need the header: `Authorization: Bearer <token>`

### Auth
| Method | Endpoint | Body |
|---|---|---|
| POST | /api/auth/register | name, email, password |
| POST | /api/auth/login | email, password |
| GET | /api/auth/me | — |
| PUT | /api/auth/me | name?, currency? |
| PUT | /api/auth/password | currentPassword, newPassword |

### Categories
| Method | Endpoint | Notes |
|---|---|---|
| GET | /api/categories?type=expense | type optional |
| POST | /api/categories | name, type, icon?, color? |
| PUT | /api/categories/:id | name?, icon?, color? |
| DELETE | /api/categories/:id | blocked if transactions use it |

### Transactions
| Method | Endpoint | Notes |
|---|---|---|
| GET | /api/transactions | query: type, category, startDate, endDate, search, page, limit, sort (date, -date, amount, -amount) |
| GET | /api/transactions/:id | |
| POST | /api/transactions | type, amount, category, date?, note?, paymentMethod? (cash, card, e-wallet, bank, other) |
| PUT | /api/transactions/:id | any of the above |
| DELETE | /api/transactions/:id | |

### Budgets
| Method | Endpoint | Notes |
|---|---|---|
| GET | /api/budgets?month=2026-09 | defaults to current month |
| POST | /api/budgets | category, limit, month? — creates or updates |
| PUT | /api/budgets/:id | limit |
| DELETE | /api/budgets/:id | |

### Dashboard
| Method | Endpoint | Notes |
|---|---|---|
| GET | /api/dashboard/summary | balance, totals, recent 5 |
| GET | /api/dashboard/by-category?type=expense&month=2026-09 | pie chart data |
| GET | /api/dashboard/monthly-trend?months=6 | bar/line chart data |

## Quick Test (Postman or Thunder Client)
1. `POST /api/auth/register` with `{ "name": "Juan", "email": "juan@test.com", "password": "123456" }` → copy the `token`
2. `GET /api/categories?type=expense` (with Bearer token) → copy a category `_id`
3. `POST /api/transactions` with `{ "type": "expense", "amount": 150, "category": "<id>", "date": "2026-09-24", "note": "Lunch" }`
4. `POST /api/budgets` with `{ "category": "<id>", "limit": 3000 }`
5. `GET /api/dashboard/summary` and `GET /api/budgets` to see it all come together

## Notes
- Dates are stored and grouped in UTC. The frontend should send dates as `YYYY-MM-DD`.
- Error responses always look like `{ "message": "..." }` so the frontend can show them directly.
