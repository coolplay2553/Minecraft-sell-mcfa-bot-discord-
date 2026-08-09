const axios = require('axios');

async function getUUID(username) {
  try {
    const res = await axios.get(`https://api.mojang.com/users/profiles/minecraft/${username}`);
    return res.data.id;
  } catch {
    return null;
  }
}

async function getHypixelStatus(uuid, key) {
  try {
    const res = await axios.get(`https://api.hypixel.net/player?key=${key}&uuid=${uuid}`);
    const p = res.data.player;

    if (!p) return { banned: false, watchdog: false };

    return {
      banned: p.isBanned || false,
      watchdog: p.isWatchdogBanned || false
    };
  } catch {
    return { banned: false, watchdog: false };
  }
}

module.exports = { getUUID, getHypixelStatus };