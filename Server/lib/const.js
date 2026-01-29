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

var GLOBAL = require("./sub/global.json");

exports.KKUTU_MAX = 50;
exports.MAIN_PORTS = GLOBAL.MAIN_PORTS;
exports.TEST_PORT = 4040;
exports.SPAM_CLEAR_DELAY = 1600;
exports.SPAM_ADD_DELAY = 750;
exports.SPAM_LIMIT = 7;
exports.BLOCKED_LENGTH = 10000;
exports.KICK_BY_SPAM = 9;
exports.MAX_OBSERVER = 4;
exports.TESTER = GLOBAL.ADMIN.concat([
	"Input tester id here"
]);
exports.IS_SECURED = GLOBAL.IS_SECURED;
exports.SSL_OPTIONS = GLOBAL.SSL_OPTIONS;
exports.OPTIONS = {
	'man': { name: "Manner" }, // 매너
	'gte': { name: "Gentle" }, // 젠틀
	'ext': { name: "Injeong" }, // 어인정
	'mis': { name: "Mission" }, // 미션
	'rdm': { name: "Randommission" }, // 랜덤미션
	'loa': { name: "Loanword" }, // 우리말
	'prv': { name: "Proverb" }, // 속담
	'str': { name: "Strict" }, // 깐깐
	'k32': { name: "Sami" }, // 3232
	'no2': { name: "No2" }, // 2글자 금지
	// 'sht': { name: "Short" }, // 짧음
	'rtn': { name: "Return" }, // 리턴
	'rdt': { name: "Randomturn" }, // 랜덤턴
	'unw': { name: "Unknownword" }, // 언노운워드
	'bom': { name: "Boom" }, // 폭탄
	// 'rvs': { name: "Reverse" }, // 리버스
	'wpk': { name: "Wordpick" }, // 워드픽
	'ulm': { name: "Unlimited" }, // 무제한
	'due': { name: "Dueum" }, // 두음법칙 금지
	'thw': { name: "Threeword" }, // 3글자
	'ddl': { name: "Dodoli" }, // 도돌이 금지
	'fre': { name: "Free" } // 자유
};
exports.MOREMI_PART = ['back', 'eye', 'mouth', 'shoes', 'clothes', 'head', 'lhand', 'rhand', 'front'];
exports.CATEGORIES = ["all", "spec", "skin", "badge", "head", "eye", "mouth", "clothes", "hs", "back"];
exports.AVAIL_EQUIP = [
	"NIK", "BDG1", "BDG2", "BDG3", "BDG4",
	"Mhead", "Meye", "Mmouth", "Mhand", "Mclothes", "Mshoes", "Mback"
];
exports.GROUPS = {
	'spec': ["PIX", "PIY", "PIZ", "CNS"],
	'skin': ["NIK"],
	'badge': ["BDG1", "BDG2", "BDG3", "BDG4"],
	'head': ["Mhead"],
	'eye': ["Meye"],
	'mouth': ["Mmouth"],
	'clothes': ["Mclothes"],
	'hs': ["Mhand", "Mshoes"],
	'back': ["Mback", "Mfront"]
};
exports.RULE = {
	/*
		유형: { lang: 언어,
			rule: 이름,
			opts: [ 추가 규칙 ],
			time: 시간 상수,
			ai: AI 가능?,
			big: 큰 화면?,
			ewq: 현재 턴 나가면 라운드 종료?
		}
	*/
	'KKT': { // 쿵쿵따
		lang: "ko",
		rule: "Classic",
		opts: ["man", "gte", "ext", "mis", "rdm", "loa", "str", "k32", "rtn", "rdt", "due", "ddl", "bom"],
		time: 1,
		ai: true,
		big: false,
		ewq: true
	},
	'KSH': { // 끝말잇기
		lang: "ko",
		rule: "Classic",
		opts: ["man", "gte", "ext", "mis", "rdm", "loa", "str", "rtn", "rdt", "unw", "due", "ddl", "bom"],
		time: 1,
		ai: true,
		big: false,
		ewq: true
	},
	'CSQ': { // 자음퀴즈
		lang: "ko",
		rule: "Jaqwi",
		opts: ["ijp", "ulm"],
		time: 1,
		ai: true,
		big: false,
		ewq: false
	},
	'KCW': { // 십자말풀이
		lang: "ko",
		rule: "Crossword",
		opts: [],
		time: 2,
		ai: false,
		big: true,
		ewq: false
	},
	'KTY': { // 타자대결
		lang: "ko",
		rule: "Typing",
		opts: ["prv", "ulm"],
		time: 1,
		ai: false,
		big: false,
		ewq: false
	},
	'KAP': { // 앞말잇기
		lang: "ko",
		rule: "Classic",
		opts: ["man", "gte", "ext", "mis", "rdm", "loa", "str", "rtn", "rdt", "unw", "due", "ddl", "bom"],
		time: 1,
		ai: true,
		big: false,
		_back: true,
		ewq: true
	},
	'HUN': { // 훈민정음
		lang: "ko",
		rule: "Hunmin",
		opts: ["ext", "mis", "rdm", "loa", "str", "rtn", "rdt", "thw", "bom"],
		time: 1,
		ai: true,
		big: false,
		ewq: true
	},
	'KDA': { // 단어대결
		lang: "ko",
		rule: "Daneo",
		opts: ["ijp", "mis", "rdm", "rtn", "rdt", "bom"],
		time: 1,
		ai: true,
		big: false,
		ewq: true
	},
	'KSS': { // 솎솎
		lang: "ko",
		rule: "Sock",
		opts: ["no2", "wpk"],
		time: 1,
		ai: false,
		big: true,
		ewq: false
	},
	'KMH': { // 가운뎃말잇기
		lang: "ko",
		rule: "Classic",
		opts: ["man", "gte", "ext", "mis", "rdm", "loa", "str", "rtn", "rdt", "unw", "due", "ddl", "bom"],
		time: 1,
		ai: true,
		big: false,
		ewq: false
	},
	'KKK': { // 끄투
		lang: "ko",
		rule: "Classic",
		opts: ["man", "gte", "ext", "mis", "rdm", "loa", "str", "rtn", "rdt", "due", "ddl", "bom"],
		time: 1,
		ai: true,
		big: false,
		ewq: false
	},
	'MOQ': { // 모음퀴즈
		lang: "ko",
		rule: "Moqwi",
		opts: ["ijp", "ulm"],
		time: 1,
		ai: true,
		big: false,
		ewq: false
	},
	'ALL': { // 전체
		lang: "ko",
		rule: "All",
		opts: ["mis", "rdm", "rtn", "rdt", "bom", "fre"],
		time: 1,
		ai: true,
		big: false,
		ewq: true
	},
	'KTT': { // 주제타자대결
		lang: "ko",
		rule: "Typing",
		opts: ["ijp", "ulm"],
		time: 1,
		ai: false,
		big: false,
		ewq: false
	},
	'KRH': { // 랜덤잇기
		lang: "ko",
		rule: "Classic",
		opts: ["man", "gte", "ext", "mis", "rdm", "loa", "str", "rtn", "rdt", "unw", "due", "ddl", "bom"],
		time: 1,
		ai: true,
		big: false,
		ewq: true
	},
	'KAT': { // 앞말쿵쿵따
		lang: "ko",
		rule: "Classic",
		opts: ["man", "gte", "ext", "mis", "rdm", "loa", "str", "k32", "rtn", "rdt", "due", "ddl", "bom"],
		time: 1,
		ai: true,
		big: false,
		ewq: true
	}/* ,
	'WSK': { // 워드스택
		lang: "ko",
		rule: "Wordstack",
		opts: ["man", "ext"],
		time: 1,
		ai: false,
		big: false,
		ewq: true
	} */
};
exports.getPreScore = function (text, chain, tr) {
	return 2 * (Math.pow(5 + 7 * (text || "").length, 0.74) + 0.88 * (chain || []).length) * (0.5 + 0.5 * tr) * 3.5;
};
exports.getPenalty = function (chain, score) {
	return -1 * Math.round(Math.min(10 + (chain || []).length * 2.1 + score * 0.15, score));
};
exports.GAME_TYPE = Object.keys(exports.RULE);
exports.EXAMPLE_TITLE = {
	'ko': "가나다라마바사아자차",
	'en': "abcdefghij"
};
exports.INIT_SOUNDS = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
exports.INIT_VOWELS = ["ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ", "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ"];
exports.MISSION_ko = ["가", "나", "다", "라", "마", "바", "사", "아", "자", "차", "카", "타", "파", "하"];
exports.MISSION_en = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"];

exports.KO_INJEONG = [
	"SCP", // SCP 재단
	"IMS", // THE iDDOLM@STER
	"VOC", // VOCALOID
	"GNT", // 가디언 테일즈
	"RAG", // 간식
	"GGC", // 개그콘서트
	"NEX", // 게임
	// "GAD", // 겟앰프드
	"AIR", // 공항
	"GGJ", // 관광지
	"KTV", // 국내 방송 프로그램
	"SSR", // 귀혼
	// "CPY", // 기업
	"TBC", // 냥코대전쟁
	"NFX", // 넷플릭스
	"LAW", // 대한민국 법률
	"KOT", // 대한민국 철도역
	// "DNF", // 던전앤파이터
	// "DBD", // 데드 바이 데이라이트
	"DRM", // 도라에몽
	"DOT", // 도타 2
	"THP", // 동방 프로젝트
	"JLN", // 라이트 노벨
	"LVL", // 러브 라이브!
	"LKT", // 레전드끄투
	"LOA", // 로스트아크
	"LOL", // 리그 오브 레전드
	"MMM", // 마법소녀 마도카☆마기카
	"MIN", // 마인크래프트
	"MAF", // 마피아42
	"JAN", // 만화/애니메이션
	"MAP", // 메이플스토리
	// "WWS", // 명조: 위더링 웨이브
	"CTH", // 문화재
	"BGP", // 뱅드림! 걸즈 밴드 파티!
	"BUT", // 버스정류장
	"BUS", // 버스터미널
	"HSR", // 붕괴: 스타레일
	"BLA", // 블루 아카이브
	"CYP", // 사이퍼즈
	"NVL", // 소설
	"STA", // 스타크래프트
	// "GOV", // 승리의 여신: 니케
	"APT", // 아파트
	"ESB", // 앙상블 스타즈!
	"APP", // 애플리케이션
	"UND", // 언더테일
	"ESY", // 에세이
	"ELW", // 엘소드
	"KMV", // 영화
	"OVW", // 오버워치
	"YKW", // 요괴워치
	"COK", // 요리
	"UMM", // 우마무스메 프리티 더비
	"GEN", // 원신
	"WOW", // 월드 오브 워크래프트
	"WEB", // 웹툰
	"KPO", // 유명인
	"OIJ", // 유행어
	"ERT", // 이터널 리턴
	"JPT", // 일본 철도역
	"CFE", // 자격/면허
	"ZZZ", // 젠레스 존 제로
	"ZEL", // 젤다의 전설
	"ZBH", // 좀비고등학교
	// "CNT", // 중국 철도역
	"JOB", // 직업
	"KEM", // 카카오톡 이모티콘
	"CKR", // 쿠키런
	"CLO", // 클로저스
	"KRF", // 키라라 판타지아
	"TCG", // 트릭컬 RE:VIVE
	"POK", // 포켓몬스터
	"PJS", // 프로젝트 세카이 컬러풀 스테이지!
	"PCR", // 프린세스 커넥트! Re:Dive
	"HSS", // 하스스톤
	"HAK", // 학교
	"KMU", // 한국 대중음악
	"KRP", // 한국 라디오 프로그램
	"KAD", // 한국 행정구역
	"HOS" // 히어로즈 오브 더 스톰
];
exports.EN_INJEONG = [
	"LOL"
];
exports.KO_THEME = [
	"10", "20", "30", "50", "40", "60", "70", "80", "90", "100",
	"110", "120", "130", "140", "190", "150", "160", "170", "180", "200",
	"210", "220", "230", "260", "250", "240", "270", "280", "290", "300", "310",
	"320", "330", "340", "350", "360", "370", "380", "390", "400", "410", "420", "430",
	"440", "450", "460", "470", "480", "490", "500", "510", "520", "530"
];
exports.EN_THEME = [
	"e05", "e08", "e12", "e13", "e15",
	"e18", "e20", "e43"
];
exports.IJP_EXCEPT = [
];
exports.KO_IJP = exports.KO_INJEONG.concat(exports.KO_THEME).filter(function (item) { return !exports.IJP_EXCEPT.includes(item); });
exports.EN_IJP = exports.EN_INJEONG.concat(exports.EN_THEME).filter(function (item) { return !exports.IJP_EXCEPT.includes(item); });
exports.REGION = {
	'en': "en",
	'ko': "kr"
};
exports.KOR_STRICT = /(^|,)(1|INJEONG)($|,)/;
exports.KOR_GROUP = new RegExp("(,|^)(" + [
	"0", "1", "3", "7", "8", "11", "9",
	"16", "15", "17", "2", "18", "20", "26", "19",
	"INJEONG"
].join('|') + ")(,|$)");
exports.ENG_ID = /^[a-z]+$/i;
exports.KOR_FLAG = {
	LOANWORD: 1, // 외래어
	INJEONG: 2,	// 어인정
	SPACED: 4, // 띄어쓰기를 해야 하는 어휘
	SATURI: 8, // 방언
	OLD: 16, // 옛말
	MUNHWA: 32 // 문화어
};
exports.WP_REWARD = function () {
	return 10 + Math.floor(Math.random() * 91);
};
exports.getRule = function (mode) {
	return exports.RULE[exports.GAME_TYPE[mode]];
};
