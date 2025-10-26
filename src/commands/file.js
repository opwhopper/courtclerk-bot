import {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder
} from 'discord.js';

const FILING_TYPES = ['criminal','civil','warrant','vacate','habeas','expungement'];

export default {
  data: new SlashCommandBuilder()
    .setName('file')
    .setDescription('Create a new filing')
    .addStringOption(opt =>
      opt.setName('type')
        .setDescription('Type of filing')
        .setRequired(true)
        .addChoices(...FILING_TYPES.map(t => ({ name: t, value: t })))
    ),

  async execute({ interaction, isAdmin, hasRole }) {
    const filingType = interaction.options.getString('type');

    if ((filingType === "criminal" || filingType === 'vacate') && !isAdmin && !hasRole('ROLE_DOJ_ID') ) {
      return interaction.reply({ content: '`Error:` ' + `This filing type is restricted to the Department of Justice.`, ephemeral: true });
    }
    if ((filingType === "vacate" || filingType === 'vacate') && !isAdmin && !hasRole('ROLE_DOJ_ID')) {
      return interaction.reply({ content: '`Error:` ' + `This filing type is restricted to the Department of Justice.`, ephemeral: true });
    }
    if (filingType === "warrant" && !isAdmin && !hasRole('ROLE_LAW_ENFORCEMENT_ID')) {
      return interaction.reply({ content: '`Error:` ' +  `Warrant filings are restricted to law enforcement.`, ephemeral: true });
    }

    // Build modal
    const modal = new ModalBuilder()
      .setCustomId(`fileModal-${filingType}`)
      .setTitle(`New Filing`);

    if (filingType === "criminal") {
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('prosecutor').setLabel('What is your ROBLOX username?').setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('defendants').setLabel('List the defendant(s)').setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('charges').setLabel('List the criminal charges').setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('description').setLabel('Provide a brief description of events').setStyle(TextInputStyle.Paragraph).setRequired(true)
        )
      );
    } else if (filingType === 'civil') {
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('user').setLabel('What is your ROBLOX username?').setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('plaintiffs').setLabel('List the plaintiff(s)').setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('defendants').setLabel('List the defendant(s)').setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('claim').setLabel('List the tort(s)').setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('description').setLabel('Provide a brief description of events').setStyle(TextInputStyle.Paragraph).setRequired(true)
        )
      );
    } else if (filingType === 'expungement') {
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('user').setLabel('What is your ROBLOX username?').setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('totaloffenses').setLabel('List the number of offenses on your record').setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('recent').setLabel('Date of most recent offense (MM/DD/YY)').setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('explanation').setLabel('Statement of reasoning (min. 8 sentences)').setStyle(TextInputStyle.Paragraph).setRequired(true)
        )
      );
    } else if (filingType === 'vacate') {
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('user').setLabel('What is your ROBLOX username?').setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('rank').setLabel('Current position within the DOJ').setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('target').setLabel('State the username of the individual').setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('records').setLabel('Provide the record(s) and date(s) in question').setStyle(TextInputStyle.Paragraph).setRequired(true)
        ),
      );
    } else if (filingType === 'habeas') {
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('user').setLabel('What is your ROBLOX username?').setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('petitioner').setLabel('State the username of the petitioner').setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('respondent').setLabel('State the username of the respondent').setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('records').setLabel('Provide the record(s) and date(s) in question').setStyle(TextInputStyle.Paragraph).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('reason').setLabel('Provide the basis for this petition').setStyle(TextInputStyle.Paragraph).setRequired(true)
        ),
      );
    } else {
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('casename').setLabel('Case Name').setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('notes').setLabel('Additional Notes').setStyle(TextInputStyle.Paragraph).setRequired(false)
        )
      );
    }

    await interaction.showModal(modal);
  },

  async handleModal({ interaction, trello }) {
    if (!interaction.customId.startsWith('fileModal-')) return;
    const filingType = interaction.customId.split('-')[1];

    await interaction.reply({ content: 'Form submitted. Creating your filing…', ephemeral: true });

    try {
      let card;
      let desc = '';
      let caseTitle = '';
      let label = await trello.findLabelByName(filingType);
      let labels = label ? [label.id] : [];

       if (filingType === 'criminal') {
        const defendants = interaction.fields.getTextInputValue('defendants');
        const charges = interaction.fields.getTextInputValue('charges');
        const description = interaction.fields.getTextInputValue('description');
        
        caseTitle = `State of Mayflower v. ${defendants}`;
        desc = `**Criminal Filing**\n\n**Defendant(s):** ${defendants}\n**Charges:** ${charges}\n**Description:** ${description}`;
        card = await trello.createCard({ name: caseTitle, desc, labels });
      } else if (filingType === 'civil') {
        const plaintiffs = interaction.fields.getTextInputValue('plaintiffs');
        const defendants = interaction.fields.getTextInputValue('defendants');
        const claim = interaction.fields.getTextInputValue('claim');
        const description = interaction.fields.getTextInputValue('description');
        
        caseTitle = `${plaintiffs} v. ${defendants}`;
        desc = `**Civil Filing**\n\n**Plaintiff(s):** ${plaintiffs}\n**Defendant(s):** ${defendants}\n\**Tort(s):** ${claim}\n\**Description:** ${description}`;
        card = await trello.createCard({ name: caseTitle, desc, labels });        
      } else if (filingType === 'expungement') {
        const user = interaction.fields.getTextInputValue('user');
        const totaloffenses = interaction.fields.getTextInputValue('totaloffenses');
        const recent = interaction.fields.getTextInputValue('recent');
        const explanation = interaction.fields.getTextInputValue('explanation');
        
        caseTitle = `Ex parte ${user}`;
        desc = `**Expungement Filing**\n\n**Username:** ${user}\n**Total offenses:** ${totaloffenses}\n\**Most recent record:** ${recent}\n\**Statement of reasoning:** ${explanation}`;
        card = await trello.createCard({ name: caseTitle, desc, labels });   
      } else if (filingType === 'vacate') {
        const user = interaction.fields.getTextInputValue('user');
        const rank = interaction.fields.getTextInputValue('rank');
        const target = interaction.fields.getTextInputValue('target');
        const records = interaction.fields.getTextInputValue('records');
        
        caseTitle = `Ex parte ${user}`;
        desc = `**Vacate Filing**\n\n**Username:** ${user}\n**Position within the Department of Justice:** ${rank}\n\**Name of individual being vacated:** ${target}\n\**Record(s) being vacated:** ${records}`;
        card = await trello.createCard({ name: caseTitle, desc, labels });   
      } else if (filingType === 'habeas') {
        const user = interaction.fields.getTextInputValue('user');
        const petitioner = interaction.fields.getTextInputValue('petitioner');
        const respondent = interaction.fields.getTextInputValue('respondent');
        const records = interaction.fields.getTextInputValue('records');
        const reason = interaction.fields.getTextInputValue('reason');
        
        caseTitle = `In re ${user}`;
        desc = `**Habeas Filing**\n\n**Username:** ${user}\n**Petitioner:** ${petitioner}\n\**Respondent:** ${respondent}\n\**Record(s) being challenged:** ${records}\n\**Description:** ${reason}`;
        card = await trello.createCard({ name: caseTitle, desc, labels });   
      } else {
        const caseName = interaction.fields.getTextInputValue('casename');
        const notes = interaction.fields.getTextInputValue('notes');
        
        caseTitle = interaction.fields.getTextInputValue('casename');
        desc = `**Filing type:** ${filingType}\n**Case name:** ${caseName}\nNotes: ${notes || 'N/A'}`;
        card = await trello.createCard({ name: caseName, desc, labels });
      }

    // Embed Log
    try {
        const logChannelId = process.env.LOG_CHANNEL_ID;
        const logChannel = interaction.client.channels.cache.get(logChannelId);
        if (logChannel) {
          const colorByType = {
            criminal: 0xb00000,   // red
            civil: 0x2dd657,      // green
            expungement: 0x2d54d6, // blue
            warrant: 0xd6bd2d,    // gold
            vacate: 0xd6bd2d,     // gold
            habeas: 0x2d54d6      // blue
          };

        const embed = new EmbedBuilder()
          .setTitle(`New Case Submission: ${filingType}`)
          .setDescription(desc.length > 4000 ? desc.slice(0, 4000) + '…' : desc)
          .addFields(
            { name: 'Case Name', value: caseTitle || 'N/A', inline: true },
            { name: 'Filed by', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Trello', value: card.shortUrl || String(card.id), inline: false }
          )
          .setColor(colorByType[filingType] ?? 0x2b6cb0)
          .setTimestamp();

        await logChannel.send({ embeds: [embed] });
      }
    } catch (e) {
      console.error('Failed to send log embed:', e);
    }

    // DM flow for attachments
    try {
      const dm = await interaction.user.createDM();
      await dm.send('`Success:` ' +  `Your filing has been created: ${card.shortUrl || card.id}. Please upload additional supporting documents within 5 minutes; if you wish to skip this, you may ignore this message or reply **SKIP**`);

      const filter = m => m.author.id === interaction.user.id && m.attachments.size > 0;
      const collector = dm.createMessageCollector({ filter, time: 1000 * 60 * 5 });

      collector.on('collect', async m => {
        for (const att of m.attachments.values()) {
           await trello.addAttachmentFromUrl(card.id, att.url, att.name).catch(e => console.error('attach fail', e));
        }
        const urlRegex = /(https?:\/\/\S+)/g;
        const links = m.content.match(urlRegex);
        if (links) {
          for (const link of links) {
            await trello
            .addAttachmentFromUrl(card.id, link, link)
            .catch(e => console.error('link fail', e));
          }
        }
        await dm.send('`Success:` ' +  `Files attached to Trello card: ${card.shortUrl || card.id}`);
        collector.stop('uploaded');
      });

      collector.on('end', (_, reason) => {
        if (reason !== 'uploaded') {
          dm.send("No files uploaded. Filing completed without additional attachments.");
        }
      });
    } catch {
      await interaction.followUp({
        content: '`Success:` ' + `Filing created: ${card.shortUrl || card.id}\n` + '`Error: I was unable to DM you. Please enable DMs or contact an admin to attach documents manually. If you think this was a mistake, please notify court staff.`',
        ephemeral: true
      });
    }
  } catch (err) {
    console.error(err);
    await interaction.followUp({ content: '`Error:` ' + `Unable to create filing. Please notify court staff if you believe this was a mistake.`, ephemeral: true });
  }
}
};
