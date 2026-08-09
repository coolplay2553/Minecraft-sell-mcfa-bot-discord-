require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('sell')
    .setDescription('ขาย id minecraft มึง')
    .addStringOption(option =>
      option.setName('username')
        .setDescription('ชื่อ ที่มึงจะขาย')
        .setRequired(true)
    )
    .addNumberOption(option =>
      option.setName('price')
        .setDescription('ราคา ที่มึงจะขายไอ้โง่')
        .setRequired(true)
    )
    .addBooleanOption(option =>
      option.setName('namechange')
        .setDescription('มันเปลี่ยนชื่อได้ไหมไอ้คอก')
        .setRequired(false)
    )
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    
    console.log('✅ Commands deployed (no rank, no capes)');
  } catch (err) {
    console.error(err);
  }
})();