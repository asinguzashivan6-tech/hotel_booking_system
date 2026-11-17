# Deploy to Render for free

This project can run on a **Render Free web service** with a **MongoDB Atlas Free (M0) cluster**. Both tiers are free; Render's free web service sleeps after 15 minutes of inactivity and takes about a minute to wake up.

## 1. Create the free MongoDB Atlas database

1. Sign up or log in at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a project, then click **Create** → **Free** (formerly M0) cluster.
3. Choose any provider/region and create the cluster.
4. Under **Database Access**, click **Add New Database User**:
   - Authentication: **Password**
   - Create a strong password and save it somewhere safe.
   - Database User Privileges: **Read and write to any database** is fine for this demo.
5. Under **Network Access**, click **Add IP Address**:
   - Enter `0.0.0.0/0`
   - Add a comment such as `Render free tier`
   - Confirm. Render's free outbound IPs are not fixed, so all IPs must be allowed.
6. Click **Connect** on the cluster → **Connect your application** → **Node.js**.
7. Copy the connection string. It looks like:

   ```text
   mongodb+srv://USERNAME:PASSWORD@cluster.example.mongodb.net/marriothoteldb?retryWrites=true&w=majority
   ```

   Replace `PASSWORD` with your real password. If the password contains special characters such as `@`, `:`, `/`, or `#`, URL-encode them. Replace `<dbname>` with `marriothoteldb` if necessary.

   > Keep this string private. It contains your database credentials.

## 2. Push the project to GitHub

Render deploys from Git. In this project folder, run:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

Create the empty GitHub repository first, then use its URL in the `git remote add origin` command. `node_modules/` and `.env` are already ignored by Git.

## 3. Deploy on Render

### Option A: Blueprint (recommended)

The included `render.yaml` configures the free web service for you.

1. Go to the [Render Dashboard](https://dashboard.render.com).
2. Click **New** → **Blueprint**.
3. Connect your GitHub account and select the repository you just pushed.
4. Render detects `render.yaml`. Give the blueprint a name.
5. When prompted for `MONGO_URI`, paste the Atlas connection string from step 1.
6. Click **Apply** / **Create Resources** and wait for the build to finish.
7. Open the generated URL, for example `https://marriot-hotel.onrender.com`.

### Option B: Manual web service

If you prefer not to use the blueprint:

1. Click **New** → **Web Service**.
2. Select your GitHub repository.
3. Use these settings:
   - Runtime: **Node**
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Plan: **Free**
4. Add an environment variable:
   - Key: `MONGO_URI`
   - Value: your Atlas connection string
5. Click **Create Web Service**.

## 4. Add sample bookings (optional)

The app works with an empty database; you can add bookings through the web page. To load the eight demo reservations, seed from your own computer before or after deploying:

1. In this project folder, create a `.env` file containing your Atlas URI:

   ```env
   MONGO_URI=mongodb+srv://USERNAME:PASSWORD@cluster.example.mongodb.net/marriothoteldb?retryWrites=true&w=majority
   ```

2. Run:

   ```bash
   npm run seed
   ```

   This **replaces all existing bookings** with the eight demo records. The `.env` file is gitignored, so it will not be committed or deployed.

## 5. Verify

- Your site: `https://marriot-hotel.onrender.com`
- Health check: `https://marriot-hotel.onrender.com/health` should return `{"status":"ok"}`
- API: `https://marriot-hotel.onrender.com/api/bookings` should return a JSON array.

## Free-tier limits to expect

- Render free web services spin down after **15 minutes** with no traffic. The next request wakes the service and can take **about one minute**.
- Render gives each workspace **750 free instance hours/month**, **5 GB outbound bandwidth**, and **500 build minutes/month** on the Hobby plan.
- MongoDB Atlas Free includes **512 MB storage**, shared CPU/RAM, and **100 operations/second**. It may pause after 30 days with no connections.
- Free tiers are intended for demos and coursework, not production.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `Could not connect to MongoDB` in Render logs | Wrong URI, wrong password, or Atlas IP access | Check `MONGO_URI`, URL-encode the password, and allow `0.0.0.0/0` in Atlas Network Access |
| `Application error` on the site | App crashed on startup | Open the Render service **Logs** tab and read the error |
| Empty booking table | Database was never seeded | Run `npm run seed` locally with the Atlas URI in `.env` |
| Slow first load | Free service was asleep | Wait about a minute; the next requests are fast |
| `Route not found` | Wrong start command or repo root | Confirm Start Command is `npm start` and the repo root contains `server.js` |
