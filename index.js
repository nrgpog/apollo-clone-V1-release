const {
    Client,
    GatewayIntentBits,
    Collection,
    REST,
    Routes,
    Partials,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const { handleWinners } = require('./utils/giveawayUtils');


process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
});
process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping
    ],
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.User,
        Partials.GuildMember
    ]
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands"); 

if (!fs.existsSync(commandsPath)) {
    fs.mkdirSync(commandsPath, { recursive: true });
}

const eventsPath = path.join(__dirname, "events");
const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    event(client);
}

async function deployCommands() {
    try {
        console.log("Iniciando registro de comandos slash...");

        const commands = [];
        const commandFiles = fs
            .readdirSync(commandsPath)
            .filter((file) => file.endsWith(".js"));

        for (const file of commandFiles) {
            const command = require(`./commands/${file}`);
            commands.push(command.data.toJSON());
            client.commands.set(command.data.name, command);
        }

        const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
            body: commands,
        });

        console.log("Comandos slash registrados exitosamente");
    } catch (error) {
        console.error("Error al registrar comandos:", error);
    }
}

async function recoverActiveGiveaways(client) {
    try {
        console.log('Starting giveaway recovery...');

        const guilds = await client.guilds.fetch();
        

        await Promise.all([...guilds.values()].map(async (guildData) => {
            const guild = await guildData.fetch();
            const channels = await guild.channels.fetch();

            const textChannels = [...channels.values()].filter(channel => channel?.isTextBased());
            
            await Promise.all(textChannels.map(async (channel) => {
                try {
   
                    const messages = await channel.messages.fetch({ limit: 100 });
                    
           
                    const giveawayMessages = messages.filter(msg => 
                        msg.author.id === client.user.id && 
                        msg.content.includes('🎉 GIVEAWAY 🎉') &&
                        msg.embeds.length > 0 &&
                        msg.embeds[0].description &&
                        !msg.embeds[0].description.startsWith('• Finalizado:')
                    );
                    
           
                    await Promise.all([...giveawayMessages.values()].map(async (giveawayMessage) => {
                        const embed = giveawayMessage.embeds[0];
                        
              
                        const timeMatch = embed.description.match(/<t:(\d+):R>/);
                        if (!timeMatch) return;
                        
                        const endTime = new Date(parseInt(timeMatch[1]) * 1000);
                        const now = Date.now();
                      
                        if (endTime.getTime() <= now) return;
                        
                     
                        const timeLeft = endTime.getTime() - now;
                        
                    
                        const prize = embed.author.name;
                        
                       
                        const winnerCountMatch = giveawayMessage.content.match(/Ganadores: (\d+)/);
                        const cantidadGanadores = winnerCountMatch ? parseInt(winnerCountMatch[1]) : 1;
                        
                      
                        const hostMatch = embed.description.match(/Hosted by (.+?)(\n|$)/);
                        const hostStr = hostMatch ? hostMatch[1].trim() : null;
                        let host;
                        if (hostStr) {
                            const hostId = hostStr.match(/<@!?(\d+)>/)?.[1];
                            if (hostId) {
                                host = await client.users.fetch(hostId).catch(() => null);
                            }
                        }
                        
                      
                        setTimeout(async () => {
                            try {
                                const fetchedMessage = await giveawayMessage.fetch();
                                const reaction = fetchedMessage.reactions.cache.get('🎉');
                                if (!reaction) return;
                                
                                await handleWinners(
                                    fetchedMessage,
                                    reaction,
                                    prize,
                                    endTime,
                                    host || client.user,
                                    cantidadGanadores
                                );
                            } catch (error) {
                                console.error('Error handling recovered giveaway:', error);
                            }
                        }, timeLeft);
                        
                        console.log(`Recovered giveaway in ${guild.name} - ${channel.name} ending in ${timeLeft}ms`);
                    }));
                } catch (error) {
                    console.error(`Error processing channel ${channel.id}:`, error);
                }
            }));
        }));
        
        console.log('Giveaway recovery completed!');
    } catch (error) {
        console.error('Error recovering giveaways:', error);
    }
}


client.once("ready", async () => {
    console.log(`Bot listo como ${client.user.tag}`);
    await deployCommands();
    await recoverActiveGiveaways(client);
});

client.on("interactionCreate", async (interaction) => {
    try {
        if (interaction.isCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                try {
                    const reply = {
                        content: "Hubo un error al ejecutar este comando.",
                        ephemeral: true,
                    };

                    if (interaction.deferred || interaction.replied) {
                        await interaction.editReply(reply);
                    } else {
                        await interaction.reply(reply);
                    }
                } catch (replyError) {
                    console.error(
                        "Error al enviar respuesta de error:",
                        replyError,
                    );
                }
            }
        }
    } catch (error) {
        console.error('Error en el manejador de interacciones:', error);
    }
});

client.login(process.env.TOKEN);