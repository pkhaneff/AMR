const redis = require('../redis/RedisClient');

async function clearAMRData() {
    try {
        console.log('🧹 Clearing AMR-related Redis data...');

        // Get all AMR-related keys
        const patterns = [
            'amr:*',
            'blocks:*',
            'reserve:*',
        ];

        let totalDeleted = 0;

        for (const pattern of patterns) {
            const keys = await redis.keys(pattern);
            if (keys.length > 0) {
                console.log(`  Found ${keys.length} keys matching "${pattern}"`);
                await redis.del(keys);
                totalDeleted += keys.length;
            }
        }

        console.log(`✅ Cleared ${totalDeleted} keys from Redis`);
        console.log('🎯 Redis is now clean for fresh AMR operations');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing Redis:', error);
        process.exit(1);
    }
}

clearAMRData();
