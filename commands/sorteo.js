const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const ms = require('ms');
const { handleWinners } = require('../utils/giveawayUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sorteo')
        .setDescription('Inicia un sorteo')
        .addStringOption(option =>
            option.setName('tiempo')
                .setDescription('Duración del sorteo (ejemplo: 10s, 1m, 1h)')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('ganadores')
            .setDescription('Cantidad de ganadores a elegir (por defecto 1)')
            .setRequired(true))
        .addStringOption(option =>
            option.setName('premio')
                .setDescription('¿Qué premio se sorteará?')
                .setRequired(true)),
    async execute(interaction) {
        if (!interaction.member || !interaction.member.roles.cache.some(role => role.name === 'Giveways')) {
            return await interaction.reply({ content: 'No tienes el rol "Giveways" para ejecutar el comando de sorteo.', ephemeral: true });
        }
        const premio = interaction.options.getString('premio');
        const tiempoStr = interaction.options.getString('tiempo');
        const cantidadGanadores = interaction.options.getInteger('ganadores') ?? 1;
        if(cantidadGanadores < 1) {
            return await interaction.reply({
                content: 'La cantidad de ganadores debe ser al menos 1.',
                ephemeral: true
            });
        }
        
        let tiempo;
        try {
            tiempo = ms(tiempoStr.toLowerCase());
            if (!tiempo || tiempo < 1000 || tiempo > 2628003600) {
                return await interaction.reply({
                    content: 'El tiempo del sorteo debe ser mínimo 1s y máximo 730.001h (1 mes) en formato válido (ej: 10s, 1m, 1h).',
                    ephemeral: true
                });
            }
        } catch (error) {
            return await interaction.reply({
                content: 'Formato de tiempo no válido. Usa formatos como: 10s, 1m, 1h.',
                ephemeral: true
            });
        }

        const emoji = '🎉';
        const endTime = new Date(Date.now() + tiempo);
        const embed = new EmbedBuilder()
            .setAuthor({ name: premio, iconURL: interaction.guild.iconURL() })
            .setDescription(`• Finaliza: <t:${Math.floor(endTime.getTime() / 1000)}:R>\n• Hosted by ${interaction.user}${cantidadGanadores > 1 ? "\n• Ganadores: " + cantidadGanadores : ""}`)
            .setColor('#2F3136')
            .setFooter({ text: "Termina en" })
            .setTimestamp(endTime);

        const message = await interaction.channel.send({ 
            content: `${emoji} GIVEAWAY ${emoji}${cantidadGanadores > 1 ? ` | Ganadores: ${cantidadGanadores}` : ''}`, 
            embeds: [embed] 
        });
        await message.react(emoji);
        await interaction.reply({ content: 'Sorteo creado exitosamente!', ephemeral: true });

        setTimeout(async () => {
            try {
                const fetchedMessage = await message.fetch();
                const reaction = fetchedMessage.reactions.cache.get(emoji);
                if (!reaction) {
                    return await interaction.channel.send('No se encontraron reacciones en el sorteo.');
                }

                await handleWinners(
                    fetchedMessage,
                    reaction,
                    premio,
                    endTime,
                    interaction.user,
                    cantidadGanadores
                );

            } catch (error) {
                console.error('Error al seleccionar el ganador:', error);
                await interaction.channel.send('Ocurrió un error al seleccionar el ganador.');
            }
        }, tiempo);
    }
};