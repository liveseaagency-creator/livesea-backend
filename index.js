import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const BOT_TOKEN = process.env.BOT_TOKEN;
const REDIRECT_URI = process.env.REDIRECT_URI;

const GUILD_ID = "1286386371870724322";
const ROLE_ID = "1291423302841139334";

app.get("/auth/discord/callback", async (req, res) => {
  const code = req.query.code;

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
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
  });

  const tokenData = await tokenRes.json();

  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  const user = await userRes.json();

  const memberRes = await fetch(
    `https://discord.com/api/guilds/${GUILD_ID}/members/${user.id}`,
    {
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
      },
    }
  );

  if (memberRes.status !== 200) {
    return res.json({ approved: false, user });
  }

  const member = await memberRes.json();
  const hasRole = member.roles.includes(ROLE_ID);

  res.json({
    approved: hasRole,
    user,
  });
});

app.listen(3000, () => console.log("Server running"));