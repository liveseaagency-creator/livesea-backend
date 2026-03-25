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
    return res.send("No code provided");
  }

  try {
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

    const hasRole = member.roles?.includes(ROLE_ID);

    // 🎯 REDIRECTION VERS APP
    if (!hasRole) {
      return res.redirect(
        `exp://192.168.1.197:8081?status=pending`
      );
    }

    return res.redirect(
      `exp://192.168.1.197:8081?status=approved&username=${user.username}&email=${user.email}&avatar=${user.avatar}`
    );
  } catch (err) {
    console.error(err);
    res.send("Error during auth");
  }
});

app.listen(3000, () => console.log("Server running"));