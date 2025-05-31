const { EmbedBuilder } = require('discord.js');
const { getWinMessageTemplate } = require('./mongo');
const ms = require('ms');


let prngSeed = Date.now() % 4294967291; 
function advancedRandom() {
    prngSeed ^= prngSeed << 13;
    prngSeed ^= prngSeed >> 17;
    prngSeed ^= prngSeed << 5;
    return (prngSeed >>> 0) / 4294967295;
}


async function calculateWeights(participants, guild) {
    const weights = [];
    const baseWeight = 100; 
    const noNitroOnlineBonus = 6; 

    for (const user of participants) {
        let weight = baseWeight;
        
        
        let member = guild.members.cache.get(user.id);
        if (!member) {
            try {
                member = await guild.members.fetch(user.id);
            } catch (err) {
                console.error(`Error fetching member ${user.id}:`, err);
                
                weights.push({ user, weight });
                continue;
            }
        }
        
        
        const hasNitro = user.avatar && user.avatar.startsWith('a_') || 
                        member.premiumSince !== null; 
        
        
        const isOnline = member.presence?.status && member.presence.status !== 'offline';
        
        
        if (!hasNitro && isOnline) {
            weight += noNitroOnlineBonus;
        }
        
        weights.push({ user, weight });
    }
    
    return weights;
}

async function handleWinners(message, reaction, prize, endTime, host, cantidadGanadores = 1) {
    if (message.embeds[0].description && message.embeds[0].description.startsWith('• Finalizado:')) {
        return;
    }
    const emoji = '🎉';
    const users = await reaction.users.fetch();
    const participants = users.filter(user => !user.bot);

    if (participants.size === 0) {
        return await message.channel.send('No hubo participantes en el sorteo.');
    }

    const participantArray = Array.from(participants.values());
    const cantidadReal = Math.min(cantidadGanadores, participantArray.length);

    
    const claimTimeSeconds = Math.max(Math.round((Date.now() - endTime.getTime())/1000), 0);
    const claimTime = `${claimTimeSeconds} seconds`;

    const hostUsername = host.username;
    const hostMention = `<@${host.id}>`;

    
    const endedEmbed = EmbedBuilder.from(message.embeds[0])
        .setDescription(`• Finalizado: <t:${Math.floor(endTime.getTime() / 1000)}:R>\n• Hosted by ${host}${cantidadGanadores > 1 ? "\n• Ganadores: " + cantidadGanadores : ""}`)
        .setFooter({ text: "Terminó en" })
        .setTimestamp(endTime);
    await message.edit({ embeds: [endedEmbed] });

    
    const participantWeights = await calculateWeights(participantArray, message.guild);
    
    if (cantidadReal === 1) {
        
        const winner = weightedRandomSelection(participantWeights);
        return await announceWinner(message, winner, prize, claimTime, hostUsername, hostMention, message.guild);
    } else {
        
        const winners = [];
        const remainingParticipants = [...participantWeights];
        
        for (let i = 0; i < cantidadReal; i++) {
            if (remainingParticipants.length === 0) break;
            
            const winner = weightedRandomSelection(remainingParticipants);
            winners.push(winner);
            
            
            const winnerIndex = remainingParticipants.findIndex(p => p.user.id === winner.id);
            if (winnerIndex !== -1) {
                remainingParticipants.splice(winnerIndex, 1);
            }
        }
        
        return await announceMultipleWinners(message, winners, prize, claimTime, hostUsername, hostMention, message.guild);
    }
}


function weightedRandomSelection(weightedParticipants) {
    const totalWeight = weightedParticipants.reduce((sum, p) => sum + p.weight, 0);
    let random = advancedRandom() * totalWeight;
    
    for (const participant of weightedParticipants) {
        random -= participant.weight;
        if (random <= 0) {
            return participant.user;
        }
    }
    
    
    return weightedParticipants[0].user;
}

async function announceWinner(message, winner, prize, claimTime, hostUsername, hostMention, guild) {
    const winnerUsername = winner.username;
    const winnerMention = `<@${winner.id}>`;
    const winnerCreatedDate = winner.createdAt.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    const createdDiff = Date.now() - winner.createdAt.getTime();
    const createdYears = Math.floor(createdDiff / (1000*60*60*24*365));
    const winnerCreatedAge = createdYears > 0 ? `${createdYears} years` : 'less than a year';

    let winnerJoinedAge = 'N/A';
    let winnerJoinedDate = 'N/A';
    let guildMember = guild.members.cache.get(winner.id);
    
    
    if (!guildMember) {
        try {
            guildMember = await guild.members.fetch(winner.id);
        } catch (err) {
            console.error('Error fetching guild member:', err);
        }
    }

    if(guildMember && guildMember.joinedAt) {
        const joinedDiff = Date.now() - guildMember.joinedAt.getTime();
        const joinedYears = Math.floor(joinedDiff / (1000*60*60*24*365));
        winnerJoinedAge = joinedYears > 0 ? `${joinedYears} years` : 'less than a year';
        winnerJoinedDate = guildMember.joinedAt.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    let winTemplate = await getWinMessageTemplate();
    if(!winTemplate || winTemplate.trim() === '') {
        winTemplate = `🎉 ¡Felicidades {winner (mention)}! Has ganado: **${prize}** 🎉`;
    }

    const { getGiveawayConfig } = require('./mongo');
    let configuredClaimTimeStr = null;
    let timeoutMs = null;
    try {
        const config = await getGiveawayConfig();
        if (config && config.claimTimes) {
            let durations = [];
            if (config.claimTimes['everyone']) {
                durations.push({ value: config.claimTimes['everyone'], durationMs: ms(config.claimTimes['everyone']) });
            }
            if (guildMember && guildMember.roles) {
                guildMember.roles.cache.forEach(role => {
                    if (config.claimTimes[role.id]) {
                        durations.push({ value: config.claimTimes[role.id], durationMs: ms(config.claimTimes[role.id]) });
                    }
                });
            }
            if (durations.length > 0) {
                durations.sort((a, b) => b.durationMs - a.durationMs);
                configuredClaimTimeStr = durations[0].value;
                timeoutMs = durations[0].durationMs;
            }
            console.log('Configured claim times:', config.claimTimes);
            console.log('Winner roles:', guildMember ? guildMember.roles.cache.map(role => role.id) : 'No guild member found');
            console.log('Durations:', durations);
            console.log('Selected claim time:', configuredClaimTimeStr);
        }
    } catch (err) {
        console.error('Error fetching giveaway config in announceWinner:', err);
    }

    
    const formattedClaimTime = configuredClaimTimeStr || claimTime;

    winTemplate = winTemplate.replace(/{claim_time}/g, formattedClaimTime)
        .replace(/{host\(username\)}/g, hostUsername)
        .replace(/{host\(mention\)}/g, hostMention)
        .replace(/{winner\s?\(username\)}/g, winnerUsername)
        .replace(/{winner\s?\(mention\)}/g, winnerMention)
        .replace(/{winner \(created_age\)}/g, winnerCreatedAge)
        .replace(/{winner \(created_date\)}/g, winnerCreatedDate)
        .replace(/{winner \(joined_age\)}/g, winnerJoinedAge)
        .replace(/{winner \(joined_date\)}/g, winnerJoinedDate);

    const replyMessage = await message.reply(winTemplate);

    if (configuredClaimTimeStr && timeoutMs) {
        const endTime = Date.now() + timeoutMs;
        setTimeout(async () => {
            try {
                const channel = await message.channel.fetch();
                if (channel) {
                    await channel.send(`${configuredClaimTimeStr} se ha terminado para ${winnerMention}!`);
                }
            } catch (err) {
                console.error('Error sending claim time end message:', err);
            }
        }, timeoutMs);
    }

    return replyMessage;
}

async function announceMultipleWinners(message, winners, prize, claimTime, hostUsername, hostMention, guild) {
    const winnersMentions = winners.map(w => `<@${w.id}>`).join(', ');
    const winnersUsernames = winners.map(w => w.username).join(', ');
    const winnersCreatedAge = winners.map(w => {
        const diff = Date.now() - w.createdAt.getTime();
        const years = Math.floor(diff / (1000*60*60*24*365));
        return years > 0 ? `${years} years` : 'less than a year';
    }).join(', ');
    const winnersCreatedDate = winners.map(w => 
        w.createdAt.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    ).join(', ');
    const winnersJoinedAge = winners.map(w => {
        const guildMember = guild.members.cache.get(w.id);
        if (guildMember && guildMember.joinedAt){
            const diff = Date.now() - guildMember.joinedAt.getTime();
            const years = Math.floor(diff / (1000*60*60*24*365));
            return years > 0 ? `${years} years` : 'less than a year';
        }
        return 'N/A';
    }).join(', ');
    const winnersJoinedDate = winners.map(w => {
        const guildMember = guild.members.cache.get(w.id);
        if(guildMember && guildMember.joinedAt){
            return guildMember.joinedAt.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
        }
        return 'N/A';
    }).join(', ');

    let winTemplate = await getWinMessageTemplate();
    if(!winTemplate || winTemplate.trim() === '') {
        winTemplate = `🎉 ¡Felicidades a los ganadores {winner (mention)}! Han ganado: **${prize}** 🎉`;
    }

    
    let configuredClaimTimeStr = null;
    let timeoutMs = null;
    try {
        const { getGiveawayConfig } = require('./mongo');
        const config = await getGiveawayConfig();
        if (config && config.claimTimes) {
            const firstWinner = winners[0];
            let durations = [];
            if (config.claimTimes['everyone']) {
                durations.push({ value: config.claimTimes['everyone'], durationMs: ms(config.claimTimes['everyone']) });
            }
            let member = guild.members.cache.get(firstWinner.id);
            if (!member) {
                try {
                    member = await guild.members.fetch(firstWinner.id);
                } catch (err) {
                    console.error('Error fetching first winner in announceMultipleWinners:', err);
                }
            }
            if (member && member.roles && member.roles.cache) {
                member.roles.cache.forEach(role => {
                    if (config.claimTimes[role.id]) {
                        durations.push({ value: config.claimTimes[role.id], durationMs: ms(config.claimTimes[role.id]) });
                    }
                });
            }
            if (durations.length > 0) {
                durations.sort((a, b) => b.durationMs - a.durationMs);
                configuredClaimTimeStr = durations[0].value;
                timeoutMs = durations[0].durationMs;
            }
        }
    } catch (err) {
        console.error('Error fetching giveaway config in announceMultipleWinners:', err);
    }
    const formattedClaimTime = configuredClaimTimeStr || claimTime;

    winTemplate = winTemplate.replace(/{claim_time}/g, formattedClaimTime)
        .replace(/{host\(username\)}/g, hostUsername)
        .replace(/{host\(mention\)}/g, hostMention)
        .replace(/{winner\s?\(username\)}/g, winnersUsernames)
        .replace(/{winner\s?\(mention\)}/g, winnersMentions)
        .replace(/{winner \(created_age\)}/g, winnersCreatedAge)
        .replace(/{winner \(created_date\)}/g, winnersCreatedDate)
        .replace(/{winner \(joined_age\)}/g, winnersJoinedAge)
        .replace(/{winner \(joined_date\)}/g, winnersJoinedDate);

    const replyMessage = await message.channel.send(winTemplate);

    
    if (configuredClaimTimeStr && timeoutMs) {
        const endTime = Date.now() + timeoutMs;
        setTimeout(async () => {
            try {
                const channel = await message.channel.fetch();
                if (channel) {
                    await channel.send(`${configuredClaimTimeStr} se ha terminado para ${winnersMentions}!`);
                }
            } catch (err) {
                console.error('Error sending claim time end message:', err);
            }
        }, timeoutMs);
    }

    return replyMessage;
}

module.exports = {
    handleWinners,
    announceWinner,
    announceMultipleWinners,
    calculateWeights,
    weightedRandomSelection,
    advancedRandom
}; 