  require('dotenv').config();
  const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Events,
    ChannelType,
    PermissionsBitField,
    StringSelectMenuBuilder
  } = require('discord.js');

  const axios = require('axios');
  const fs = require('fs');

  const client = new Client({
    intents: [GatewayIntentBits.Guilds]
  });

  const marketMessages = new Map();
  const holdMessages = new Map();
  const ADMIN_ROLE_ID = "1485693668663758868";

  // ===== PERSISTENT SELLERS =====
  const SELLERS_FILE = './sellers.json';

  function loadSellers() {
    try {
      if (fs.existsSync(SELLERS_FILE)) {
        const data = JSON.parse(fs.readFileSync(SELLERS_FILE, 'utf8'));
        return new Map(Object.entries(data));
      }
    } catch (e) {
      console.error('⚠️ โหลด sellers.json ไม่ได้:', e.message);
    }
    return new Map();
  }

  function saveSellers(sellersMap) {
    try {
      const obj = Object.fromEntries(sellersMap);
      fs.writeFileSync(SELLERS_FILE, JSON.stringify(obj, null, 2));
    } catch (e) {
      console.error('⚠️ เซฟ sellers.json ไม่ได้:', e.message);
    }
  }

  const sellers = loadSellers();

  client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
  });

  // ===== FORMAT NUMBER =====
  const format = (n) => {
    n = Number(n);
    if (!n) return 0;
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'm';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
    return n;
  };

  const formatPlaytime = (sec) => {
    sec = Number(sec) / 1000;
    if (!sec || isNaN(sec)) return '0h';
    const days = Math.floor(sec / 86400);
    const hours = Math.floor((sec % 86400) / 3600);
    if (days > 0 && hours > 0) return `${days}d ${hours}h`;
    if (days > 0) return `${days}d`;
    return `${hours}h`;
  };

  // ===== CAPE LIST =====
  const CAPE_OPTIONS = [
    { label: 'Common',        value: 'Common',        emoji: { id: '1486029344953598182' } },
    { label: 'Pan',           value: 'Pan',           emoji: { id: '1486029421184811189' } },
    { label: 'Creeper',       value: 'Creeper',       emoji: { id: '1486029387923980289' } },
    { label: 'Vanilla',       value: 'Vanilla',       emoji: { id: '1486029307741737072' } },
    { label: 'Yearn',         value: 'Yearn',         emoji: { id: '1486029262782726254' } },
    { label: 'Cherry Blossom',value: 'Cherry Blossom',emoji: { id: '1486029230855688212' } },
    { label: 'Copper',        value: 'Copper',        emoji: { id: '1486029199142686931' } },
    { label: 'Menace',        value: 'Menace',        emoji: { id: '1486029165940445254' } },
    { label: 'Home',          value: 'Home',          emoji: { id: '1486029137431756872' } },
    { label: 'Migrator',      value: 'Migrator',      emoji: { id: '1486038069248397342' } },
  ];

  // แปลง cape value → emoji string
  const capeToEmoji = (capeName) => {
    const found = CAPE_OPTIONS.find(c => c.value === capeName);
    return found ? `<:${found.label.replace(/\s/g, '_')}:${found.emoji.id}>` : capeName;
  };

  // ===== HANDLE COMMAND =====
  client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'sell') {
      const username = interaction.options.getString('username');
      const price = interaction.options.getNumber('price');
      const rank = interaction.options.getString('rank');
      const nameChangeable = interaction.options.getBoolean('namechange');

      const embed = new EmbedBuilder()
        .setColor('#7a5cff')
        .setTitle(`<:name:1485829769273802752> ${username}`)
        .setDescription(`A new listing has been posted for **${username}**.`)
        .setThumbnail(`https://mc-heads.net/avatar/${username}`)
        .addFields(
          { name: '<:hypixel:1485829739825332274> Hypixel Rank', value: rank || 'None', inline: true },
          { name: '<:cape:1485829597168664658> Capes', value: 'None', inline: false },
          { name: '<:price:1485829567884169417> Price', value: `฿${price}`, inline: true },
          { name: '<:status:1485829534250172617> Status', value: 'Open', inline: true },
          { name: '<:namechange:1485829427874238495> Name changeable', value: nameChangeable ? 'True' : 'False', inline: true }
        )
        .setFooter({ text: `listed by ${interaction.user.username}` });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`user_${username}`)
          .setLabel('Show Username')
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setLabel('Show on NameMC')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://namemc.com/profile/${username}`),

        new ButtonBuilder()
          .setCustomId(`stats_${username}`)
          .setLabel('Show Stats')
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId(`buy_${username}_${price}`)
          .setLabel('Buy')
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId(`addcape_${username}`)
          .setLabel('Add Cape')
          .setStyle(ButtonStyle.Secondary)
      );

      await interaction.reply({ embeds: [embed], components: [row] });

      const msg = await interaction.fetchReply();
      marketMessages.set(username, msg);

      // บันทึก seller ลงไฟล์ด้วย
      sellers.set(username, interaction.user.id);
      saveSellers(sellers);
    }
  });

  // ===== BUTTON =====
  client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton()) return;

    const args = interaction.customId.split('_');
    const type = args[0];
    const username = args[1];
    const price = args[2];

    if (type === 'user') {
      return interaction.reply({ content: `\`${username}\``, ephemeral: true });
    }

    if (type === 'stats') {
      const embed = new EmbedBuilder()
        .setColor('#7a5cff')
        .setTitle('<:stats:1485844742234443806> Stats')
        .setDescription(`Choose a server for **${username}**.`);

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`select_${username}`)
          .setPlaceholder('Choose a server')
          .addOptions([
            {
              label: 'DonutSMP',
              description: 'Show DonutSMP stats',
              value: 'donut',
              emoji: { id: '1485850190488535141' }
            }
          ])
      );

      return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    // ===== ADD CAPE =====
    if (type === 'addcape') {
      const sellerId = sellers.get(username);

      if (interaction.user.id !== sellerId) {
        return interaction.reply({
          content: '❌ เฉพาะคนที่ลิสต์ขายเท่านั้น',
          ephemeral: true
        });
      }

      // ดึง cape emoji ปัจจุบันจาก embed เพื่อ filter ออก
      const listingMsg = marketMessages.get(username);
      let currentCapeValues = [];
      if (listingMsg) {
        const capeField = listingMsg.embeds[0].fields.find(f => f.name.includes('Capes'));
        if (capeField && capeField.value !== 'None') {
          // แปลง emoji กลับเป็น value โดยเช็คจาก CAPE_OPTIONS
          for (const opt of CAPE_OPTIONS) {
            const emoji = `<:${opt.label.replace(/\s/g, '_')}:${opt.emoji.id}>`;
            if (capeField.value.includes(emoji)) {
              currentCapeValues.push(opt.value);
            }
          }
        }
      }

      // กรอง cape ที่มีแล้วออก
      const availableOptions = CAPE_OPTIONS.filter(c => !currentCapeValues.includes(c.value));

      if (availableOptions.length === 0) {
        return interaction.reply({
          content: '✅ เพิ่ม cape ครบทุกตัวแล้ว',
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setColor('#7a5cff')
        .setTitle('<:cape:1485829597168664658> Add Cape')
        .setDescription(`เลือก cape ที่ต้องการเพิ่มให้ **${username}**`);

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`selectcape_${username}`)
          .setPlaceholder('เลือก cape...')
          .setMinValues(1)
          .setMaxValues(availableOptions.length)
          .addOptions(availableOptions)
      );

      return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    // ===== BUY =====
    if (type === 'buy') {
      const ch = await interaction.guild.channels.create({
        name: `buy-${username}`,
        type: ChannelType.GuildText,
        parent: process.env.CATEGORY_ID,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel] }
        ]
      });

      const sellerId = sellers.get(username);

      const embed = new EmbedBuilder()
        .setColor('#7a5cff')
        .setTitle('<:shopticket:1485863936292028446> Buy Ticket')
        .setDescription(`<@${interaction.user.id}> wants to buy **${username}**\n\nSupport will assist you shortly.`)
        .addFields(
          { name: '<:diamond:1485863909012541521> Account', value: username, inline: true },
          { name: '<:money:1485863882512797787> Price', value: `฿${price}`, inline: true }
        )
        .setFooter({ text: 'ferox • Support' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`close_${username}`)
          .setLabel('Close Ticket')
          .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
          .setCustomId(`release_${username}`)
          .setLabel('Release Data')
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId(`hold_${username}`)
          .setLabel('Hold')
          .setStyle(ButtonStyle.Secondary)
      );

      // sellerId จะไม่ undefined แม้รีบอท เพราะโหลดจากไฟล์แล้ว
      await ch.send({
        content: sellerId
          ? `<@&${ADMIN_ROLE_ID}> <@${sellerId}>`
          : `<@&${ADMIN_ROLE_ID}>`,
        embeds: [embed],
        components: [row]
      });

      await interaction.reply({ content: `✅ Ticket created: ${ch}`, ephemeral: true });
    }

    // ===== CLOSE =====
    if (type === 'close') {
      await interaction.reply({ content: '🔒 Closing ticket...', ephemeral: true });
      setTimeout(() => interaction.channel.delete(), 1000);
    }

    // ===== RELEASE =====
    if (type === 'release') {
      if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
        return interaction.reply({ content: '❌ เฉพาะแอดมินเท่านั้น', ephemeral: true });
      }

      await interaction.reply({ content: `✅ Data ของ ${username} ถูกปล่อยแล้ว`, ephemeral: true });

      const msg = marketMessages.get(username);
      if (msg) {
        await msg.reply('# SOLD');

        const oldEmbed = msg.embeds[0];
        const newEmbed = EmbedBuilder.from(oldEmbed)
          .setFields(oldEmbed.fields.map(f => {
            if (f.name.includes('Status')) return { name: f.name, value: 'Closed', inline: true };
            return f;
          }));

        const newRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`user_${username}`).setLabel('Show Username').setStyle(ButtonStyle.Secondary).setDisabled(true),
          new ButtonBuilder().setLabel('Show on NameMC').setStyle(ButtonStyle.Link).setURL(`https://namemc.com/profile/${username}`),
          new ButtonBuilder().setCustomId(`stats_${username}`).setLabel('Show Stats').setStyle(ButtonStyle.Primary).setDisabled(true),
          new ButtonBuilder().setCustomId(`buy_${username}_${price}`).setLabel('Buy').setStyle(ButtonStyle.Success).setDisabled(true),
          new ButtonBuilder().setCustomId(`addcape_${username}`).setLabel('Add Cape').setStyle(ButtonStyle.Secondary).setDisabled(true)
        );

        await msg.edit({ embeds: [newEmbed], components: [newRow] });
      }
    }

    // ===== HOLD / UNHOLD =====
    if (type === 'hold' || type === 'unhold') {
      if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
        return interaction.reply({ content: '❌ เฉพาะแอดมินเท่านั้น', ephemeral: true });
      }

      const listingMsg = marketMessages.get(username);

      if (type === 'hold') {
        if (!holdMessages.has(username)) {
          if (listingMsg) {
            const holdMsg = await listingMsg.reply('# <:waring:1485847217418932325> ON HOLD');
            holdMessages.set(username, holdMsg);
          }

          const newRow = new ActionRowBuilder().addComponents(
            interaction.message.components[0].components.map(btn => {
              if (btn.data.custom_id === `hold_${username}`) {
                return ButtonBuilder.from(btn).setCustomId(`unhold_${username}`).setLabel('Unset Hold');
              }
              return ButtonBuilder.from(btn);
            })
          );

          await interaction.update({ components: [newRow] });
        }
      } else {
        const holdMsg = holdMessages.get(username);
        if (holdMsg) await holdMsg.delete().catch(() => {});
        holdMessages.delete(username);

        const newRow = new ActionRowBuilder().addComponents(
          interaction.message.components[0].components.map(btn => {
            if (btn.data.custom_id === `unhold_${username}` || btn.data.custom_id === `hold_${username}`) {
              return ButtonBuilder.from(btn).setCustomId(`hold_${username}`).setLabel('Hold');
            }
            return ButtonBuilder.from(btn);
          })
        );

        await interaction.update({ components: [newRow] });
      }
    }
  });

  // ===== SELECT MENU =====
  client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isStringSelectMenu()) return;

    const [prefix, username] = interaction.customId.split('_');

    // ===== SELECT CAPE =====
    if (prefix === 'selectcape') {
      const selectedCapes = interaction.values;
      const listingMsg = marketMessages.get(username);

      if (!listingMsg) {
        return interaction.update({ content: '❌ ไม่พบ listing', components: [] });
      }

      const oldEmbed = listingMsg.embeds[0];
      const newEmbed = EmbedBuilder.from(oldEmbed)
        .setFields(oldEmbed.fields.map(f => {
          if (f.name.includes('Capes')) {
            // ดึง emoji ที่มีอยู่แล้ว
            let currentEmojis = f.value === 'None' ? [] : f.value.split(' ');

            // เพิ่ม emoji ใหม่ที่ยังไม่มี
            for (const cape of selectedCapes) {
              const emoji = capeToEmoji(cape);
              if (!currentEmojis.includes(emoji)) {
                currentEmojis.push(emoji);
              }
            }

            return { name: f.name, value: currentEmojis.join(' '), inline: f.inline };
          }
          return f;
        }));

      await listingMsg.edit({ embeds: [newEmbed] });

      // แสดงชื่อ cape ที่เพิ่มไป (พร้อม emoji)
      const addedDisplay = selectedCapes.map(c => `${capeToEmoji(c)} ${c}`).join(', ');

      return interaction.update({
        content: `✅ เพิ่ม ${addedDisplay} แล้ว`,
        embeds: [],
        components: []
      });
    }

    // ===== SELECT SERVER (STATS) =====
    if (prefix === 'select') {
      if (interaction.values[0] === 'donut') {
        try {
          const res = await axios.get(
            `https://api.donutsmp.net/v1/stats/${username}`,
            { headers: { Authorization: process.env.DONUT_API_KEY } }
          );

          const d = res.data.result;
          const locale = interaction.locale || 'en-US';
          const now = new Date().toLocaleString(locale);

          const embed = new EmbedBuilder()
            .setColor('#7a5cff')
            .setTitle(username)
            .setDescription(`**DonutSMP • Stats**`)
            .setThumbnail(`https://vzge.me/full/512/${username}?y=-30`)
            .addFields(
              {
                name: '__Economy__',
                value:
                  `<:_emerald_:1485675889709813892> Money → $${format(d.money)}\n` +
                  `<:shards:1485857603149107220> Shards → ${format(d.shards)}\n` +
                  `<:shopspent:1485857652796817499> Shop Spent → $${format(d.money_spent_on_shop)}\n` +
                  `<:shope:1485860497873174568> Shop Earnings → $${format(d.money_made_from_sell)}`
              },
              {
                name: '__Combat__',
                value:
                  `<:kill:1485857680655515730> Kills → ${format(d.kills)}\n` +
                  `<:death:1485857714717331526> Deaths → ${format(d.deaths)}\n` +
                  `<:mobskill:1485857748402049124> Mobs Killed → ${format(d.mobs_killed)}`
              },
              {
                name: '__World__',
                value:
                  `<:clocked:1485857774398341151> Playtime → ${formatPlaytime(d.playtime)}\n` +
                  `<:blockplaced:1485857801208070184> Placed Blocks → ${format(d.placed_blocks)}\n` +
                  `<:blockbroken:1485857828114534400> Broken Blocks → ${format(d.broken_blocks)}`
              }
            )
            .setFooter({ text: `Ferox • Donut Stats • ${now}`, iconURL: client.user.displayAvatarURL() });

          await interaction.update({ embeds: [embed], components: [] });

        } catch (err) {
          console.error("🔥 ERROR:", err.response?.data || err.message);
          await interaction.update({ content: `❌ ดึง stats ไม่ได้ (เช็ค username / API key)`, components: [] });
        }
      }
    }
  });

  client.login(process.env.TOKEN);