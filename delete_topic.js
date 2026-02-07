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

async function deleteTopic() {
    try {
        await client.connect();

        console.log('\n=== 주제 삭제 시작 ===\n');
        const result = await client.query(`
            SELECT _id, theme FROM kkutu_ko 
            WHERE theme LIKE '%[THEME_CODE]%' OR theme = '[THEME_CODE]'
            ORDER BY _id;
        `);

        console.log(`총 ${result.rows.length}개의 단어에서 주제 처리`);

        let deletedCount = 0;
        let updatedCount = 0;

        for (const row of result.rows) {
            const themes = row.theme.split(',').map(t => t.trim());
            const newThemes = themes.filter(t => t !== '[THEME_CODE]');

            if (newThemes.length === 0) {
                await client.query('DELETE FROM kkutu_ko WHERE _id = $1', [row._id]);
                deletedCount++;
                console.log(`삭제: ${row._id} (주제: ${row.theme})`);
            } else {
                const updatedTheme = newThemes.join(',');
                await client.query('UPDATE kkutu_ko SET theme = $1 WHERE _id = $2',
                    [updatedTheme, row._id]);
                updatedCount++;
                console.log(`수정: ${row._id} (${row.theme} → ${updatedTheme})`);
            }
        }

        console.log(`\n=== 처리 완료 ===`);
        console.log(`✓ 단어 삭제: ${deletedCount}개`);
        console.log(`✓ 주제 제거: ${updatedCount}개`);
        console.log(`✓ 즉시 합계: ${deletedCount + updatedCount}개\n`);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

deleteTopic();
