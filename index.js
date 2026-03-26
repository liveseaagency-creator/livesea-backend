import express from "express";
import fetch from "node-fetch";

const app = express();

// 🔐 ENV
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const BOT_TOKEN = process.env.BOT_TOKEN;

// 🎯 CONFIG
const GUILD_ID = "1286386371870724322";
const ROLE_ID = "1291423302841139334";

// 📡 HEALTH CHECK
app.get("/", (req, res) => {
  res.send("LiveSea backend running");
});

// 🔑 CALLBACK DISCORD
app.get("/auth/discord/callback", async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send("Missing code");
  }

  try {
    // 🔁 1. GET TOKEN
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
      console.error("❌ Token error:", tokenData);
      return res.status(500).send("Token error");
    }

    const access_token = tokenData.access_token;

    // 👤 2. USER INFOS
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
      console.error("❌ User error:", user);
      return res.status(500).send("User error");
    }

    // 🎭 3. MEMBER (ROLES)
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

    // 🧠 4. AVATAR LOGIC PROPRE
    let avatarUrl = "";

    if (user.avatar) {
      const isGif = user.avatar.startsWith("a_");
      avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${isGif ? "gif" : "png"}`;
    } else {
      const index = parseInt(user.discriminator) % 5;
      avatarUrl = `https://cdn.discordapp.com/embed/avatars/${index}.png`;
    }

    // 🧠 5. USERNAME PRO (nouveau système Discord)
    const displayName =
      user.global_name || user.username || "Utilisateur";

    // 🧾 DEBUG PROPRE
    console.log("✅ USER CONNECTED:");
    console.log({
      id: user.id,
      username: user.username,
      global_name: user.global_name,
      email: user.email,
      avatar: avatarUrl,
      hasRole,
    });

    // 🔗 6. DEEP LINK APP
    const appUrl = `exp://192.168.1.197:8081?status=${
      hasRole ? "approved" : "pending"
    }&id=${user.id}&username=${encodeURIComponent(
      user.username
    )}&displayName=${encodeURIComponent(
      displayName
    )}&email=${encodeURIComponent(
      user.email || ""
    )}&avatar=${encodeURIComponent(avatarUrl)}`;

    return res.redirect(appUrl);
  } catch (error) {
    console.error("🔥 ERROR:", error);
    return res.status(500).send("Internal server error");
  }
});

// 🚀 START
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});