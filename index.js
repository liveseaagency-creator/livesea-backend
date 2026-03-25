import express from "express";
import fetch from "node-fetch";

const app = express();

// 🔐 ENV VARIABLES (Railway)
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const BOT_TOKEN = process.env.BOT_TOKEN;

// 🎯 CONFIG DISCORD
const GUILD_ID = "1286386371870724322";
const ROLE_ID = "1291423302841139334";

// 📡 HEALTH CHECK
app.get("/", (req, res) => {
  res.send("LiveSea backend running");
});

// 🔑 OAUTH CALLBACK
app.get("/auth/discord/callback", async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send("Missing code");
  }

  try {
    // 🔁 1. CODE → TOKEN
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

    if (!tokenData.access_token) {
      console.error("Token error:", tokenData);
      return res.status(500).send("Token error");
    }

    const access_token = tokenData.access_token;

    // 👤 2. USER INFO
    const userResponse = await fetch(
      "https://discord.com/api/users/@me",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    const user = await userResponse.json();

    if (!user.id) {
      console.error("User error:", user);
      return res.status(500).send("User error");
    }

    // 🎭 3. MEMBER INFO (ROLES)
    const memberResponse = await fetch(
      `https://discord.com/api/guilds/${GUILD_ID}/members/${user.id}`,
      {
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
        },
      }
    );

    const member = await memberResponse.json();

    const hasRole = member.roles?.includes(ROLE_ID);

    console.log("USER:", user.username);
    console.log("HAS ROLE:", hasRole);

    // 🔗 4. DEEP LINK VERS APP
    const appUrl = `exp://192.168.1.197:8081?status=${
      hasRole ? "approved" : "pending"
    }&username=${encodeURIComponent(user.username)}&email=${encodeURIComponent(
      user.email || ""
    )}&avatar=${user.avatar}`;

    return res.redirect(appUrl);
  } catch (error) {
    console.error("ERROR:", error);
    return res.status(500).send("Internal server error");
  }
});

// 🚀 START SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});