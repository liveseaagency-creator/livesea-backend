import express from "express";
import fetch from "node-fetch";
import { query } from "./db.js";

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
const CREATOR_ROLE_ID = "1291423302841139334";

const PRESIDENT_ROLE_ID = "1291422525729017959";
const DIRECTEUR_GENERAL_ROLE_ID = "1291422561434996837";
const MANAGER_ROLE_ID = "1291423094887551056";
const AGENT_ROLE_ID_1 = "1342649606818889789";
const AGENT_ROLE_ID_2 = "1291423227792461865";
const AMBASSADEUR_ROLE_ID = "1389241354323886240";

/* =========================
   HELPERS
========================= */

function getAvatarUrl(user) {
  if (user.avatar) {
    const isGif = user.avatar.startsWith("a_");
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${isGif ? "gif" : "png"}`;
  }

  const discriminator = Number.parseInt(user.discriminator || "0", 10);
  const index = Number.isNaN(discriminator) ? 0 : discriminator % 5;
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

function getDisplayName(user, member) {
  return user.global_name || member?.nick || user.username || "Utilisateur";
}

function getHighestGrade(memberRoles = []) {
  if (memberRoles.includes(PRESIDENT_ROLE_ID)) {
    return { gradeLabel: "Président", rank: 5 };
  }

  if (memberRoles.includes(DIRECTEUR_GENERAL_ROLE_ID)) {
    return { gradeLabel: "Directeur général", rank: 4 };
  }

  if (memberRoles.includes(MANAGER_ROLE_ID)) {
    return { gradeLabel: "Manager", rank: 3 };
  }

  if (
    memberRoles.includes(AGENT_ROLE_ID_1) ||
    memberRoles.includes(AGENT_ROLE_ID_2)
  ) {
    return { gradeLabel: "Agent", rank: 2 };
  }

  if (memberRoles.includes(AMBASSADEUR_ROLE_ID)) {
    return { gradeLabel: "Ambassadeur-drice", rank: 1 };
  }

  return { gradeLabel: null, rank: 0 };
}

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
    /* =========================
       TOKEN
    ========================= */

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

    const accessToken = tokenData.access_token;

    /* =========================
       USER DISCORD
    ========================= */

    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const user = await userResponse.json();

    if (!user.id) {
      console.error("User error:", user);
      return res.status(500).send("User error");
    }

    /* =========================
       MEMBER (ROLES)
    ========================= */

    const memberResponse = await fetch(
      `https://discord.com/api/guilds/${GUILD_ID}/members/${user.id}`,
      {
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
        },
      }
    );

    const member = await memberResponse.json();

    const hasRole = Array.isArray(member.roles)
      ? member.roles.includes(CREATOR_ROLE_ID)
      : false;

    /* =========================
       🔥 GET TIKTOK FROM DB
    ========================= */

    let tiktokData = null;

    try {
      const rows = await query(
        "SELECT tiktok_username, tiktok_nickname, tiktok_uid FROM users_tiktok WHERE discord_user_id = ? LIMIT 1",
        [user.id]
      );

      if (Array.isArray(rows) && rows.length > 0) {
        tiktokData = rows[0];
      }

      console.log("TikTok DB:", tiktokData);
    } catch (err) {
      console.error("DB error:", err);
    }

    /* ========================= */

    const avatarUrl = getAvatarUrl(user);
    const displayName = getDisplayName(user, member);

    console.log("User connected:", {
      id: user.id,
      username: user.username,
      displayName,
      hasRole,
    });

    /* =========================
       REDIRECT APP ✅
    ========================= */

    const appUrl = `exp://192.168.1.197:8081?status=${
      hasRole ? "approved" : "pending"
    }&id=${user.id}
&username=${encodeURIComponent(user.username || "")}
&displayName=${encodeURIComponent(displayName)}
&email=${encodeURIComponent(user.email || "")}
&avatar=${encodeURIComponent(avatarUrl)}
&tiktokUsername=${encodeURIComponent(tiktokData?.tiktok_username || "")}
&tiktokNickname=${encodeURIComponent(tiktokData?.tiktok_nickname || "")}
&tiktokUid=${encodeURIComponent(tiktokData?.tiktok_uid || "")}`;

    console.log("Redirect URL:", appUrl);

    return res.redirect(appUrl);
  } catch (error) {
    console.error("Callback error:", error);
    return res.status(500).send("Internal server error");
  }
});

/* =========================
   GET CREATORS
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
      .filter(
        (member) =>
          Array.isArray(member.roles) &&
          member.roles.includes(CREATOR_ROLE_ID)
      )
      .map((member) => {
        const user = member.user;
        const { gradeLabel, rank } = getHighestGrade(member.roles);

        return {
          id: user.id,
          username: user.username,
          displayName: getDisplayName(user, member),
          avatar: getAvatarUrl(user),
          gradeLabel,
          rank,
        };
      })
      .sort((a, b) => {
        if (b.rank !== a.rank) return b.rank - a.rank;
        return a.username.localeCompare(b.username, "fr", {
          sensitivity: "base",
        });
      });

    return res.json(creators);
  } catch (error) {
    console.error("Creators error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

/* =========================
   START SERVER
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
