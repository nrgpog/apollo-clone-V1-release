const { EmbedBuilder } = require('discord.js');
const { handleWinners } = require('../utils/giveawayUtils');

module.exports = (client) => {
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        if (!message.content.startsWith('a!gend')) return;
        if (!message.member || !message.member.roles.cache.some(role => role.name === 'Giveways')) {
            return message.reply('No tienes el rol "Giveways" para ejecutar este comando.');
        }

        try {
            
            const messages = await message.channel.messages.fetch({ limit: 100 });
            
            
            const giveawayMessage = messages.find(msg => 
                msg.author.id === client.user.id && 
                msg.content.includes('🎉 GIVEAWAY 🎉') &&
                msg.embeds.length > 0
            );

            if (!giveawayMessage) {
                return message.reply('No se encontró ningún sorteo activo en los últimos 100 mensajes de este canal.');
            }

            const reaction = giveawayMessage.reactions.cache.get('🎉');
            if (!reaction) {
                return message.reply('No se encontraron reacciones en el sorteo.');
            }

            
            const originalEmbed = giveawayMessage.embeds[0];
            const premio = originalEmbed.author.name;

            
            const winnerCountMatch = giveawayMessage.content.match(/Ganadores: (\d+)/);
            const cantidadGanadores = winnerCountMatch ? parseInt(winnerCountMatch[1]) : 1;

            
            await handleWinners(
                giveawayMessage,
                reaction,
                premio,
                new Date(),
                message.author,
                cantidadGanadores
            );

        } catch (error) {
            console.error('Error al finalizar el sorteo:', error);
            message.reply('Ocurrió un error al intentar finalizar el sorteo.');
        }
    });
}; 