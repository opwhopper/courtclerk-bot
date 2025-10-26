import { SlashCommandBuilder, ChannelType, PermissionsBitField } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription(`Remove a user's access to a case channel`)
    .addUserOption(opt =>
      opt.setName('target')
        .setDescription('The user to remove')
        .setRequired(true)
    )
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('The case channel to remove access to')
        .addChannelTypes(ChannelType.GuildText) // restrict to text channels
        .setRequired(true)
    ),

  async execute({ interaction, isAdmin, hasRole }) {
    if (!isAdmin && !hasRole('BOT_MANAGER_ID')) {
      return interaction.reply({ content: '`Error:` You do not have permission to run this command.', ephemeral: true });
    }
    const targetUser = interaction.options.getUser('target');
    const targetChannel = interaction.options.getChannel('channel');

    if (!interaction.guild || !targetChannel) {
      return interaction.reply({
        content: '`Error:` This command must be used in a server with a valid text channel.',
        ephemeral: true
      });
    }

    try {
      await targetChannel.permissionOverwrites.edit(targetUser.id, {
        ViewChannel: true,
        SendMessages: false,
        ReadMessageHistory: true,
        AttachFiles: false,
        EmbedLinks: false
      });

      await interaction.reply({
        content: '`Success:` ' + `Removed access to user <@${targetUser.id}> in channel <#${targetChannel.id}>.`,
        ephemeral: true
      });
    } catch (err) {
      console.error('Failed to add user to channel:', err);
      await interaction.reply({
        content: '`Error:` ' + `Unable to remove user from channel <#${targetChannel.id}>. Check bot permissions.`,
        ephemeral: true
      });
    }
  }
};
