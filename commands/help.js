const { SlashCommandBuilder } = require('@discordjs/builders');
const { CommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Muestra una lista de comandos disponibles'),

    /**
     * @param {CommandInteraction} interaction
     */
    async execute(interaction) {
        // Definimos las diferentes categorías de ayuda
        const helpCategories = {
            'main': {
                title: '📚 Menú Principal',
                description: 'Bienvenido al menú de ayuda. Usa los botones para navegar entre las diferentes categorías de comandos.',
                fields: [
                    { name: '🎉 Sorteos', value: 'Comandos para gestionar sorteos', inline: true },
                    { name: '🔧 Utilidad', value: 'Comandos útiles varios', inline: true },
                    { name: '🛡️ Moderación', value: 'Herramientas de moderación', inline: true },
                    { name: '⚙️ Configuración', value: 'Ajustes del bot', inline: true },
                    { name: '📋 Requisitos', value: 'Roles y permisos necesarios', inline: true },
                    { name: '📊 Sistema', value: 'Info del sistema de sorteos', inline: true },
                ]
            },
            'sorteos': {
                title: '🎉 Comandos de Sorteos',
                description: 'Comandos para crear y gestionar sorteos en tu servidor',
                fields: [
                    { name: '</sorteo:0>', value: 'Inicia un nuevo sorteo con categorías personalizadas' },
                    { name: '`a!gstart <tiempo> <ganadores> <premio>`', value: 'Inicia un nuevo sorteo\n• Requiere rol "Giveways"\n• Ejemplo: `a!gstart 24h 1 Nitro`' },
                    { name: '`a!gend`', value: 'Finaliza un sorteo activo manualmente\n• Requiere rol "Giveways"' },
                    { name: '`a!greroll [ID del sorteo]`', value: 'Vuelve a elegir un ganador\n• Requiere rol "Giveways"\n• El ID del sorteo es opcional - si no se proporciona, usa el último sorteo finalizado' },
                    { name: '`a!timedif [ID mensaje 1] [ID mensaje 2]`', value: 'Muestra la diferencia de tiempo entre dos mensajes\n• Si solo se proporciona un ID, compara con el último mensaje de victoria' },
                    { name: '`a!alwinmsg [set|get] [mensaje]`', value: 'Configura el mensaje de victoria para sorteos' }
                ]
            },
            'alwinmsg': {
                title: '🏆 Variables de Mensaje de Victoria',
                description: 'Variables disponibles para personalizar mensajes de victoria con `a!alwinmsg`',
                fields: [
                    { name: '`{claim_time}`', value: 'Tiempo de reclamo' },
                    { name: '`{host(username)}`', value: 'Nombre del anfitrión' },
                    { name: '`{host(mention)}`', value: 'Mención del anfitrión' },
                    { name: '`{winner(username)}`', value: 'Nombre del ganador' },
                    { name: '`{winner(mention)}`', value: 'Mención del ganador' },
                    { name: '`{winner (created_age)}`', value: 'Edad de la cuenta' },
                    { name: '`{winner (created_date)}`', value: 'Fecha de creación' },
                    { name: '`{winner (joined_age)}`', value: 'Tiempo en el servidor' },
                    { name: '`{winner (joined_date)}`', value: 'Fecha de ingreso' }
                ]
            },
            'utilidad': {
                title: '🔧 Comandos de Utilidad',
                description: 'Comandos útiles para el servidor',
                fields: [
                    { name: '`a!steal`', value: 'Roba emojis o stickers para añadirlos al servidor' },
                    { name: '`a!ui [@usuario|ID]`', value: 'Muestra información detallada sobre un usuario\n• Puedes mencionar al usuario o usar su ID\n• También funciona respondiendo a mensajes con menciones' },
                    { name: '`a!snipe`', value: 'Muestra los últimos mensajes eliminados en un canal\n• Incluye botones para ver más mensajes (10-20, 30-50, 50-100)' }
                ]
            },
            'moderacion': {
                title: '🛡️ Comandos de Moderación',
                description: 'Herramientas para moderar el servidor',
                fields: [
                    { name: '`a!nuke`', value: 'Clona y recrea el canal actual, eliminando todo su contenido\n• Requiere permiso "Gestionar Canales"\n• Incluye confirmación para evitar eliminaciones accidentales' }
                ]
            },
            'configuracion': {
                title: '⚙️ Configuración',
                description: 'Comandos para configurar el bot',
                fields: [
                    { name: '`a!config`', value: 'Gestiona la configuración del bot\n• Permite establecer diferentes tiempos de reclamo para:\n  - Roles específicos del servidor\n  - @everyone (aplica a todos los usuarios)\n• Se aplica el tiempo más largo que corresponda al usuario dependiendo de su rol' }
                ]
            },
            'requisitos': {
                title: '📋 Requisitos y Permisos',
                description: 'Roles y permisos necesarios para usar los comandos',
                fields: [
                    { name: 'Rol "Giveways"', value: 'Necesario para: `a!gstart`, `a!gend`, `a!greroll`, `/sorteo`' },
                    { name: 'Permiso "Gestionar Canales"', value: 'Necesario para: `a!nuke`' },
                    { name: 'Permiso "Administrador"', value: 'Necesario para: `a!alwinmsg`, `a!config`' }
                ]
            },
            'sistema': {
                title: '📊 Sistema de Sorteos',
                description: 'Características del sistema de sorteos',
                fields: [
                    { name: 'Formato de Tiempos', value: 'Los tiempos deben especificarse en formato:\n• `s` - segundos\n• `m` - minutos\n• `h` - horas' }
                ]
            }
        };

        // Función para obtener un embed según la categoría
        function getCategoryEmbed(category) {
            const categoryData = helpCategories[category];
            const embed = new EmbedBuilder()
                .setTitle(categoryData.title)
                .setDescription(categoryData.description)
                .setColor('#5865F2') // Color de Discord
                .setTimestamp();

            // Añadir campos al embed
            categoryData.fields.forEach(field => {
                embed.addFields({
                    name: field.name,
                    value: field.value,
                    inline: field.inline || false
                });
            });

            return embed;
        }

        // Creamos los botones de navegación
        function getNavigationButtons(currentCategory) {
            const row1 = new ActionRowBuilder();
            const row2 = new ActionRowBuilder();
            
            // Primera fila de botones
            row1.addComponents(
                new ButtonBuilder()
                    .setCustomId('help_main')
                    .setLabel('Menú Principal')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentCategory === 'main'),
                new ButtonBuilder()
                    .setCustomId('help_sorteos')
                    .setLabel('Sorteos')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🎉')
                    .setDisabled(currentCategory === 'sorteos'),
                new ButtonBuilder()
                    .setCustomId('help_alwinmsg')
                    .setLabel('Mensaje Victoria')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🏆')
                    .setDisabled(currentCategory === 'alwinmsg'),
                new ButtonBuilder()
                    .setCustomId('help_utilidad')
                    .setLabel('Utilidad')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔧')
                    .setDisabled(currentCategory === 'utilidad')
            );
            
            // Segunda fila de botones
            row2.addComponents(
                new ButtonBuilder()
                    .setCustomId('help_moderacion')
                    .setLabel('Moderación')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🛡️')
                    .setDisabled(currentCategory === 'moderacion'),
                new ButtonBuilder()
                    .setCustomId('help_configuracion')
                    .setLabel('Configuración')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⚙️')
                    .setDisabled(currentCategory === 'configuracion'),
                new ButtonBuilder()
                    .setCustomId('help_requisitos')
                    .setLabel('Requisitos')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📋')
                    .setDisabled(currentCategory === 'requisitos'),
                new ButtonBuilder()
                    .setCustomId('help_sistema')
                    .setLabel('Sistema')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📊')
                    .setDisabled(currentCategory === 'sistema')
            );
            
            return [row1, row2];
        }

        // Enviar mensaje inicial con el menú principal
        const initialEmbed = getCategoryEmbed('main');
        const initialButtons = getNavigationButtons('main');
        
        const response = await interaction.reply({ 
            embeds: [initialEmbed], 
            components: initialButtons,
            ephemeral: true,
            fetchReply: true
        });

        // Crear collector para manejar interacciones con botones
        const filter = i => i.customId.startsWith('help_') && i.user.id === interaction.user.id;
        const collector = response.createMessageComponentCollector({ filter, time: 300000 }); // 5 minutos
        
        collector.on('collect', async i => {
            const category = i.customId.replace('help_', '');
            const newEmbed = getCategoryEmbed(category);
            const newButtons = getNavigationButtons(category);
            
            await i.update({ embeds: [newEmbed], components: newButtons });
        });
        
        collector.on('end', async () => {
            // Desactivar todos los botones cuando expire el tiempo
            const disabledButtons = initialButtons.map(row => {
                const newRow = new ActionRowBuilder();
                row.components.forEach(button => {
                    newRow.addComponents(
                        ButtonBuilder.from(button).setDisabled(true)
                    );
                });
                return newRow;
            });
            
            await interaction.editReply({ 
                components: disabledButtons,
                content: 'Este menú de ayuda ha expirado. Usa `/help` nuevamente para ver los comandos disponibles.'
            }).catch(() => {});
        });
    },
}; 