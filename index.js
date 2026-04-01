import express from "express";
import fetch from "node-fetch";

const app = express();

/* =========================
   ENV
========================= */

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const BOT_TOKEN = process.env.BOT_TOKEN;

/* =========================
   CONFIG
========================= */

const GUILD_ID = "1286386371870724322";
const ROLE_ID = "1291423302841139334";

/* =========================
   HEALTH CHECK
========================= */

app.get("/", (req, res) => {
  res.send("Backend running");
});

/* =========================
   DISCORD AUTH CALLBACK
========================= */

app.get("/auth/discord/callback", async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send("Missing code");
  }

  try {
    /* TOKEN */
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

    /* USER */
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

    /* MEMBER (roles) */
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

    /* AVATAR */
    let avatarUrl = "";

    if (user.avatar) {
      const isGif = user.avatar.startsWith("a_");
      avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${isGif ? "gif" : "png"}`;
    } else {
      const index = parseInt(user.discriminator) % 5;
      avatarUrl = `https://cdn.discordapp.com/embed/avatars/${index}.png`;
    }

    /* DISPLAY NAME */
    const displayName =
      user.global_name || user.username || "Utilisateur";

    console.log("User connected:", {
      id: user.id,
      username: user.username,
      displayName,
      hasRole,
    });

    /* REDIRECT APP */
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
    console.error("Callback error:", error);
    return res.status(500).send("Internal server error");
  }
});

/* =========================
   GET CREATORS (ROLE)
========================= */

app.get("/creators", async (req, res) => {
  try {
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/members?limit=1000`,
      {
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
        },
      }
    );

    const members = await response.json();

    if (!Array.isArray(members)) {
      console.error("Discord API error:", members);
      return res.status(500).json({ error: "Discord API error" });
    }

    const creators = members
      .filter((m) => m.roles.includes(ROLE_ID))
      .map((m) => {
        const user = m.user;

        let avatarUrl = "";

        if (user.avatar) {
          const isGif = user.avatar.startsWith("a_");
          avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${isGif ? "gif" : "png"}`;
        } else {
          const index = parseInt(user.discriminator) % 5;
          avatarUrl = `https://cdn.discordapp.com/embed/avatars/${index}.png`;
        }

        return {
          id: user.id,
          username: user.username,
          displayName: user.global_name || m.nick || user.username,
          avatar: avatarUrl,
        };
      });

    res.json(creators);
  } catch (error) {
    console.error("Creators error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/* =========================
   START SERVER
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
