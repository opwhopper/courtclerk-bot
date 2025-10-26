import { SlashCommandBuilder, ChannelType, EmbedBuilder } from 'discord.js';
import { createTranscript } from 'discord-html-transcripts';

export default {
  data: new SlashCommandBuilder()
    .setName('transcript')
    .setDescription('Generate a full HTML transcript of a specific channel')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The channel to generate a transcript from')
        .addChannelTypes(
          ChannelType.GuildText,
          ChannelType.PublicThread,
          ChannelType.PrivateThread
        )
        .setRequired(true)
    ),

  async execute({ interaction, isAdmin, hasRole }) {
    if (!isAdmin && !hasRole('BOT_MANAGER_ID')) {
      return interaction.reply({ content: '`Error:` You do not have permission to run this command.', ephemeral: true });
    }

    const channel = interaction.options.getChannel('channel');

    if (
      channel.type !== ChannelType.GuildText &&
      channel.type !== ChannelType.PublicThread &&
      channel.type !== ChannelType.PrivateThread
    ) {
      return interaction.editReply({
        content: '`Error:` This channel type is not supported (must be a text or thread channel).',
        ephemeral: true,
      });
    }

    let transcript;
    try {
      transcript = await createTranscript(channel, {
        limit: -1,
        fileName: `transcript-${channel.name}.html`,
        returnBuffer: false,
        saveImages: false,
        excludeComponents: true,
        excludeEmbeds: false,
      });
    } catch (err) {
      console.error('Transcript generation failed:', err);
      return interaction.editReply({
        content: '`Error:` Could not generate transcript: channel contains unsupported content.',
        ephemeral: true,
      });
    }

    // Main function
    try {
      const transcriptChannelId = process.env.TRANSCRIPT_ID;
      const transcriptChannel = interaction.client.channels.cache.get(transcriptChannelId);

      // Fetch the very first message in the channel
      let firstMsg;
      try {
        const fetched = await channel.messages.fetch({ limit: 1, after: 0 });
        firstMsg = fetched.first();
      } catch (fetchErr) {
        console.error('Failed to fetch first message:', fetchErr);
      }

      // Format timestamps for Discord
      const firstMsgTime = firstMsg
        ? `<t:${Math.floor(firstMsg.createdTimestamp / 1000)}:f>`
        : 'Unknown';
      const runTime = `<t:${Math.floor(Date.now() / 1000)}:f>`;

      const embed = new EmbedBuilder()
        .setTitle(`${channel.name}`)
        .addFields(
          { name: 'Channel Name', value: `#${channel.name}`, inline: true },
          { name: 'Requested by', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'First Message', value: firstMsgTime, inline: false },
          { name: 'Command Run', value: runTime, inline: false }
        )
        .setColor(0x00f7ff)
        .setTimestamp();

      if (transcriptChannel) {
        await interaction.reply('Creating transcript…');

        // Send embed + transcript to the log channel
        const logMsg = await transcriptChannel.send({ embeds: [embed], files: [transcript] });

        // Build jump link to that message
        const jumpLink = `https://discord.com/channels/${interaction.guildId}/${transcriptChannel.id}/${logMsg.id}`;

        // Reply in the command channel with link (visible to all)
        await interaction.editReply({
          content: `\`Success:\` Transcript created: ${jumpLink}`,
        });
      } else {
        await interaction.reply({ content: 'Creating transcript…', ephemeral: true });

        // No transcript channel defined: fall back to ephemeral with file
        await interaction.editReply({
          content: '`Success:` Transcript generated:',
          files: [transcript],
          ephemeral: true,
        });
      }
    } catch (e) {
      console.error('`Error:` Failed to send log embed:', e);
    }
  },
};
