# Deployment Guide (GitHub + Vercel + MongoDB Atlas)
## Marriott Hotel Management System (MHMS)

This guide explains how to deploy the MHMS project to Vercel using the GitHub repository already connected to your Vercel project.

## 1. Prerequisites
- GitHub repository containing the project
- Vercel project connected to that repository/branch
- MongoDB Atlas cluster/database (Vercel cannot use local MongoDB)
- Project files updated locally in VS Code (including `api/index.js`, `vercel.json`, and new MHMS code)

## 2. Important Project Files for Vercel
- `api/index.js` - Serverless Express handler with cached MongoDB connection
- `vercel.json` - Routes all requests to `api/index.js`
- `public/` - Frontend dashboard assets served by Express
- `.env.example` - Required environment variables

## 3. Environment Variables (Vercel Project Settings)
Set these in **Vercel → Project → Settings → Environment Variables**:

| Variable | Required | Example / Notes |
|---|---|---|
| `MONGO_URI` | Yes | MongoDB Atlas connection string (e.g. `mongodb+srv://.../marriott_hms`) |
| `JWT_SECRET` | Yes | Long random secret for JWT signing |
| `JWT_EXPIRES_IN` | Recommended | e.g. `7d` |
| `TAX_RATE` | Optional | e.g. `0.10` (10%) |
| `NODE_ENV` | Recommended | `production` |

## 4. Vercel Project Configuration
1. Open your Vercel project connected to the GitHub repo.
2. If the app is inside a subfolder in the repo, set **Root Directory** to `hotel-booking-system`.
3. Framework preset can be left as auto/other (Express serverless handler is used).
4. Ensure Build/Install settings use the project defaults (`npm install`) unless you have custom needs.

## 5. Deploy (Push to GitHub)
From the project folder (or repo root, depending on your setup):

```bash
git add .
git commit -m "Align system with Marriott Hotel Management System plan"
git push
```

If Vercel is connected to the pushed branch, deployment should start automatically.

## 6. Seed Demo Data in Atlas (Recommended for Defense)
The deployed app needs users/data in the **same database** referenced by Vercel's `MONGO_URI`.

1. In local `.env`, temporarily set:
   ```env
   MONGO_URI=<your-atlas-uri-used-by-vercel>
   JWT_SECRET=<any-value>
   ```
2. Run:
   ```bash
   npm run seed
   ```
3. This creates demo users and sample records:
   - `admin@marriott.test` / `Admin@123`
   - `frontdesk@marriott.test` / `Front@123`
   - `housekeeping@marriott.test` / `House@123`

## 7. Post-Deployment Verification
1. Open the Vercel app URL and confirm the MHMS login page loads.
2. Test health endpoint: `https://<your-vercel-domain>/api/health`
3. Log in with seeded admin account.
4. Verify core flows:
   - Dashboard loads summary data
   - Room types/rooms/guests CRUD
   - Reservation create + double-booking prevention
   - Check-in/check-out workflow
   - Billing/payment and housekeeping task updates

## 8. Common Issues and Fixes
| Issue | Likely Cause | Fix |
|---|---|---|
| `500` or DB errors from API | Wrong/missing `MONGO_URI`, Atlas IP/network restrictions | Set correct Atlas URI in Vercel, allow network access, redeploy |
| Login fails due to auth config | Missing `JWT_SECRET` in Vercel | Add `JWT_SECRET` and redeploy |
| Login fails with invalid credentials on fresh deploy | Seed not run against Atlas DB | Run `npm run seed` using Atlas `MONGO_URI` |
| Vercel deploy succeeds but app routes fail | Wrong root directory | Set Vercel Root Directory to `hotel-booking-system` |
| Frontend loads but API unauthorized | Token expired/missing | Log in again; verify API base is same origin (`/api`) |
| Old data shape conflicts/errors | Existing collections from previous schema version | Use a new database name (e.g. `marriott_hms`) and seed fresh data |

## 9. Defense/Submission Checklist
- GitHub repo updated with latest MHMS code and docs
- Vercel deployment URL working
- Atlas DB seeded with demo accounts and sample data
- Environment variables configured in Vercel
- README and `docs/` aligned with Marriott Hotel Management System plan
