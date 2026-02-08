/**
 * Speed Quiz 초기 데이터 자동 삽입 스크립트
 * 사용법: 
 *   node initialize_quiz.js          - 테이블 생성
 *   node initialize_quiz.js --drop   - 테이블 삭제 (경고 표시됨)
 */

const PgPool = require("pg").Pool;
const readline = require("readline");
const GLOBAL = require("./Server/lib/sub/global.json");

const Pg = new PgPool({
    user: GLOBAL.PG_USER,
    password: GLOBAL.PG_PASSWORD,
    port: GLOBAL.PG_PORT,
    database: GLOBAL.PG_DATABASE,
    host: GLOBAL.PG_HOST
});

// 사용자 입력 받기
function askQuestion(question) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

async function dropTable() {
    try {
        console.log('⚠️  경고: kkutu_speedquiz 테이블을 삭제하려고 합니다!');
        console.log('⚠️  이 작업은 되돌릴 수 없습니다.');
        console.log('⚠️  모든 데이터가 삭제됩니다!\n');

        const confirm = await askQuestion('정말로 삭제하시겠습니까? (yes/no): ');

        if (confirm !== 'yes') {
            console.log('❌ 삭제 취소됨');
            process.exit(0);
        }

        const client = await Pg.connect();

        try {
            console.log('\nkkutu_speedquiz 테이블 삭제 중...');
            await client.query('DROP TABLE IF EXISTS kkutu_speedquiz');
            console.log('✓ 테이블 삭제 완료');
        } finally {
            client.release();
        }

        process.exit(0);
    } catch (err) {
        console.error('오류 발생:', err.message);
        process.exit(1);
    }
}

async function initializeQuiz() {
    try {
        console.log('PostgreSQL에 연결 중...');

        const client = await Pg.connect();

        try {
            // 1. 테이블 생성 (없으면)
            console.log('kkutu_speedquiz 테이블 확인...');
            await client.query(`
				CREATE TABLE IF NOT EXISTS kkutu_speedquiz (
					_id SERIAL PRIMARY KEY,
					topic VARCHAR(50) NOT NULL,
					question TEXT NOT NULL,
					answer_ko VARCHAR(255) NOT NULL,
					aliases_ko TEXT,
					difficulty INT DEFAULT 1,
					created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
					updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
				);
				
				CREATE INDEX IF NOT EXISTS idx_speedquiz_topic ON kkutu_speedquiz(topic);
				CREATE INDEX IF NOT EXISTS idx_speedquiz_difficulty ON kkutu_speedquiz(difficulty);
			`);
            console.log('✓ 테이블 생성 완료');

            // 2. 기존 데이터 확인
            console.log('데이터베이스 상태 확인 중...');
            const countResult = await client.query('SELECT COUNT(*) FROM kkutu_speedquiz');
            const count = parseInt(countResult.rows[0].count);
            console.log(`\n현재 등록된 질문: ${count}개`);

            if (count > 0) {
                const byTopic = await client.query(`
					SELECT topic, COUNT(*) as count FROM kkutu_speedquiz GROUP BY topic
				`);
                console.log('\n토픽별 질문 수:');
                byTopic.rows.forEach(row => {
                    console.log(`  ${row.topic}: ${row.count}개`);
                });
            }

        } finally {
            client.release();
        }

        console.log('\n✓ 초기화 완료!');
        process.exit(0);

    } catch (err) {
        console.error('오류 발생:', err.message);
        console.error(err);
        process.exit(1);
    }
}

// 커맨드 라인 인자 확인
const args = process.argv.slice(2);
if (args.includes('--drop')) {
    dropTable();
} else {
    initializeQuiz();
}
