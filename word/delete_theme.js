/**
 * Rule the words! KKuTu Online
 * Copyright (C) 2017 JJoriping(op@jjo.kr)
 * 
 * Rule the words! LegendKKuTu
 * Copyright (C) 2025-2026 정희정(wjdgmlwjd3102@gmail.com)
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

'use strict';

const { Pool } = require('pg');

const ALLOWED_TABLES = new Set(['kkutu_ko', 'kkutu_ko_g', 'kkutu_ko_p', 'kkutu_ko_u']);
const MEANING_MARKER = /＂\d+＂/g;

const DB_CONFIG = {
    host: '',
    port: '',
    database: '',
    user: '',
    password: ''
};

const TARGET_THEME = '';
const TARGET_TABLE = '';
const APPLY_CHANGES = false;

function splitMeanings(mean) {
    const markers = Array.from(mean.matchAll(MEANING_MARKER));
    if (markers.length === 0) {
        throw new Error('뜻 구분자를 찾을 수 없습니다.');
    }

    return markers.map((match, index) => {
        const start = match.index;
        const bodyStart = start + match[0].length;
        const end = index + 1 < markers.length ? markers[index + 1].index : mean.length;

        return {
            marker: match[0],
            body: mean.slice(bodyStart, end)
        };
    });
}

function removeThemeFromWord(row, theme) {
    const meanings = splitMeanings(row.mean);
    const types = String(row.type || '').split(',');
    const themes = String(row.theme || '').split(',');

    if (themes.length !== meanings.length || types.length !== meanings.length) {
        throw new Error(
            `뜻(${meanings.length}), type(${types.length}), theme(${themes.length}) 항목 수가 일치하지 않습니다.`
        );
    }

    const retained = meanings.map((meaning, index) => ({
        meaning,
        type: types[index],
        theme: themes[index]
    })).filter((entry) => entry.theme.trim() !== theme);

    if (retained.length === meanings.length) {
        return null;
    }
    if (retained.length === 0) {
        return { deleteWord: true };
    }

    return {
        deleteWord: false,
        mean: retained.map((entry, index) => (
            entry.meaning.marker.replace(/＂\d+＂/, `＂${index + 1}＂`) + entry.meaning.body
        )).join(''),
        type: retained.map((entry) => entry.type).join(','),
        theme: retained.map((entry) => entry.theme).join(',')
    };
}

async function main() {
    if (typeof TARGET_THEME !== 'string' || TARGET_THEME.trim() === '') {
        throw new Error('TARGET_THEME은 비어 있지 않은 문자열이어야 합니다.');
    }
    if (!ALLOWED_TABLES.has(TARGET_TABLE)) {
        throw new Error(`TARGET_TABLE은 다음 중 하나여야 합니다: ${Array.from(ALLOWED_TABLES).join(', ')}`);
    }

    const pool = new Pool(DB_CONFIG);
    try {
        const { rows } = await pool.query(
            `SELECT _id, mean, type, theme FROM public.${TARGET_TABLE} WHERE theme ~ $1 ORDER BY _id`,
            [`(^|,)\\s*${TARGET_THEME}\\s*(,|$)`]
        );
        const changes = [];
        let removedDefinitions = 0;

        for (const row of rows) {
            let change;
            try {
                change = removeThemeFromWord(row, TARGET_THEME);
            } catch (error) {
                throw new Error(`'${row._id}' 처리 실패: ${error.message}`);
            }

            if (change) {
                changes.push({ id: row._id, ...change });
                removedDefinitions += String(row.theme).split(',')
                    .filter((entry) => entry.trim() === TARGET_THEME).length;
            }
        }

        const deletedWords = changes.filter((change) => change.deleteWord).length;
        console.log(
            `테마 ${TARGET_THEME}: 뜻 ${removedDefinitions}개, 단어 ${changes.length}개 ` +
            `(단어 행 삭제 ${deletedWords}개)`
        );

        if (changes.length === 0) {
            console.log(`테마 ${TARGET_THEME}과 일치하는 단어가 없어 변경하지 않았습니다.`);
            return;
        }

        if (!APPLY_CHANGES) {
            console.log('미리 보기만 수행했습니다. 실제 반영은 APPLY_CHANGES를 true로 변경해 실행하세요.');
            return;
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            for (const change of changes) {
                if (change.deleteWord) {
                    await client.query(`DELETE FROM public.${TARGET_TABLE} WHERE _id = $1`, [change.id]);
                } else {
                    await client.query(
                        `UPDATE public.${TARGET_TABLE} SET mean = $1, type = $2, theme = $3 WHERE _id = $4`,
                        [change.mean, change.type, change.theme, change.id]
                    );
                }
            }
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

        console.log(`테마 ${TARGET_THEME} 삭제를 완료했습니다.`);
    } finally {
        await pool.end();
    }
}

main().catch((error) => {
    console.error(`테마 삭제 중 오류가 발생했습니다: ${error.message}`);
    process.exitCode = 1;
});
