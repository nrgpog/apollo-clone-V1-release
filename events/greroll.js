const { EmbedBuilder } = require('discord.js');

module.exports = (client) => {
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.toLowerCase().startsWith('a!greroll')) return;
    if (!message.member || !message.member.roles.cache.some(role => role.name === 'Giveways')) {
      return message.reply('No tienes el rol "Giveways" para ejecutar este comando.');
    }

    try {
      const args = message.content.split(' ');
      const messageId = args[1];
      
      
      let giveawayMessage = null;
      if (messageId) {
        giveawayMessage = await message.channel.messages.fetch(messageId).catch(() => null);
      } else {
        let lastMessageId = null;
        while (true) {
          const fetchOptions = { limit: 100 };
          if (lastMessageId) fetchOptions.before = lastMessageId;
          const messages = await message.channel.messages.fetch(fetchOptions);
          if (messages.size === 0) break;
          giveawayMessage = messages.find(msg => 
            msg.author.id === client.user.id &&
            msg.embeds.length > 0 &&
            msg.content.includes('GIVEAWAY') &&
            msg.embeds[0].description && msg.embeds[0].description.startsWith('• Finalizado:')
          );
          if (giveawayMessage) break;
          lastMessageId = messages.last().id;
        }
      }
      
      if (!giveawayMessage) {
         return message.reply('No se encontró ningún sorteo finalizado reciente para rerollar.');
      }
      
      
      const reaction = giveawayMessage.reactions.cache.get('🎉');
      if (!reaction) {
         return message.reply('No se encontraron reacciones en el sorteo.');
      }
      
      
      const embed = giveawayMessage.embeds[0];
      const premio = embed.author ? embed.author.name : 'Premio';
      
      
      let previousWinnerId = null;
      const botMessages = await message.channel.messages.fetch({ limit: 100 });
      if (botMessages.size > 0) {
         
         const latestWinMsg = botMessages.first();
         const mentionMatch = latestWinMsg.content.match(/<@!?(\d+)>/);
         if (mentionMatch) {
            previousWinnerId = mentionMatch[0].replace(/[<@!>]/g, '');
         }
      }
      
      
      const users = await reaction.users.fetch();
      let participants = users.filter(u => !u.bot);
      if (previousWinnerId) {
         participants = participants.filter(u => u.id !== previousWinnerId);
      }
      
      if (participants.size === 0) {
         return message.channel.send('No hay participantes remanentes para elegir un nuevo ganador.');
      }
      
      const participantArray = Array.from(participants.values());
      
      
      let endTime = new Date();
      const timeMatch = embed.description.match(/<t:(\d+):R>/);
      if (timeMatch) {
         endTime = new Date(parseInt(timeMatch[1]) * 1000);
      }
      const claimTimeSeconds = Math.max(Math.round((Date.now() - endTime.getTime()) / 1000), 0);
      const claimTime = `${claimTimeSeconds} seconds`;
      
      
      let hostStr = message.author.toString(); 
      const hostLineMatch = embed.description.match(/Hosted by (.+?)(\n|$)/);
      if (hostLineMatch) {
         hostStr = hostLineMatch[1].trim();
      }
      
      const { announceWinner, calculateWeights, weightedRandomSelection } = require('../utils/giveawayUtils');
      
      
      const participantWeights = await calculateWeights(participantArray, message.guild);
      
      
      const newWinner = weightedRandomSelection(participantWeights);
      
      await announceWinner(giveawayMessage, newWinner, premio, claimTime, hostStr, hostStr, message.guild);
      
    } catch (error) {
      console.error('Error en el comando greroll:', error);
      return message.reply('Ocurrió un error al intentar realizar el reroll.');
    }
  });
}; 