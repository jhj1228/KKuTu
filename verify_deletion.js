const { Client } = require('pg');
const GLOBAL = require('./Server/lib/sub/global.json');

const client = new Client({
    user: GLOBAL.PG_USER,
    password: GLOBAL.PG_PASSWORD,
    host: GLOBAL.PG_HOST,
    port: GLOBAL.PG_PORT,
    database: GLOBAL.PG_DATABASE
});

async function verifyDeletion() {
    try {
        await client.connect();

        console.log('\n=== 주제 삭제 검증 ===\n');

        const inputThemeCheckResult = await client.query(`
            SELECT COUNT(*) FROM kkutu_ko 
            WHERE CAST(theme AS TEXT) LIKE '%[THEME_CODE]%' OR CAST(theme AS TEXT) = '[THEME_CODE]';
        `);

        console.log(`남은 주제 데이터: ${inputThemeCheckResult.rows[0].count}개`);

        if (parseInt(inputThemeCheckResult.rows[0].count) === 0) {
            console.log('\n주제가 완벽하게 삭제되었습니다!');
        } else {
            console.log('\n아직 관련 데이터가 있습니다:');
            const remainingResult = await client.query(`
                SELECT _id, theme FROM kkutu_ko 
                WHERE CAST(theme AS TEXT) LIKE '%[THEME_CODE]%' OR CAST(theme AS TEXT) = '[THEME_CODE]'
                LIMIT 10;
            `);
            console.table(remainingResult.rows);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

verifyDeletion();
