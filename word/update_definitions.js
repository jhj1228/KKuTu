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

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

//PG 연결 설정
const DB_CONFIG = {
    user: 'YOUR_PG_USER', // PostgreSQL 사용자 이름
    host: 'YOUR_PG_HOST', // PostgreSQL 호스트 (예: localhost)
    database: 'YOUR_PG_DATABASE', // PostgreSQL 데이터베이스 이름
    password: 'YOUR_PG_PASSWORD', // PostgreSQL 비밀번호
    port: 5432,
    max: 20,
};

// 우리말샘 파일 경로
const TARGET_DIR = 'YOUR_JSON_DIRECTORY';
const FILE_PREFIX = '1562938_';

const BATCH_SIZE = 1000;

// 품사
const TYPE_MAP = {
    "명사": 1, "대명사": 2, "수시": 3, "조사": 4, "동사": 5, "형용사": 6, "관형사": 7, "부사": 8, "감탄사": 9,
    "접사": 10, "의존 명사": 11, "보조 동사": 12, "보조 형용사": 13, "어미": 14, "관형사·명사": 15,
    "수사·관형사": 16, "명사·부사": 17, "감탄사·명사": 18, "대명사·부사": 19, "대명사·감탄사": 20,
    "동사·형용사": 21, "관형사·감탄사": 22, "부사·감탄사": 23, "의존 명사·조사": 24, "수사·관형사·명사": 25,
    "대명사·관형사": 26
};

// 주제
const THEME_MAP = {
    "가톨릭": 10, "건설": 20, "경영": 30, "경제": 40, "고유": 50, "공업": 60, "공예": 70, "공학": 80, "광업": 90,
    "교육": 100, "교통": 110, "군사": 120, "기계": 130, "기독교": 140, "농업": 150, "동물": 160, "매체": 170,
    "무용": 180, "문학": 190, "물리": 200, "미술": 210, "민속": 220, "법률": 230, "보건": 240, "복식": 250,
    "복지": 260, "불교": 270, "사회 일반": 280, "산업": 290, "생명": 300, "서비스업": 310, "수산업": 320, "수의": 330,
    "수학": 340, "식물": 350, "식품": 360, "심리": 370, "약학": 380, "언어": 390, "역사": 400, "연기": 410,
    "영상": 420, "예체능": 430, "음악": 440, "의학": 450, "인명": 460, "인문": 470, "임업": 480, "자연": 490,
    "재료": 500, "전기·전자": 510, "정보·통신": 520, "정치": 530, "종교": 550, "지구": 560, "지리": 570,
    "지명": 580, "책명": 590, "천문": 600, "천연자원": 610, "철학": 620, "체육": 630, "한의": 640, "해양": 650,
    "행정": 660, "화학": 670, "환경": 680
};

function cleanWord(text) {
    if (!text) return "";
    // 완성형 한글(가-힣) 및 자음(ㄱ-ㅎ)과 모음(ㅏ-ㅣ)도 허용
    return text.replace(/[^가-힣ㄱ-ㅎㅏ-ㅣ]/g, '');
}

function formatSubDefinitions(text) {
    if (!text) return "";
    let formatted = text.trim();
    formatted = formatted.replace(/[\u0000-\u001F]/g, '');

    const circledMap = { '①': 1, '②': 2, '③': 3, '④': 4, '⑤': 5, '⑥': 6, '⑦': 7, '⑧': 8, '⑨': 9, '⑩': 10 };
    for (const [char, num] of Object.entries(circledMap)) {
        formatted = formatted.split(char).join(`（${num}）`);
    }

    if (!formatted.match(/^\s*（\d+）/) && !formatted.match(/^\s*［\d+］/)) {
        formatted = `（1）${formatted}`;
    }
    return formatted;
}

function processJsonData(jsonData) {
    console.log("데이터 정밀 파싱 중...");
    let items = [];
    if (Array.isArray(jsonData)) items = jsonData;
    else if (jsonData.channel && Array.isArray(jsonData.channel.item)) items = jsonData.channel.item;

    const wordMap = new Map();

    items.forEach((item) => {
        let rawWord = item.wordinfo?.word || item.word || "";
        if (!rawWord) return;

        const cleanKey = cleanWord(rawWord);
        if (!cleanKey) return;

        let def = item.senseinfo?.definition || "";
        if (!def) return;

        let pos = item.senseinfo?.pos || "";
        let typeCode = TYPE_MAP[pos] !== undefined ? String(TYPE_MAP[pos]) : "";

        let themeCode = "";
        if (item.senseinfo?.cat_info && Array.isArray(item.senseinfo.cat_info)) {
            for (let c of item.senseinfo.cat_info) {
                if (c.cat && THEME_MAP[c.cat] !== undefined) {
                    themeCode = String(THEME_MAP[c.cat]);
                    break;
                }
            }
        }

        const formattedDef = formatSubDefinitions(def);

        if (!wordMap.has(cleanKey)) {
            wordMap.set(cleanKey, []);
        }

        const meaningsArray = wordMap.get(cleanKey);

        // 뜻이 완전히 똑같이 중복되는 경우만 스킵
        const isDuplicate = meaningsArray.some(m => m.def === formattedDef);
        if (!isDuplicate) {
            meaningsArray.push({
                def: formattedDef,
                type: typeCode,
                theme: themeCode
            });
        }
    });

    const resultList = [];
    for (const [word, meanings] of wordMap) {
        let combinedMean = "";
        let typeArray = [];
        let themeArray = [];

        // 뜻 1개당 타입 1개, 테마 1개를 무조건 같은 인덱스에 적용 (비어있어도 빈 문자열 삽입)
        meanings.forEach((m, idx) => {
            const topIndex = idx + 1;
            combinedMean += `＂${topIndex}＂［1］${m.def}`;
            typeArray.push(m.type);
            themeArray.push(m.theme);
        });

        if (combinedMean) {
            resultList.push({
                id: word,
                mean: combinedMean,
                type: typeArray.join(','),
                theme: themeArray.join(',')
            });
        }
    }

    console.log(`파싱 완료. 총 ${resultList.length}개의 단어가 준비되었습니다.`);
    return resultList;
}

async function insertDataToDb() {
    if (!fs.existsSync(TARGET_DIR)) {
        console.error(`폴더를 찾을 수 없습니다: ${TARGET_DIR}`);
        return;
    }

    const pool = new Pool(DB_CONFIG);

    try {
        // 1. 폴더 안의 모든 파일 목록 읽어오기
        const files = fs.readdirSync(TARGET_DIR);

        // 2. '1562938_'로 시작하고 '.json'으로 끝나는 파일만 필터링
        const targetFiles = files.filter(file => file.startsWith(FILE_PREFIX) && file.endsWith('.json'));

        if (targetFiles.length === 0) {
            console.log(`조건에 맞는 JSON 파일이 ${TARGET_DIR}에 없습니다.`);
            return;
        }

        console.log(`\n총 ${targetFiles.length}개의 파일을 찾았습니다. 자동 연속 처리를 시작합니다.\n`);

        // 3. 찾은 파일들을 하나씩 순차적으로 처리 (for...of 사용)
        for (let fileIndex = 0; fileIndex < targetFiles.length; fileIndex++) {
            const fileName = targetFiles[fileIndex];
            const filePath = path.join(TARGET_DIR, fileName);

            console.log(`=================================================`);
            console.log(`[${fileIndex + 1} / ${targetFiles.length}] 파일 처리 시작: ${fileName}`);

            // 파일 읽기 및 파싱
            const rawData = fs.readFileSync(filePath, 'utf8');
            const jsonData = JSON.parse(rawData);

            // 기존에 만든 함수로 데이터 가공
            const processedList = processJsonData(jsonData);

            if (processedList.length === 0) {
                console.log(`이 파일에는 저장할 유효한 데이터가 없습니다. 다음으로 넘어갑니다.`);
                continue;
            }

            console.log(`DB 입력 시작 (총 ${processedList.length}개)...`);
            let successCount = 0;

            for (let i = 0; i < processedList.length; i += BATCH_SIZE) {
                const batch = processedList.slice(i, i + BATCH_SIZE);

                // 1:1 매핑 복구 시 작성했던 ON CONFLICT 구문 유지
                const query = `
                    INSERT INTO public.kkutu_ko (_id, mean, type, theme)
                    VALUES 
                    ${batch.map((_, idx) => `($${idx * 4 + 1}, $${idx * 4 + 2}, $${idx * 4 + 3}, $${idx * 4 + 4})`).join(', ')}
                    ON CONFLICT (_id) 
                    DO UPDATE SET 
                        mean = EXCLUDED.mean,
                        type = EXCLUDED.type,
                        theme = EXCLUDED.theme
                `;

                const values = [];
                batch.forEach(item => {
                    values.push(item.id);
                    values.push(item.mean);
                    values.push(item.type);
                    values.push(item.theme);
                });

                await pool.query(query, values);
                successCount += batch.length;

                if (i === 0 || i % (BATCH_SIZE * 5) === 0) {
                    console.log(` - 진행률: ${((successCount / processedList.length) * 100).toFixed(1)}%`);
                }
            }
            console.log(`[${fileName}] 작업 완료! (${successCount}개)\n`);
        }

        console.log(`모든 파일(${targetFiles.length}개)의 데이터베이스 입력이 완료되었습니다.`);

    } catch (err) {
        console.error("오류 발생:", err);
    } finally {
        await pool.end();
    }
}

insertDataToDb();