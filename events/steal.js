const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fetch = require('node-fetch');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');


const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}


const cleanAllTempFiles = () => {
    console.log("Limpiando TODOS los archivos temporales...");
    if (fs.existsSync(tempDir)) {
        try {
            const files = fs.readdirSync(tempDir);
            console.log(`Se encontraron ${files.length} archivos en el directorio temporal`);

            let countRemoved = 0;
            let countFailed = 0;

            files.forEach(file => {
                try {
                    const filePath = path.join(tempDir, file);
                    fs.unlinkSync(filePath);
                    countRemoved++;
                } catch (err) {
                    countFailed++;
                    console.error(`Error al eliminar archivo temporal ${file}:`, err);
                }
            });

            console.log(`Limpieza completa: ${countRemoved} archivos eliminados, ${countFailed} fallidos`);
        } catch (error) {
            console.error("Error al leer directorio temporal:", error);
        }
    }
};


cleanAllTempFiles();

module.exports = (client) => {
    
    client.once('ready', () => {
        console.log(`Bot ${client.user.tag} está listo, limpiando archivos temporales...`);
        cleanAllTempFiles();
    });

    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        if (!message.guild) return;

        
        if (!message.content.startsWith('a!steal')) return;

        
        const extractMediaUrl = async (msg) => {
            let mediaUrl = null;
            console.log("Analizando mensaje para extraer media:", {
                id: msg.id,
                contenido: msg.content.substring(0, 50),
                tieneAttachments: msg.attachments?.size > 0,
                tieneStickers: msg.stickers?.size > 0,
                tieneEmbeds: msg.embeds?.length > 0
            });

            
            if (msg.attachments && msg.attachments.size > 0) {
                for (const attachment of msg.attachments.values()) {
                    
                    const isImage = attachment.contentType?.startsWith('image/') ||
                        attachment.url.match(/\.(png|jpg|jpeg)(\?.*)?$/i);
                    const isGif = attachment.contentType === 'image/gif' ||
                        attachment.url.match(/\.gif(\?.*)?$/i);

                    console.log("Analizando attachment:", {
                        url: attachment.url,
                        contentType: attachment.contentType,
                        isImage: isImage,
                        isGif: isGif
                    });

                    if (attachment && (isImage || isGif)) {
                        console.log("Detectado archivo adjunto válido:", {
                            url: attachment.url,
                            contentType: attachment.contentType,
                            isGif: isGif
                        });
                        return { url: attachment.url, type: isGif ? 'gif' : 'attachment' };
                    }
                }
            }
            
            if (msg.stickers && msg.stickers.size > 0) {
                const sticker = msg.stickers.first();
                return { url: sticker.url || `https://media.discordapp.net/stickers/${sticker.id}.png`, type: 'sticker' };
            }
            
            const emojiMatch = msg.content.match(/<a?:(\w+):(\d+)>/);
            if (emojiMatch) {
                const animated = emojiMatch[0].startsWith('<a:');
                const emojiId = emojiMatch[2];
                return {
                    url: `https://cdn.discordapp.com/emojis/${emojiId}.${animated ? 'gif' : 'png'}`,
                    type: animated ? 'gif' : 'emoji'
                };
            }
            
            const args = msg.content.split(' ').slice(1);
            for (const arg of args) {
                console.log("Analizando argumento:", arg);

                
                if (arg.match(/https?:\/\/\S+\.(png|jpg|jpeg|gif)(\?.*)?$/i)) {
                    const isGif = arg.toLowerCase().includes('.gif');
                    console.log("URL directa detectada:", { url: arg, isGif });
                    return { url: arg, type: isGif ? 'gif' : 'url' };
                }

                
                if (arg.includes('tenor.com/view/')) {
                    console.log("Procesando URL de Tenor:", arg);
                    try {
                        
                        let gifId = null;

                        
                        const idMatch1 = arg.match(/tenor\.com\/view\/[^-]+-gif-(\d+)/);
                        
                        const idMatch2 = arg.match(/tenor\.com\/view\/[^-]+-[^-]+-[^-]+-gif-(\d+)/);
                        
                        const idMatch3 = arg.match(/tenor\.com\/view\/.*?-(\d+)$/);

                        if (idMatch1) gifId = idMatch1[1];
                        else if (idMatch2) gifId = idMatch2[1];
                        else if (idMatch3) gifId = idMatch3[1];

                        console.log("ID del GIF extraído de la URL:", gifId);

                        
                        if (gifId) {
                            
                            try {
                                const apiUrl = `https://tenor.googleapis.com/v2/posts?ids=${gifId}&key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&client_key=tenor_web`;
                                console.log("Intentando obtener datos de la API de Tenor:", apiUrl);

                                const apiResponse = await fetch(apiUrl);
                                if (apiResponse.ok) {
                                    const apiData = await apiResponse.json();
                                    console.log("Datos de API recibidos:", JSON.stringify(apiData).substring(0, 200) + "...");

                                    if (apiData.results && apiData.results.length > 0) {
                                        const result = apiData.results[0];
                                        if (result.media_formats) {
                                            
                                            if (result.media_formats.gif) {
                                                console.log("GIF encontrado en API:", result.media_formats.gif.url);
                                                return { url: result.media_formats.gif.url, type: 'gif' };
                                            }
                                            
                                            if (result.media_formats.mp4) {
                                                console.log("MP4 encontrado en API:", result.media_formats.mp4.url);
                                                return { url: result.media_formats.mp4.url, type: 'gif' };
                                            }
                                        }
                                    }
                                }
                            } catch (apiError) {
                                console.error("Error al usar la API de Tenor:", apiError);
                            }

                            
                            const possibleUrls = [
                                `https://media.tenor.com/${gifId}/tenor.gif`,
                                `https://c.tenor.com/${gifId}/tenor.gif`,
                                `https://media1.tenor.com/${gifId}/tenor.gif`,
                                `https://media.tenor.com/images/gif/${gifId}.gif`
                            ];

                            for (const url of possibleUrls) {
                                try {
                                    console.log("Intentando URL directa:", url);
                                    const directResponse = await fetch(url, { method: 'HEAD' });
                                    if (directResponse.ok) {
                                        console.log("URL directa verificada:", url);
                                        return { url, type: 'gif' };
                                    }
                                } catch (e) {
                                    console.log("Error al verificar URL directa:", e.message);
                                }
                            }
                        }

                        
                        const response = await fetch(arg, {
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                            }
                        });

                        if (response.ok) {
                            const html = await response.text();

                            
                            const scriptMatch = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);
                            if (scriptMatch && scriptMatch[1]) {
                                try {
                                    const jsonData = JSON.parse(scriptMatch[1]);
                                    if (jsonData.video && jsonData.video.contentUrl) {
                                        console.log("URL de video encontrada en JSON-LD:", jsonData.video.contentUrl);
                                        return { url: jsonData.video.contentUrl, type: 'gif' };
                                    }
                                } catch (e) {
                                    console.log("Error al parsear JSON-LD:", e.message);
                                }
                            }

                            
                            const shareDataMatch = html.match(/window\.TENOR_SHARE_DATA\s*=\s*({[^}]+})/);
                            if (shareDataMatch && shareDataMatch[1]) {
                                try {
                                    
                                    const shareDataStr = shareDataMatch[1].replace(/'/g, '"') + '}';
                                    const shareData = JSON.parse(shareDataStr);
                                    if (shareData.GifUrl) {
                                        console.log("URL de GIF encontrada en TENOR_SHARE_DATA:", shareData.GifUrl);
                                        return { url: shareData.GifUrl, type: 'gif' };
                                    }
                                } catch (e) {
                                    console.log("Error al parsear TENOR_SHARE_DATA:", e.message);
                                }
                            }

                            
                            const ogVideoMatch = html.match(/<meta property="og:video" content="([^"]+)"/);
                            if (ogVideoMatch && ogVideoMatch[1]) {
                                console.log("Encontrado video en og:video:", ogVideoMatch[1]);
                                return { url: ogVideoMatch[1], type: 'gif' };
                            }

                            const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
                            if (ogImageMatch && ogImageMatch[1]) {
                                const ogImage = ogImageMatch[1];
                                console.log("Imagen encontrada en og:image:", ogImage);

                                
                                const gifUrl = ogImage
                                    .replace(/\.png$|\.jpg$|\.jpeg$/, '.gif')
                                    .replace('/AAA/', '/gif/')
                                    .replace('/thumbnail/', '/gif/');

                                console.log("URL del GIF derivada de og:image:", gifUrl);
                                return { url: gifUrl, type: 'gif' };
                            }

                            
                            const urlParts = arg.split('/').pop().split('-');
                            const searchTerms = urlParts.filter(part => part !== 'gif' && !part.match(/^\d+$/));
                            console.log("Términos de búsqueda extraídos de la URL:", searchTerms);

                            
                            const gifPatterns = [
                                /https:\/\/media\.tenor\.com\/[^"]+\.gif/g,
                                /https:\/\/c\.tenor\.com\/[^"]+\.gif/g,
                                /https:\/\/media1\.tenor\.com\/[^"]+\.gif/g
                            ];

                            let allGifs = [];
                            for (const pattern of gifPatterns) {
                                const matches = html.match(pattern) || [];
                                allGifs = [...allGifs, ...matches];
                            }

                            console.log(`Encontrados ${allGifs.length} GIFs en la página`);

                            
                            allGifs = [...new Set(allGifs)];

                            
                            
                            const exactMatch = allGifs.find(gif =>
                                searchTerms.every(term =>
                                    gif.toLowerCase().includes(term.toLowerCase())
                                )
                            );

                            if (exactMatch) {
                                console.log("GIF encontrado con coincidencia exacta:", exactMatch);
                                return { url: exactMatch, type: 'gif' };
                            }

                            
                            for (const term of searchTerms) {
                                const matchingGif = allGifs.find(gif => gif.toLowerCase().includes(term.toLowerCase()));
                                if (matchingGif) {
                                    console.log(`GIF encontrado que coincide con el término "${term}":`, matchingGif);
                                    return { url: matchingGif, type: 'gif' };
                                }
                            }

                            
                            if (allGifs.length > 0) {
                                console.log("Usando el primer GIF encontrado:", allGifs[0]);
                                return { url: allGifs[0], type: 'gif' };
                            }

                            console.log("No se pudo encontrar un GIF en la URL de Tenor");
                        }
                    } catch (error) {
                        console.error('Error al procesar URL de Tenor:', error);
                    }
                }
            }
            
            if (msg.embeds && msg.embeds.length > 0) {
                const embed = msg.embeds[0];
                if (embed.image && embed.image.url) {
                    const isGif = embed.image.url.toLowerCase().includes('.gif');
                    console.log('DEBUG: Found embed image with url:', embed.image.url);
                    return { url: embed.image.url, type: isGif ? 'gif' : 'embed' };
                } else if (embed.thumbnail && embed.thumbnail.url) {
                    const isGif = embed.thumbnail.url.toLowerCase().includes('.gif');
                    return { url: embed.thumbnail.url, type: isGif ? 'gif' : 'embed_thumbnail' };
                }
            }
            return null;
        };

        
        let targetMsg = message;
        if (message.reference && message.reference.messageId) {
            try {
                const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
                
                const extracted = await extractMediaUrl(repliedMessage);
                if (extracted) {
                    targetMsg = repliedMessage;
                }
            } catch (e) {
                console.error('Error al obtener el mensaje respondido:', e);
            }
        }

        
        const mediaData = await extractMediaUrl(targetMsg);

        
        if (!mediaData) {
            return message.reply('proporciona un emoji, un sticker, un GIF o una URL de imagen/GIF');
        }

        
        console.log("Descargando imagen/GIF para almacenar en caché...");
        let mediaBuffer;
        try {
            const response = await fetch(mediaData.url);
            if (!response.ok) {
                return message.reply('No se pudo descargar la imagen/GIF. Intenta con otra URL.');
            }
            mediaBuffer = Buffer.from(await response.arrayBuffer());
            console.log(`Imagen/GIF descargado, tamaño: ${mediaBuffer.length} bytes`);

            
            const tempFileName = `temp_${Date.now()}_${Math.floor(Math.random() * 1000)}.${mediaData.type === 'gif' ? 'gif' : 'png'}`;
            const tempFilePath = path.join(tempDir, tempFileName);
            fs.writeFileSync(tempFilePath, mediaBuffer);
            console.log(`Archivo temporal guardado en: ${tempFilePath}`);

            
            const embed = new EmbedBuilder()
                .setImage(mediaData.url + (mediaData.url.includes('?') ? '&size=4096' : '?size=4096'))
                .setColor('#7289DA')
                
                .setFooter({ text: `tipo: ${mediaData.type} | temp: ${tempFileName}` });

            
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('steal_as_emoji')
                        .setLabel('añadir como emoji')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('steal_as_sticker')
                        .setLabel('añadir como sticker')
                        .setStyle(ButtonStyle.Primary)
                );

            
            await message.channel.send({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Error al descargar la imagen/GIF:', error);
            return message.reply('Ocurrió un error al procesar la imagen/GIF. Intenta con otra URL.');
        }
    });

    
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton()) return;

        if (interaction.customId === 'steal_as_emoji' || interaction.customId === 'steal_as_sticker') {
            
            if (!interaction.member.permissions.has('ManageEmojisAndStickers')) {
                return interaction.reply({
                    content: 'No tienes permisos para añadir emojis o stickers.',
                    ephemeral: true
                });
            }

            
            const embed = interaction.message.embeds[0];
            if (!embed || !embed.image) {
                return interaction.reply({
                    content: 'No se pudo encontrar la imagen.',
                    ephemeral: true
                });
            }

            
            const footerText = embed.footer?.text || '';
            const typeMatch = footerText.match(/tipo: (\w+)/);
            const mediaType = typeMatch ? typeMatch[1] : '';
            const tempFileMatch = footerText.match(/temp: ([^\|]+)/);
            const tempFileName = tempFileMatch ? tempFileMatch[1] : '';
            const tempFilePath = tempFileName ? path.join(tempDir, tempFileName) : '';

            
            await interaction.deferReply({ ephemeral: true });

            try {
                let inputBuffer;

                
                if (tempFileName && fs.existsSync(tempFilePath)) {
                    console.log("Usando archivo temporal:", tempFilePath);
                    inputBuffer = fs.readFileSync(tempFilePath);
                } else {
                    
                    console.log("Archivo temporal no encontrado, descargando de nuevo...");
                    const originalUrl = embed.image.url.split('?')[0].split('&')[0];
                    console.log("URL original para procesar:", originalUrl);

                    const response = await fetch(originalUrl);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    inputBuffer = Buffer.from(await response.arrayBuffer());
                }

                console.log("Imagen/GIF cargado, tamaño:", inputBuffer.length, "bytes");

                
                const isGif = mediaType === 'gif';

                let successMessage = '';
                if (interaction.customId === 'steal_as_emoji') {
                    if (isGif) {
                        
                        console.log("Procesando como GIF animado...");
                        const emoji = await interaction.guild.emojis.create({
                            attachment: inputBuffer,
                            name: 'stolen_gif'
                        });
                        console.log("Emoji animado creado exitosamente:", emoji.id);
                        successMessage = `Emoji animado añadido exitosamente: ${emoji}`;
                    } else {
                        
                        console.log("Procesando como imagen estática...");
                        const processedBuffer = await sharp(inputBuffer)
                            .resize(128, 128, {
                                fit: 'contain',
                                background: { r: 0, g: 0, b: 0, alpha: 0 }
                            })
                            .png({ quality: 80 })
                            .toBuffer();

                        const emoji = await interaction.guild.emojis.create({
                            attachment: processedBuffer,
                            name: 'stolen_emoji'
                        });
                        successMessage = `Emoji añadido exitosamente: ${emoji}`;
                    }
                } else {
                    
                    const processedBuffer = await sharp(inputBuffer)
                        .resize(320, 320, {
                            fit: 'contain',
                            background: { r: 0, g: 0, b: 0, alpha: 0 }
                        })
                        .png({ quality: 80 })
                        .toBuffer();

                    const sticker = await interaction.guild.stickers.create({
                        file: processedBuffer,
                        name: 'stolen_sticker',
                        tags: 'stolen',
                        description: ''
                    });
                    successMessage = 'Sticker añadido exitosamente!';
                }

                
                await interaction.editReply({ content: successMessage });

                
                const disabledRows = interaction.message.components.map(row =>
                    ActionRowBuilder.from(row).setComponents(
                        row.components.map(component => ButtonBuilder.from(component).setDisabled(true))
                    )
                );
                await interaction.message.edit({ components: disabledRows });

                
                if (tempFileName && fs.existsSync(tempFilePath)) {
                    try {
                        fs.unlinkSync(tempFilePath);
                        console.log("Archivo temporal eliminado:", tempFilePath);
                    } catch (e) {
                        console.error("Error al eliminar archivo temporal:", e);
                        
                        setTimeout(() => {
                            try {
                                if (fs.existsSync(tempFilePath)) {
                                    fs.unlinkSync(tempFilePath);
                                    console.log("Archivo temporal eliminado en segundo intento:", tempFilePath);
                                }
                            } catch (retryError) {
                                console.error("Error en segundo intento de eliminación:", retryError);
                            }
                        }, 1000);
                    }
                }

            } catch (error) {
                console.error('Error detallado al crear emoji/sticker:', error);
                console.error('Detalles adicionales:', {
                    mensaje: error.message,
                    código: error.code,
                    estado: error.status,
                    método: error.method,
                    url: error.url,
                    stack: error.stack
                });
                await interaction.editReply({
                    content: `Error al crear el emoji/sticker:\nCódigo: ${error.code}\nMensaje: ${error.message}\nEstado: ${error.status || 'N/A'}\n\nAsegúrate de que el bot tenga los permisos necesarios y que la imagen sea válida.`
                });
            }
        }
    });
}; 