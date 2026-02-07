/**
 * Rule the words! KKuTu Online
 * Copyright (C) 2017 JJoriping(op@jjo.kr)
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

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
