const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const { connectDB } = require('../utils/mongo');

const TRUNCATE_LENGTH = 200; 

const truncate = (text, n) => {
  if (!text) return "[Mensaje vacío]";
  return text.length > n ? text.slice(0, n) + "..." : text;
};

module.exports = (client) => {
  
  setInterval(async () => {
    try {
      const db = await connectDB();
      const collection = db.collection('snipes');
      
      await collection.updateMany({}, { $set: { messages: [] } });
      console.log('Snipes collection cleaned up.');
    } catch (error) {
      console.error('Error cleaning snipes collection:', error);
    }
  }, 5 * 60 * 60 * 1000); 

  
  client.on('messageDelete', async (message) => {
    try {
      
      if (message.partial) return;
      if (message.author && message.author.bot) return;
      
      const snipeData = {
        content: message.content || '[No texto]',
        authorTag: message.author.tag,
        authorId: message.author.id,
        createdAt: message.createdAt ? message.createdAt : new Date(),
        messageId: message.id
      };

      const db = await connectDB();
      const collection = db.collection('snipes');

      await collection.updateOne(
        { channelId: message.channel.id },
        {
          $push: { messages: { $each: [snipeData], $position: 0, $slice: 100 } }
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('Error handling messageDelete in snipe command:', error);
    }
  });

  
  client.on('messageCreate', async (message) => {
    try {
      if (message.author.bot) return;
      if (message.content.toLowerCase().startsWith('a!snipe')) {
        const db = await connectDB();
        const collection = db.collection('snipes');
        const doc = await collection.findOne({ channelId: message.channel.id });
        const snipes = doc ? doc.messages : [];

        if (!snipes || snipes.length === 0) {
          return message.reply('No hay mensajes eliminados en este canal.');
        }

        
        const displaySnipes = snipes.slice(0, 10);
        
        const description = displaySnipes.map((msg, index) => {
          return `**#${index + 1} - ${msg.authorTag}**: ${truncate(msg.content, TRUNCATE_LENGTH)}`;
        }).join('\n');

        const embed = new EmbedBuilder()
          .setTitle('Snipes - Últimos mensajes eliminados')
          .setDescription(description)
          .setFooter({ text: 'Mostrando mensajes 1-10. Usa los botones para ver más.' })
          .setColor(0x0099ff)
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('snipe_10-20')
            .setLabel('10-20')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('snipe_30-50')
            .setLabel('30-50')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('snipe_50-100')
            .setLabel('50-100')
            .setStyle(ButtonStyle.Primary)
        );

        await message.channel.send({ embeds: [embed], components: [row] });
      }
    } catch (error) {
      console.error('Error in a!snipe command:', error);
    }
  });

  
  client.on('interactionCreate', async (interaction) => {
    try {
      if (!interaction.isButton()) return;
      if (!interaction.customId.startsWith('snipe_')) return;

      
      const range = interaction.customId.split('_')[1];
      const [start, end] = range.split('-').map(Number);

      const db = await connectDB();
      const collection = db.collection('snipes');
      const doc = await collection.findOne({ channelId: interaction.channel.id });
      const snipes = doc ? doc.messages : [];

      if (!snipes || snipes.length === 0) {
        return interaction.reply({ content: 'No hay mensajes eliminados en este canal.', ephemeral: true });
      }

      const displaySnipes = snipes.slice(start, end);
      
      if (displaySnipes.length === 0) {
        return interaction.reply({ content: 'No hay mensajes en este rango.', ephemeral: true });
      }

      const description = displaySnipes.map((msg, index) => {
        return `**#${start + index + 1} - ${msg.authorTag}**: ${truncate(msg.content, TRUNCATE_LENGTH)}`;
      }).join('\n');

      const embed = new EmbedBuilder()
        .setTitle(`Snipes - Mensajes eliminados [${start + 1}-${start + displaySnipes.length}]`)
        .setDescription(description)
        .setColor(0x0099ff)
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('Error handling snipe button interaction:', error);
    }
  });
}; 