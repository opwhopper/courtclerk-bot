import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  Events,
  Embed,
  PermissionsBitField,
} from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Trello } from './trello.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId || !guildId) {
  console.error('Please set DISCORD_TOKEN, CLIENT_ID and GUILD_ID in .env');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

// Command collection
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = await import(`file://${filePath}`);
  client.commands.set(command.default.data.name, command.default);
}

const trello = new Trello({
  key: process.env.TRELLO_KEY,
  token: process.env.TRELLO_TOKEN,
  boardId: process.env.TRELLO_BOARD_ID,
  defaultListId: process.env.TRELLO_LIST_ID_DEFAULT
});

client.once(Events.ClientReady, c => {
  console.log(`Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  // Variables
  const member = await interaction.guild?.members.fetch(interaction.user.id).catch(() => null);
  const isAdmin = member?.permissions.has(PermissionsBitField.Flags.Administrator) || false;
  const hasRole = (roleEnv) => {
    if (!member) return false;
    if (isAdmin) return true;
    const roleId = process.env[roleEnv];
    return roleId ? member.roles.cache.has(roleId) : false;
  };

  // Slash commands
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (command) {
      try {
        await command.execute({ interaction, trello, client, isAdmin });
      } catch (err) {
        console.error(err);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: '`Error:` Unable to execute command. Check bot status/permissions.', ephemeral: true });
        } else {
          await interaction.reply({ content: '`Error:` Unable to execute command. Check bot status/permissions.', ephemeral: true });
        }
      }
    }
  }
  
  // Modal submissions 
  if (interaction.isModalSubmit()) {
    const [prefix] = interaction.customId.split('-');
    // e.g. "fileModal" → "file", "warrantModal" → "warrant"
    const commandName = prefix.replace('Modal', '');
    const command = client.commands.get(commandName);
    if (command?.handleModal) {
        try {
          await command.handleModal({ interaction, trello });
        } catch (err) {
        console.error(err);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: '`Error:` Unable to handle modal.', ephemeral: true });
        } else {
          await interaction.reply({ content: '`Error:` Unable to handle modal.', ephemeral: true });
        }
      }
    }
  }

  // Button interactions
  if (!interaction.isButton()) return;

  const [prefix, action, userId, channelId, party] = interaction.customId.split('-');
  if (prefix === 'appear') {
    const caseChannel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!caseChannel) {
      return interaction.reply({ content: '`Error:` Unable to find case channel.', ephemeral: true });
    }

    if ((prefix === 'appear') && (action === "approve" || action === 'deny') && (!isAdmin && !hasRole('BOT_MANAGER_ID'))) {
      return interaction.reply({ content: '`Error:` ' + `This action requires advanced bot permissions.`, ephemeral: true });
    }
    else if ((action === 'approve') && (isAdmin || hasRole('BOT_MANAGER_ID'))) {
      await caseChannel.permissionOverwrites.edit(userId, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        AttachFiles: true,
        EmbedLinks: true
      });
      const approved = await caseChannel.send({content: `**NOTICE TO ALL PARTIES:** <@${userId}> HEREBY APPEARS ON BEHALF OF **${party}** (REQUEST APPROVED BY: <@${interaction.user.id}>)`, components: [], embeds: [], fetchReply: true});
      await interaction.update({ content: 'Status: APPROVED ✅', components: [], embeds: interaction.message.embeds });
      approved.pin()
    } else if ((action === 'deny') && (isAdmin || hasRole('BOT_MANAGER_ID'))) {
      await caseChannel.send(`**APPEARANCE DENIED** FOR <@${userId}> (REQUESTED DENIED BY: ${interaction.user.id})`);
      await interaction.update({ content: 'Status: DENIED ❌', components: [], embeds: interaction.message.embeds });
    }
  }
});

client.login(token);
