import express from "express";
import fetch from "node-fetch";

const app = express();

// 🔐 VARIABLES
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const BOT_TOKEN = process.env.BOT_TOKEN;

// 🎯 CONFIG DISCORD
const GUILD_ID = "1286386371870724322";
const ROLE_ID = "1291423302841139334";

// 🟢 TEST ROUTE
app.get("/", (req, res) => {
  res.send("✅ LiveSea Backend Running");
});

// 🔥 CALLBACK DISCORD
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
          code,
          redirect_uri: REDIRECT_URI,
        }),
      }
    );

    const tokenData = await tokenResponse.json();
    console.log("➡️ TOKEN DATA:", tokenData);

    // ❌ ERREUR TOKEN
    if (!tokenData.access_token) {
      return res.send(`
        ❌ Token Error<br/>
        ${JSON.stringify(tokenData)}
      `);
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

    // ❌ ERREUR USER
    if (!user.id) {
      return res.send("❌ Failed to fetch user");
    }

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

    // ❌ ERREUR GUILD
    if (!member.roles) {
      return res.send(`
        ❌ Guild Access Error<br/>
        ${JSON.stringify(member)}
      `);
    }

    const hasRole = member.roles.includes(ROLE_ID);

    // ⏳ PAS VALIDÉ
    if (!hasRole) {
      return res.send(`
        <h1>⏳ Compte en attente</h1>
        <p>${user.username}</p>
        <p>${user.email}</p>
      `);
    }

    // ✅ VALIDÉ
    return res.send(`
      <h1>✅ Connexion réussie</h1>
      <p><strong>Username:</strong> ${user.username}</p>
      <p><strong>Email:</strong> ${user.email}</p>
      <p>Status: VALIDÉ</p>
    `);

  } catch (err) {
    console.error("❌ SERVER ERROR:", err);
    res.send("❌ Server crash");
  }
});

// 🚀 START SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});