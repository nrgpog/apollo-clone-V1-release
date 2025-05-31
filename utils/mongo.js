const { MongoClient } = require('mongodb');


const uri = process.env.MONGO_URI;

if (!uri) {
    throw new Error('MONGO_URI environment variable is not set');
}

const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    retryWrites: true,
    w: 'majority'
});

let db;

async function connectDB() {
    if (!db) {
        try {
            await client.connect();
            db = client.db('apollo');
            console.log('Successfully connected to MongoDB.');
        } catch (error) {
            console.error('Error connecting to MongoDB:', error);
            throw error;
        }
    }
    return db;
}

async function getWinMessageTemplate() {
    try {
        const database = await connectDB();
        const settings = database.collection('settings');
        const doc = await settings.findOne({ key: 'winMessageTemplate' });
        return doc ? doc.value : null;
    } catch (error) {
        console.error('Error fetching win message template:', error);
        return null;
    }
}

async function setWinMessageTemplate(template) {
    try {
        const database = await connectDB();
        const settings = database.collection('settings');
        await settings.updateOne(
            { key: 'winMessageTemplate' },
            { $set: { value: template } },
            { upsert: true }
        );
        return true;
    } catch (error) {
        console.error('Error setting win message template:', error);
        return false;
    }
}


async function getGiveawayConfig() {
    try {
        const database = await connectDB();
        const settings = database.collection('settings');
        const doc = await settings.findOne({ key: 'giveawayConfig' });
        return doc ? doc.value : null;
    } catch (error) {
        console.error('Error fetching giveaway config:', error);
        return null;
    }
}

async function setGiveawayConfig(config) {
    try {
        const database = await connectDB();
        const settings = database.collection('settings');
        await settings.updateOne(
            { key: 'giveawayConfig' },
            { $set: { value: config } },
            { upsert: true }
        );
        return true;
    } catch (error) {
        console.error('Error setting giveaway config:', error);
        return false;
    }
}

module.exports = { getWinMessageTemplate, setWinMessageTemplate, getGiveawayConfig, setGiveawayConfig, connectDB }; 