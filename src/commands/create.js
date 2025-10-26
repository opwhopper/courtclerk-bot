import {
  SlashCommandBuilder,
  ChannelType,
  PermissionsBitField,
  EmbedBuilder
} from 'discord.js';

// Helper: extract Trello card ID from URL or raw ID
function extractCardId(input) {
  if (!input) return input;
  const match = input.match(/trello\.com\/c\/([A-Za-z0-9]+)/);
  if (match) return match[1];
  return input;
}

// Helper: sanitize channel name
function toChannelName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\- ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 100);
}

export default {
  data: new SlashCommandBuilder()
    .setName('create')
    .setDescription('Create a new case channel from a Trello card')
    .addStringOption(opt =>
      opt.setName('card')
        .setDescription('Trello card ID or short URL')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('category')
        .setDescription('Optional category channel ID to create under')
        .setRequired(false)
    ),

  async execute({ interaction, trello, isAdmin, hasRole }) {
    if (!isAdmin && !hasRole('BOT_MANAGER_ID')) {
      return interaction.reply({ content: '`Error:` You do not have permission to run this command.', ephemeral: true });
    }
    const input = interaction.options.getString('card');
    const categoryId = interaction.options.getString('category') || null;
    
    await interaction.deferReply({ ephemeral: true });

    try {
      const cardId = extractCardId(input);
      const card = await trello.getCard(cardId);
      
      let parent = null;
      if (categoryId) {
        const cat = interaction.guild.channels.cache.get(categoryId);
        if (cat && cat.type === ChannelType.GuildCategory) {
          parent = cat.id; // or cat depending on discord.js version
        }
      }
      const topic = (card.desc || '').slice(0, 1024);
      
      // Build channel name from card name
      const channelName = toChannelName(card.name);

      // Create the channel
      const channel = await interaction.guild.channels.create({
        name: channelName || 'case',
        type: ChannelType.GuildText,
        parent: parent || undefined,
        topic: '',
        reason: `Created by ${interaction.user.tag} from Trello card ${card.shortUrl || card.id}`,
        permissionOverwrites: [
          {
            id: interaction.guild.roles.everyone.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory],
            deny: [PermissionsBitField.Flags.SendMessages]
          }
        ]
      });

      // Post an initial embed with Trello details
      const caseTypes = card.labels && card.labels.length
        ? card.labels.map(l => l.name).join(', ')
        : 'Unspecified';
      const embed = new EmbedBuilder()
        .setTitle(card.name)
        .setURL(card.shortUrl || String(card.id))
        .setAuthor({name: `Case Created`})
        .addFields(
          { name: 'Case Type', value: caseTypes, inline: true },
          { name: 'Trello', value: card.shortUrl || String(card.id), inline: false },
          { name: 'Created by', value: `<@${interaction.user.id}>`, inline: false }
        )
        .setColor(0x00f7ff)
        .setTimestamp();

      const embedFinal = await channel.send({ embeds: [embed] });
      await embedFinal.pin()

      await interaction.editReply({
        content: '`Success:` ' + `Created channel <#${channel.id}> from Trello card ${card.shortUrl || card.id}.`
      });
    } catch (err) {
      console.error(err);
      await interaction.editReply({ content: '`Error:` Unable to create a channel from Trello. Check card ID/URL and bot permissions.' });
    }
  }
};