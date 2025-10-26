import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('filetypes')
    .setDescription('List available filing types'),
  async execute({ interaction }) {
    const types = [
      { name: 'criminal', note: 'Government only' },
      { name: 'civil', note: 'Everyone can file' },
      { name: 'warrant', note: 'Law enforcement only' },
      { name: 'vacate', note: 'Government only; NOTE: By submitting a filing under this category, you acknowledge that you have determined the record(s) which you are requesting to vacate were issued without probable cause.'},
      { name: 'habeas', note: 'Everyone can file' },
      { name: 'expungement', note: 'Everyone can file; NOTE: If you are challenging the validity of an arrest, this is the wrong filing type! File under habeas instead.'}
    ];
    let desc = '`Available filing types:`\n```' + types.map(t => `${t.name}: ` + `${t.note}`).join('\n') + '```';
    await interaction.reply({ content: desc, ephemeral: true });
  }
};
