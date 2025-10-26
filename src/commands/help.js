import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List available commands'),

  async execute({ interaction, client }) {
    const commands = client.commands;

    // Build a description string
    const lines = commands.map(cmd => {
      const name = cmd.data.name;
      const desc = cmd.data.description || '';
      return `/${name} — ${desc}`;
    });

    const message = '`Available commands:`\n```' + lines.join('\n') + '```';

    await interaction.reply({ content: message, ephemeral: true });
  }
};
