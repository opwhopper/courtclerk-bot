import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('appear')
    .setDescription('Request notice of appearance in an existing case channel')
    .addChannelOption(opt =>
      opt
        .setName('channel')
        .setDescription('Case channel to appear in')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('party')
        .setDescription('Party you are appearing on behalf of')
        .setRequired(true)
        .addChoices(
          { name: 'Plaintiff', value: 'Plaintiff' },
          { name: 'Defendant', value: 'Defendant' }
        )
    ),

  async execute({ interaction, client, isAdmin, hasRole }) {
    if (!isAdmin && !hasRole('ROLE_ATTORNEY_ID')) {
      return interaction.reply({ content: '`Error:` Only attorneys may run this command.', ephemeral: true });
    }
    const caseChannel = interaction.options.getChannel('channel');
    const party = interaction.options.getString('party');
    const judgeChannelId = process.env.JUDGE_REVIEW_CHANNEL_ID;

    await interaction.reply({ content: '`Success:` Your request has been sent to the presiding judge for review.', ephemeral: true });

    // Build embed for judges
    const embed = new EmbedBuilder()
      .setTitle('Notice of Appearance Request')
      .addFields(
          { name: '**Requester:**', value: `${interaction.user.tag}` || 'N/A', inline: true },
          { name: '**Party:**', value: `${party}`, inline: false },
          { name: '**Case Channel:**', value: `${caseChannel}`, inline: false }
        )
      .setColor(0xd6bd2d)
      .setTimestamp();
    
    // Buttons
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`appear-approve-${interaction.user.id}-${caseChannel.id}-${party}`)
        .setLabel('Approve')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`appear-deny-${interaction.user.id}-${caseChannel.id}-${party}`)
        .setLabel('Deny')
        .setStyle(ButtonStyle.Danger)
    );

    if (judgeChannelId) {
      const logChannel = await client.channels.fetch(judgeChannelId).catch(() => null);
      if (logChannel) {
        await logChannel.send({ content: 'Status: PENDING ⏳', embeds: [embed], components: [row] });
      } else {
      // judgeChannelId was set but channel not found
      await caseChannel.send({ content: 'Status: PENDING ⏳', embeds: [embed], components: [row] });
      }
    } else {
      // judgeChannelId not set at all
      await caseChannel.send({ content: 'Status: PENDING ⏳', embeds: [embed], components: [row] });
    }
  }
};
