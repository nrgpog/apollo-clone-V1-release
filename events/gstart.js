const ms = require('ms');
const { EmbedBuilder } = require('discord.js');

module.exports = (client) => {
  client.on('messageCreate', async (message) => {
    if(message.author.bot) return;
    if(!message.guild) return;
    if (!message.content.toLowerCase().startsWith('a!gstart')) return;
    
    if (!message.member.roles.cache.some(role => role.name === 'Giveways')) {
      return message.reply('No tienes el rol "Giveways" para ejecutar el comando de sorteo.');
    }
    
    const args = message.content.slice('a!gstart'.length).trim().split(/ +/);
    if (!args[0] || !args[1]) {
      return message.reply('Uso: a!gstart tiempo ganadores premio');
    }
    
    const tiempoStr = args[0];
    const cantidadGanadores = args[1] ? parseInt(args[1]) : 1;
    const premio = args.slice(2).join(' ');
    
    if(cantidadGanadores < 1) {
      return message.reply('La cantidad de ganadores debe ser al menos 1.');
    }
    
    let tiempo;
    try {
      tiempo = ms(tiempoStr.toLowerCase());
      if (!tiempo || tiempo < 1000 || tiempo > 2628003600) { 
        return message.reply('tiempo invalido\nEjemplo: `a!gstart <tiempo> <ganadores> <premio>`\nTiempos válidos: 1s-730h\n\n1s, 1m, 1h');
      }
    } catch (error) {
      return message.reply('tiempo invalido\nEjemplo: `a!gstart <tiempo> <ganadores> <premio>`\nTiempos válidos: 1s-730h\n\n1s, 1m, 1h');
    }
    
    const emoji = '🎉';
    const endTime = new Date(Date.now() + tiempo);
    const embed = new EmbedBuilder()
      .setAuthor({ name: premio, iconURL: message.guild.iconURL() })
      .setDescription(`• Finaliza: <t:${Math.floor(endTime.getTime()/1000)}:R>\n• Hosted by ${message.author}${cantidadGanadores > 1 ? "\n• Ganadores: " + cantidadGanadores : ""}`)
      .setColor('#2F3136')
      .setFooter({ text: "Termina en" })
      .setTimestamp(endTime);
    
    const giveawayMessage = await message.channel.send({
      content: `${emoji} GIVEAWAY ${emoji}${cantidadGanadores > 1 ? ` | Ganadores: ${cantidadGanadores}` : ''}`,
      embeds: [embed]
    });
    await giveawayMessage.react(emoji);
    message.delete();
    
    setTimeout(async () => {
      try {
        const fetchedMessage = await giveawayMessage.fetch();
        const reaction = fetchedMessage.reactions.cache.get(emoji);
        if (!reaction) {
          return message.channel.send('No se encontraron reacciones en el sorteo.');
        }
        
        const { handleWinners } = require('../utils/giveawayUtils');
        await handleWinners(fetchedMessage, reaction, premio, endTime, message.author, cantidadGanadores);
        
      } catch (error) {
        console.error('Error al seleccionar el ganador:', error);
        message.channel.send('Ocurrió un error al seleccionar el ganador.');
      }
    }, tiempo);
  });
}; 