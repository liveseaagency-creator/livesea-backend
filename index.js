import express from "express";
import fetch from "node-fetch";

const app = express();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const BOT_TOKEN = process.env.BOT_TOKEN;

const GUILD_ID = "1286386371870724322";
const ROLE_ID = "1291423302841139334";

app.get("/", (req, res) => {
  res.send("Backend LiveSea OK");
});

app.get("/auth/discord/callback", async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.send("❌ No code provided");
  }

  try {
    console.log("➡️ CODE:", code);

    // 🔁 ÉCHANGE CODE → TOKEN
    const tokenResponse = await fetch(
      "https://discord.com/api/oauth2/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          grant_type: "authorization_code",
          code: code,
          redirect_uri: REDIRECT_URI,
        }),
      }
    );

    const tokenData = await tokenResponse.json();
    console.log("➡️ TOKEN DATA:", tokenData);

    if (!tokenData.access_token) {
      return res.send("❌ Failed to get access token");
    }

    const access_token = tokenData.access_token;

    // 👤 RÉCUP USER
    const userResponse = await fetch(
      "https://discord.com/api/users/@me",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    const user = await userResponse.json();
    console.log("➡️ USER:", user);

    // 🎭 RÉCUP MEMBER (ROLES)
    const memberResponse = await fetch(
      `https://discord.com/api/guilds/${GUILD_ID}/members/${user.id}`,
      {
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
        },
      }
    );

    const member = await memberResponse.json();
    console.log("➡️ MEMBER:", member);

    const hasRole = member.roles?.includes(ROLE_ID);

    // 🎯 AFFICHAGE TEMPORAIRE (DEBUG)
    if (!hasRole) {
      return res.send(`
        <h1>⏳ Compte en attente</h1>
        <p>Utilisateur: ${user.username}</p>
        <p>Email: ${user.email}</p>
        <p>Tu n'as pas encore accès à l'application.</p>
      `);
    }

    return res.send(`
      <h1>✅ Connexion réussie</h1>
      <p><strong>Username:</strong> ${user.username}</p>
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>Status:</strong> Validé</p>
    `);

  } catch (err) {
    console.error("❌ ERROR:", err);
    res.send("❌ Error during auth");
  }
});

app.listen(3000, () => console.log("🚀 Server running"));