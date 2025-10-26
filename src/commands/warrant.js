import {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('warrant')
    .setDescription('Submit a new warrant request'),

  async execute({ interaction, isAdmin, hasRole }) {
    if (!isAdmin && !hasRole('ROLE_LAW_ENFORCEMENT_ID')) {
      return interaction.reply({ content: '`Error:` You do not have permission to run this command.', ephemeral: true });
    }

    // Build modal
    const modal = new ModalBuilder()
      .setCustomId('warrantModal')
      .setTitle('New Warrant Submission');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('officer')
          .setLabel('Your ROBLOX username')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('warranttype')
          .setLabel('Type of warrant (SW/AW)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('suspect')
          .setLabel('Suspect(s)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('charges')
          .setLabel('Alleged offense(s)')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('aopc')
          .setLabel('Link to affidavit of probable cause (AOPC)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );

    await interaction.showModal(modal);
  },

  async handleModal({ interaction }) {
    if (interaction.customId !== 'warrantModal') return;

    try {
      // Acknowledge immediately
      await interaction.reply({
        content: 'Request submitted. Sending to review channel…',
        ephemeral: true
      });

      const officer = interaction.fields.getTextInputValue('officer');
      const w_type = interaction.fields.getTextInputValue('warranttype');
      const suspect = interaction.fields.getTextInputValue('suspect');
      const charges = interaction.fields.getTextInputValue('charges');
      const aopc = interaction.fields.getTextInputValue('aopc');

      const warrantsChannelId = process.env.WARRANTS_ID;
      const warrantsChannel = await interaction.client.channels
        .fetch(warrantsChannelId)
        .catch(() => null);

      if (!warrantsChannel) {
        return interaction.followUp({
          content: '`Error:` Unable to access warrants channel. Check configurations/bot permissions.',
          ephemeral: true
        });
      }

      const safe = (str, max = 1024) =>
        str && str.length > max ? str.slice(0, max - 3) + '…' : str || 'N/A';

      const embed = new EmbedBuilder()
        .setTitle('New Warrant Request')
        .addFields(
          { name: 'Officer', value: safe(officer), inline: true },
          { name: 'Suspect(s)', value: safe(suspect), inline: false },
          { name: 'Warrant type', value: safe(w_type), inline: false },
          { name: 'Alleged offense(s)', value: safe(charges), inline: false },
          { name: 'Link to affidavit', value: safe(aopc), inline: false },
          { name: 'Requested by', value: `<@${interaction.user.id}>`, inline: false }
        )
        .setColor(0xd6bd2d)
        .setTimestamp();

      await warrantsChannel.send({ embeds: [embed] });
    } catch (err) {
      console.error('Failed to handle warrant modal:', err);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          content: '`Error:` Unable to create embed. Please notify staff.',
          ephemeral: true
        }).catch(() => {});
      } else {
        await interaction.reply({
          content: '`Error:` Unable to create embed. Please notify staff.',
          ephemeral: true
        }).catch(() => {});
      }
    }
  }
};
