import { SlashCommandBuilder } from 'discord.js';

// Helper: extract Trello card ID from URL or raw ID
function extractCardId(input) {
  if (!input) return input;
  const match = input.match(/trello\.com\/c\/([A-Za-z0-9]+)/);
  if (match) return match[1];
  return input;
}

export default {
  data: new SlashCommandBuilder()
    .setName('upload')
    .setDescription('Upload files to an existing Trello card (run this in the case channel)')
    .addStringOption(opt =>
      opt.setName('card')
        .setDescription('Trello card ID or short URL')
        .setRequired(true)
    ),

  async execute({ interaction, trello, isAdmin, hasRole }) {
    if (!isAdmin && !hasRole('ROLE_ATTORNEY_ID')) {
      return interaction.reply({ content: '`Error:` You do not have permission to run this command.', ephemeral: true });
    }

    const input = interaction.options.getString('card');
    const cardId = extractCardId(input);

    if (!interaction.guild) {
      return interaction.reply({
        content: '\Error:\ This command must be used in a server channel (not via DMs).',
        ephemeral: true
      });
    }

    // Acknowledge in the channel
    await interaction.reply({ content: 'Attempting to send direct message (DM)...', ephemeral: true });

    try {
      await interaction.editReply({
      content: '`Success:` I’ve sent you a DM to upload your files.',
      ephemeral: true
    });
      // Fetch card to confirm it exists
      const card = await trello.getCard(cardId);
    
      // Open DM
      const dm = await interaction.user.createDM();
      await dm.send(
        '`Upload:` Please attach your files here within 5 minutes. ' +
        'You can also paste links. Reply **SKIP** to cancel.\n\n'
      );

      const filter = m => m.author.id === interaction.user.id;
      const collector = dm.createMessageCollector({ filter, time: 1000 * 60 * 5 });

      collector.on('collect', async m => {
        if (m.content.trim().toUpperCase() === 'SKIP') {
          await dm.send('Upload cancelled.');
          return collector.stop('skipped');
        }

         // Gather attachments and links
        const attachments = [...m.attachments.values()];
        const urlRegex = /(https?:\/\/\S+)/g;
        const links = m.content.match(urlRegex) || [];

        // If no attachments or links, ignore this message
        if (attachments.length === 0 && links.length === 0) {
          return; // do nothing, collector keeps running
        }

        // Handle attachments
        for (const att of attachments) {
          try {
            await trello.addAttachmentFromUrl(card.id, att.url, att.name);
          } catch (e) {
          console.error('attach fail', e);
          await dm.send(`\`Error:\` Failed to attach ${att.name}`);
          }
        }

        // Handle links
        for (const link of links) {
          try {
            await trello.addAttachmentFromUrl(card.id, link, link);
          } catch (e) {
          console.error('link fail', e);
          await dm.send(`\`Error:\` Failed to attach link: ${link}`);
        }
      }
        await dm.send('`Success:` Files/links attached to Trello card.');
        collector.stop('uploaded');
      });

      collector.on('end', async (_, reason) => {
        if (reason !== 'uploaded' && reason !== 'skipped') {
          await dm.send('No files uploaded. Upload window expired.');
        }
      });
    } catch (err) {
      console.error('Upload failed:', err);
      await interaction.followUp({
        content: '`Error:` Could not find Trello card. Check the ID/URL and try again.',
        ephemeral: true
      });
    }
  }
};
