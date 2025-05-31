module.exports = (client) => {
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        if (!message.content.startsWith('a!nuke')) return;

        
        if (!message.guild) return;
        if (!message.member || !message.channel.permissionsFor(message.member)?.has('ManageChannels')) {
            return message.reply('No tienes permisos de gestionar canales para ejecutar este comando nuke.');
        }
        if (typeof message.channel.clone !== 'function') {
            return message.reply('Este canal no se puede clonar.');
        }

        
        const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        const confirmationEmbed = new EmbedBuilder()
            .setTitle('Confirmación requerida')
            .setDescription(`¿Estás seguro? Si continúas, se eliminarán permanentemente todos los mensajes de ${message.channel.name}. Esta acción no se puede deshacer.`)
            .setColor('Red');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('nuke_confirm_yes')
                .setLabel('Si')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('nuke_confirm_no')
                .setLabel('No')
                .setStyle(ButtonStyle.Secondary)
        );

        const confirmationMessage = await message.channel.send({ embeds: [confirmationEmbed], components: [row] });

        const collector = confirmationMessage.createMessageComponentCollector({ time: 15000 });

        const awaitResponse = new Promise((resolve) => {
            collector.on('collect', async (i) => {
                if (i.user.id !== message.author.id) {
                    await i.reply({ content: 'no puedes utilizar este boton', ephemeral: true });
                    return;
                }
                if (i.customId === 'nuke_confirm_no') {
                    collector.stop('cancelled');
                    const cancelledEmbed = EmbedBuilder.from(confirmationEmbed).setDescription('nuke cancelado');
                    await i.update({ embeds: [cancelledEmbed], components: [] });
                    resolve('cancelled');
                }
                if (i.customId === 'nuke_confirm_yes') {
                    collector.stop('confirmed');
                    await i.update({ components: [] });
                    resolve('confirmed');
                }
            });
            collector.on('end', async (_collected, reason) => {
                if (reason !== 'confirmed' && reason !== 'cancelled') {
                    const cancelledEmbed = EmbedBuilder.from(confirmationEmbed).setDescription('nuke cancelado');
                    await confirmationMessage.edit({ embeds: [cancelledEmbed], components: [] });
                    resolve('cancelled');
                }
            });
        });

        const response = await awaitResponse;
        if (response === 'cancelled') return;

        try {
            
            const clonedChannel = await message.channel.clone({
                name: message.channel.name,
                parent: message.channel.parent,
                topic: message.channel.topic,
                nsfw: message.channel.nsfw,
                permissionOverwrites: message.channel.permissionOverwrites.cache
            });

            
            await clonedChannel.setPosition(message.channel.position);

            
            await clonedChannel.send(`Nuked by \`${message.author.username}\``);

            
            await message.channel.delete();
        } catch (error) {
            console.error('Error ejecutando a!nuke:', error);
            
            if (message.channel && message.channel.send) {
                message.channel.send('Hubo un error al ejecutar el comando nuke.');
            }
        }
    });
}; 