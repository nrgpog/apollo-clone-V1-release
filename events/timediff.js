const { EmbedBuilder } = require('discord.js');
const ms = require('ms');
const { getWinMessageTemplate } = require('../utils/mongo');

function snowflakeToTimestamp(snowflake) {
    return Number(BigInt(snowflake) >> 22n) + 1420070400000;
}

module.exports = (client) => {
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;

        if (message.content.startsWith('a!timedif')) {
            const args = message.content.split(' ');
            if (args.length < 2 || args.length > 3) {
                return message.reply('Uso correcto: a!timedif [ID mensaje 1] [ID mensaje 2 (opcional)]');
            }
            const givenId = args[1];
            let compareId;
            
            if (args.length === 2) {
                if (message.reference && message.reference.messageId) {
                    try {
                        const replyingMessage = await message.channel.messages.fetch(message.reference.messageId);
                        const winMessageTemplate = await getWinMessageTemplate();
                        const templateLines = winMessageTemplate.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                        const topLine = templateLines[0];
                        const bottomLine = templateLines[templateLines.length - 1];
                        if (replyingMessage && replyingMessage.content && replyingMessage.content.includes(topLine) && replyingMessage.content.includes(bottomLine)) {
                            compareId = replyingMessage.id;
                        }
                    } catch (error) {
                        console.error('Error fetching replied message:', error);
                    }
                }
                if (!compareId) {
                    const winMessageTemplate = await getWinMessageTemplate();
                    const messages = await message.channel.messages.fetch({ limit: 100 });
                    const templateLines = winMessageTemplate.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                    const topLine = templateLines[0];
                    const bottomLine = templateLines[templateLines.length - 1];
                    const winMessage = messages.find(msg => {
                        const content = msg.content.trim();
                        return content.includes(topLine) && content.includes(bottomLine);
                    });
                    if (!winMessage) {
                        return message.reply('No se encontró un mensaje reciente de victoria para comparar.');
                    }
                    compareId = winMessage.id;
                }
            } else {
                compareId = args[2];
            }
            try {
                const givenTimestamp = snowflakeToTimestamp(givenId);
                const commandTimestamp = snowflakeToTimestamp(compareId);
                const timeDiff = Math.abs(commandTimestamp - givenTimestamp);
                const minutes = Math.floor(timeDiff / 60000);
                const seconds = ((timeDiff % 60000) / 1000).toFixed(2);
                const formattedGiven = new Date(givenTimestamp).toLocaleString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false });
                const formattedCommand = new Date(commandTimestamp).toLocaleString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false });

                const infoEmbed = new EmbedBuilder()
                    .setTitle('Snowflake')
                    .setDescription(`${minutes > 0 ? `${minutes} minutos y ` : ''}${seconds} segundos

    \`${givenId}\` ([Ir al mensaje](https://discord.com/channels/${message.guild.id}/${message.channel.id}/${givenId}))
Enviado ${formattedGiven}

\`${compareId}\` ([Ir al mensaje](https://discord.com/channels/${message.guild.id}/${message.channel.id}/${compareId}))
Enviado ${formattedCommand}

Mostrando la diferencia de tiempo entre los IDs proporcionados`)
                    .setColor('#5865F2');
                
                await message.reply({ embeds: [infoEmbed] });
            } catch (error) {
                console.error('Error al calcular la diferencia de snowflake:', error);
                return message.reply('Error al procesar los IDs.');
            }
        }
    });
}; 