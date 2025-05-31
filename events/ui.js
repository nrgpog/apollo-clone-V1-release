const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = (client) => {
  client.on('messageCreate', async (message) => {
    
    if (message.author.bot) return;
    
    
    if (!message.content.toLowerCase().startsWith('a!ui')) return;

    
    if (message.reference) {
      try {
        const referencedMessage = await message.fetchReference();
        if (referencedMessage && referencedMessage.author.id === '899899858981371935') {
          let contentText = '';
          if (referencedMessage.embeds && referencedMessage.embeds.length > 0 && referencedMessage.embeds[0].description) {
            contentText = referencedMessage.embeds[0].description;
          } else {
            contentText = referencedMessage.content;
          }
          const regex = /<@([^>]+)>/g;
          const userIds = [];
          let match;
          while ((match = regex.exec(contentText)) !== null) {
            userIds.push(match[1]);
          }
          if (userIds.length === 0) {
            return message.reply('No se encontraron usuarios en el mensaje referenciado.');
          }
          let currentIndex = 0;
          const buildEmbedForUser = async (userId) => {
            try {
              const fetchedUser = await client.users.fetch(userId);
              let badges = [];
              if (fetchedUser.flags) {
                badges = fetchedUser.flags.toArray();
              }
              const badgesText = badges.length > 0 ? badges.join(', ') : 'Ninguno';
              const createdAt = fetchedUser.createdAt;
              const createdTimestamp = Math.floor(createdAt.getTime() / 1000);
              let member = null;
              if (message.guild) {
                member = message.guild.members.cache.get(userId) || await message.guild.members.fetch(userId).catch(() => null);
              }
              let joinField = { name: 'Se unió', value: 'No disponible', inline: false };
              if (member && member.joinedAt) {
                const joinedAt = member.joinedAt;
                const joinedTimestamp = Math.floor(joinedAt.getTime() / 1000);
                joinField = { name: 'Se unió', value: `<t:${joinedTimestamp}:R> (<t:${joinedTimestamp}:F>)`, inline: false };
              }
              let boosterField = null;
              if (member && member.premiumSince) {
                const premiumTimestamp = Math.floor(member.premiumSince.getTime() / 1000);
                boosterField = { name: 'Booster', value: `Boosting desde: <t:${premiumTimestamp}:R> (<t:${premiumTimestamp}:F>)`, inline: false };
              }
              let embedColor = 0x0099ff;
              if (member && member.roles.highest.color) {
                embedColor = member.roles.highest.color;
              }
              const embed = new EmbedBuilder()
                .setColor(embedColor)
                .setAuthor({
                  name: fetchedUser.username,
                  iconURL: fetchedUser.displayAvatarURL({ dynamic: true })
                })
                .setThumbnail(fetchedUser.displayAvatarURL({ dynamic: true, size: 1024 }))
                .addFields(
                  { name: 'Información del Usuario', value: `<@${userId}>`, inline: true },
                  { name: 'Insignias', value: badgesText, inline: true },
                  { name: 'Información de la Cuenta', value: `Creada: <t:${createdTimestamp}:R> (<t:${createdTimestamp}:F>)`, inline: false },
                  joinField,
                  { name: 'ID de Usuario', value: userId, inline: true }
                );
              if (boosterField) {
                embed.addFields(boosterField);
              }
              embed.setFooter({ text: `Usuario ${currentIndex + 1} de ${userIds.length}` });
              return embed;
            } catch (error) {
              console.error('Error fetching user:', error);
              return new EmbedBuilder().setDescription('Error al obtener información del usuario.');
            }
          };

          const buildActionRow = (currentIndex) => {
            return new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('prev')
                .setLabel('Anterior')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentIndex === 0),
              new ButtonBuilder()
                .setCustomId('next')
                .setLabel('Siguiente')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentIndex === userIds.length - 1)
            );
          };

          const initialEmbed = await buildEmbedForUser(userIds[currentIndex]);
          const actionRow = buildActionRow(currentIndex);
          const uiMessage = await message.channel.send({ embeds: [initialEmbed], components: [actionRow] });

          const filter = (interaction) => interaction.isButton() && interaction.user.id === message.author.id;
          const collector = uiMessage.createMessageComponentCollector({ filter, time:60000 });
          collector.on('collect', async (interaction) => {
            if (interaction.customId === 'prev') {
              currentIndex = currentIndex > 0 ? currentIndex - 1 : 0;
            } else if (interaction.customId === 'next') {
              currentIndex = currentIndex < userIds.length - 1 ? currentIndex + 1 : currentIndex;
            }
            const newEmbed = await buildEmbedForUser(userIds[currentIndex]);
            const newRow = buildActionRow(currentIndex);
            await interaction.update({ embeds: [newEmbed], components: [newRow] });
          });
          collector.on('end', async () => {
            const disabledRow = buildActionRow(currentIndex);
            disabledRow.components.forEach((comp) => comp.setDisabled(true));
            await uiMessage.edit({ components: [disabledRow] });
          });
          return;
        }
      } catch (err) {
        console.error('Error processing referenced message:', err);
      }
    }

    
    const args = message.content.slice('a!ui'.length).trim().split(/ +/);
    let targetUser;

    
    if (args[0]) {
      
      targetUser = message.mentions.users.first();
      
      
      if (!targetUser) {
        try {
          targetUser = await client.users.fetch(args[0]);
        } catch (error) {
          return message.reply('Por favor, proporciona una mención válida (@usuario) o un ID de usuario válido.');
        }
      }
    } else {
      return message.reply('Debes mencionar a un usuario o proporcionar un ID. Ejemplo: a!ui @usuario o a!ui 123456789');
    }

    let member = null;
    if (message.guild) {
      member = message.guild.members.cache.get(targetUser.id) || await message.guild.members.fetch(targetUser.id).catch(() => null);
    }

    let badges = [];
    try {
      const fetchedUser = await client.users.fetch(targetUser.id);
      if (fetchedUser.flags) {
        badges = fetchedUser.flags.toArray();
      }
    } catch (error) {
      console.error('Error fetching user flags:', error);
    }

    const badgesText = badges.length > 0 ? badges.join(', ') : 'Ninguno';
    const createdAt = targetUser.createdAt;
    const createdTimestamp = Math.floor(createdAt.getTime() / 1000);

    let joinField = { name: 'Se unió', value: 'No disponible', inline: false };
    if (member && member.joinedAt) {
      const joinedAt = member.joinedAt;
      const joinedTimestamp = Math.floor(joinedAt.getTime() / 1000);
      joinField = { name: 'Se unió', value: `<t:${joinedTimestamp}:R> (<t:${joinedTimestamp}:F>)`, inline: false };
    }

    let boosterField = null;
    if (member && member.premiumSince) {
      const premiumTimestamp = Math.floor(member.premiumSince.getTime() / 1000);
      boosterField = { name: 'Booster', value: `Boosting desde: <t:${premiumTimestamp}:R> (<t:${premiumTimestamp}:F>)`, inline: false };
    }
    let embedColor = 0x0099ff;
    if (member && member.roles.highest.color) {
      embedColor = member.roles.highest.color;
    }

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setAuthor({
        name: targetUser.username,
        iconURL: targetUser.displayAvatarURL({ dynamic: true })
      })
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 1024 }))
      .addFields(
        { name: 'Información del Usuario', value: `<@${targetUser.id}>`, inline: true },
        { name: 'Insignias', value: badgesText, inline: true },
        { name: 'Información de la Cuenta', value: `Creada: <t:${createdTimestamp}:R> (<t:${createdTimestamp}:F>)`, inline: false },
        joinField,
        { name: 'ID de Usuario', value: targetUser.id, inline: true }
      );

    if (boosterField) {
      embed.addFields(boosterField);
    }

    return message.channel.send({ embeds: [embed] });
  });
}; 