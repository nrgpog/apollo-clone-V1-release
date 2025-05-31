module.exports = (client) => {
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
  
    
    if (!message.content.toLowerCase().startsWith('a!alwinmsg')) return;
    if (!message.member.permissions.has(8n)) {
      return message.reply('Solo los administradores pueden usar este comando.');
    }
    
    const args = message.content.slice('a!alwinmsg'.length).trim().split(/ +/);
    const subCommand = args.shift();

    if (!subCommand) {
      return message.reply('Uso: a!alwinmsg <set|get> [message]\n\nVariables disponibles:\n• {claim_time} - Tiempo de reclamo del ganador\n• {host(username)} - Nombre del anfitrión\n• {host(mention)} - Mención del anfitrión\n• {winner(username)} - Nombre del ganador\n• {winner(mention)} - Mención del ganador\n• {winner (created_age)} - Edad de la cuenta del ganador\n• {winner (created_date)} - Fecha de creación de la cuenta\n• {winner (joined_age)} - Tiempo en el servidor\n• {winner (joined_date)} - Fecha de ingreso al servidor');
    }

    if (subCommand.toLowerCase() === 'set') {
      if (args.length === 0) {
        return message.reply('Por favor, proporciona un mensaje de win. Ejemplo: a!alwinmsg set 🎉 ¡Felicidades {winner (mention)}! Has ganado.');
      }
      const template = args.join(' ');
      const { setWinMessageTemplate } = require('../utils/mongo');
      await setWinMessageTemplate(template);
      return message.reply(`Win message template actualizado a:\n\`${template}\``);
    } else if (subCommand.toLowerCase() === 'get') {
      const { getWinMessageTemplate } = require('../utils/mongo');
      const template = await getWinMessageTemplate();
      if (template && template.trim() !== '') {
        return message.reply(`Win message template actual:\n\`${template}\``);
      } else {
        return message.reply('No hay ningún win message template configurado aún.');
      }
    } else {
      return message.reply('Subcomando inválido. Usa: set o get');
    }
  });
}; 