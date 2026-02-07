const { Client } = require('pg');
const GLOBAL = require('./Server/lib/sub/global.json');

const client = new Client({
    user: GLOBAL.PG_USER,
    password: GLOBAL.PG_PASSWORD,
    host: GLOBAL.PG_HOST,
    port: GLOBAL.PG_PORT,
    database: GLOBAL.PG_DATABASE
});

async function checkDatabase() {
    try {
        await client.connect();

        console.log('\n=== kkutu_ko 테이블 구조 ===');
        const structureResult = await client.query(`
            SELECT column_name, data_type FROM information_schema.columns
            WHERE table_name = 'kkutu_ko'
            ORDER BY ordinal_position;
        `);
        console.table(structureResult.rows);

        console.log('\n=== 주제 단어 개수 ===');
        const hykCountResult = await client.query(`
            SELECT COUNT(*) FROM kkutu_ko WHERE CAST(theme AS TEXT) LIKE '%[THEME_CODE]%' OR CAST(theme AS TEXT) = '[THEME_CODE]';
        `);
        console.log('Count:', hykCountResult.rows[0]);

        console.log('\n=== 주제 샘플 데이터 (최대 5개) ===');
        const sampleResult = await client.query(`
            SELECT * FROM kkutu_ko WHERE CAST(theme AS TEXT) LIKE '%[THEME_CODE]%' OR CAST(theme AS TEXT) = '[THEME_CODE]' LIMIT 5;
        `);
        console.table(sampleResult.rows);

        console.log('\n=== 가 포함된 데이터의 theme 컬럼 구조 ===');
        const themeResult = await client.query(`
            SELECT DISTINCT theme FROM kkutu_ko WHERE CAST(theme AS TEXT) LIKE '%[THEME_CODE]%' LIMIT 3;
        `);
        themeResult.rows.forEach(row => {
            console.log(JSON.stringify(row.theme, null, 2));
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkDatabase();
