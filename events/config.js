const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = (client) => {
    
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        if (!message.content.toLowerCase().startsWith('a!config')) return;
        if (!message.member.permissions.has(8n)) {
            return message.reply('Solo los administradores pueden usar este comando.');
          }

        const { getGiveawayConfig } = require('../utils/mongo');
        let config = await getGiveawayConfig();
        let embed;
        if (!config || !config.claimTimes || Object.keys(config.claimTimes).length === 0) {
            embed = new EmbedBuilder()
                .setTitle('Configuración de Claim Time')
                .setDescription('No hay configuración establecida.');
        } else {
            let desc = '';
            for (const [roleId, time] of Object.entries(config.claimTimes)) {
                let roleName;
                if (roleId === 'everyone') {
                    roleName = '@everyone';
                } else {
                    const role = message.guild.roles.cache.get(roleId);
                    roleName = role ? role.name : 'Rol desconocido';
                }
                desc += `${roleName}: ${time}\n`;
            }
            embed = new EmbedBuilder()
                .setTitle('Configuración de Claim Time')
                .setDescription(desc);
        }
        const button = new ButtonBuilder()
            .setCustomId(`config_claimtime_${message.author.id}`)
            .setLabel('Claimtime')
            .setStyle('Primary');
        const row = new ActionRowBuilder().addComponents(button);
        message.reply({ embeds: [embed], components: [row] });
    });
    
    
    client.on('interactionCreate', async (interaction) => {
        
        if (interaction.isButton() && interaction.customId.startsWith('config_claimtime_')) {
            const allowedUserId = interaction.customId.split('_').pop();
            if (interaction.user.id !== allowedUserId) {
                return interaction.reply({ content: 'No puedes utilizar este botón', ephemeral: true });
            }
            
            
            const allRoleOptions = [];
            interaction.guild.roles.cache.forEach(role => {
                if (role.id !== interaction.guild.id) {
                    allRoleOptions.push({
                        label: role.name,
                        value: role.id
                    });
                }
            });
            
            
            const pageSize = 24; 
            const totalPages = Math.ceil(allRoleOptions.length / pageSize) || 1;
            const page = 0; 
            const sliceOptions = allRoleOptions.slice(page * pageSize, (page + 1) * pageSize);
            const options = [
                {
                    label: '@everyone',
                    value: 'everyone'
                },
                ...sliceOptions
            ];
            
            
            const menu = new StringSelectMenuBuilder()
                .setCustomId(`select_claimtime_roles_${page}`)
                .setPlaceholder(`Selecciona roles (página ${page + 1} de ${totalPages}) (máximo 5)`)
                .setMinValues(1)
                .setMaxValues(Math.min(options.length, 5))
                .addOptions(options);
            
            
            const prevButton = new ButtonBuilder()
                .setCustomId(`roles_page_prev_${page}`)
                .setLabel('Anterior')
                .setStyle('Secondary')
                .setDisabled(true);
            const nextButton = new ButtonBuilder()
                .setCustomId(`roles_page_next_${page}`)
                .setLabel('Siguiente')
                .setStyle('Secondary')
                .setDisabled(totalPages <= 1);
            
            const selectRow = new ActionRowBuilder().addComponents(menu);
            const buttonsRow = new ActionRowBuilder().addComponents(prevButton, nextButton);
            
            await interaction.reply({ content: 'Selecciona los roles a configurar claimtime:', components: [selectRow, buttonsRow], ephemeral: true });
        }
        
        
        else if (interaction.isButton() && (interaction.customId.startsWith('roles_page_prev_') || interaction.customId.startsWith('roles_page_next_'))) {
            const parts = interaction.customId.split('_');
            let currentPage = parseInt(parts[3]);
            let newPage = currentPage;
            if (interaction.customId.startsWith('roles_page_prev_')) {
                newPage = currentPage - 1;
            } else if (interaction.customId.startsWith('roles_page_next_')) {
                newPage = currentPage + 1;
            }
            
            
            const allRoleOptions = [];
            interaction.guild.roles.cache.forEach(role => {
                if (role.id !== interaction.guild.id) {
                    allRoleOptions.push({
                        label: role.name,
                        value: role.id
                    });
                }
            });
            
            const pageSize = 24;
            const totalPages = Math.ceil(allRoleOptions.length / pageSize) || 1;
            const sliceOptions = allRoleOptions.slice(newPage * pageSize, (newPage + 1) * pageSize);
            const options = [
                {
                    label: '@everyone',
                    value: 'everyone'
                },
                ...sliceOptions
            ];
            
            const menu = new StringSelectMenuBuilder()
                .setCustomId(`select_claimtime_roles_${newPage}`)
                .setPlaceholder(`Selecciona roles (página ${newPage + 1} de ${totalPages}) (máximo 5)`)
                .setMinValues(1)
                .setMaxValues(Math.min(options.length, 5))
                .addOptions(options);
            
            const prevButton = new ButtonBuilder()
                .setCustomId(`roles_page_prev_${newPage}`)
                .setLabel('Anterior')
                .setStyle('Secondary')
                .setDisabled(newPage <= 0);
            const nextButton = new ButtonBuilder()
                .setCustomId(`roles_page_next_${newPage}`)
                .setLabel('Siguiente')
                .setStyle('Secondary')
                .setDisabled(newPage >= totalPages - 1);
            
            const selectRow = new ActionRowBuilder().addComponents(menu);
            const buttonsRow = new ActionRowBuilder().addComponents(prevButton, nextButton);
            
            await interaction.update({ content: 'Selecciona los roles a configurar claimtime:', components: [selectRow, buttonsRow] });
        }
        
        
        else if (interaction.isStringSelectMenu() && interaction.customId.startsWith('select_claimtime_roles_')) {
            const selectedRoles = interaction.values; 
            
            const modal = new ModalBuilder()
                .setCustomId('claimtime_modal_batch')
                .setTitle('Configurar Claim Times');
            
            selectedRoles.forEach(roleId => {
                let roleName = roleId === 'everyone' ? '@everyone' : (interaction.guild.roles.cache.get(roleId)?.name || 'Rol desconocido');
                const maxRoleNameLength = 45 - 'Claim Time para '.length;
                if (roleName.length > maxRoleNameLength) roleName = roleName.slice(0, maxRoleNameLength - 3) + '...';
                const input = new TextInputBuilder()
                    .setCustomId(`claimtime_input_${roleId}`)
                    .setLabel(`Claim Time para ${roleName}`)
                    .setPlaceholder('Ej: 10s, 5m, 2h')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                const actionRow = new ActionRowBuilder().addComponents(input);
                modal.addComponents(actionRow);
            });
            
            await interaction.showModal(modal);
            try {
                const modalSubmitted = await interaction.awaitModalSubmit({
                    filter: (i) => i.customId === 'claimtime_modal_batch' && i.user.id === interaction.user.id,
                    time: 60000
                });
                const claimTimes = {};
                let errorMessages = [];
                for (const roleId of selectedRoles) {
                    const inputValue = modalSubmitted.fields.getTextInputValue(`claimtime_input_${roleId}`).trim();
                    if (!/^\d+(s|m|h)$/.test(inputValue)) {
                        const roleName = roleId === 'everyone' ? '@everyone' : (interaction.guild.roles.cache.get(roleId)?.name || roleId);
                        errorMessages.push(`Formato inválido para ${roleName}.`);
                    } else {
                        claimTimes[roleId] = inputValue;
                    }
                }
                if (errorMessages.length > 0) {
                    await modalSubmitted.reply({ content: errorMessages.join(' '), ephemeral: true });
                    return;
                }
                
                const { getGiveawayConfig, setGiveawayConfig } = require('../utils/mongo');
                let currentConfig = await getGiveawayConfig();
                if (!currentConfig) currentConfig = {};
                currentConfig.claimTimes = { ...(currentConfig.claimTimes || {}), ...claimTimes };
                const updateResult = await setGiveawayConfig(currentConfig);
                if (updateResult) {
                    let replyMsg = 'Nueva configuración de Claim Time:\n';
                    for (const [roleId, time] of Object.entries(claimTimes)) {
                        const roleName = roleId === 'everyone' ? '@everyone' : (interaction.guild.roles.cache.get(roleId)?.name || roleId);
                        replyMsg += `${roleName}: ${time}\n`;
                    }
                    await modalSubmitted.reply({ content: replyMsg, ephemeral: true });
                } else {
                    await modalSubmitted.reply({ content: 'Hubo un error al actualizar la configuración.', ephemeral: true });
                }
            } catch (err) {
                console.error('Error en modal submission:', err);
            }
        }
    });
}; 