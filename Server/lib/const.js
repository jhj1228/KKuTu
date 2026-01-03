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
	'man': { name: "Manner" },
	'gte': { name: "Gentle" },
	'ext': { name: "Injeong" },
	'mis': { name: "Mission" },
	'rdm': { name: "Randommission" },
	'loa': { name: "Loanword" },
	'prv': { name: "Proverb" },
	'str': { name: "Strict" },
	'k32': { name: "Sami" },
	'no2': { name: "No2" },
	'ulm': { name: "Unlimited" },
	'sht': { name: "Short" },
	'rtn': { name: "Return" },
	'rdt': { name: "Randomturn" },
	'unw': { name: "Unknownword" },
	'bom': { name: "Boom" },
	'rvs': { name: "Reverse" },
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
	'KKT': {
		lang: "ko",
		rule: "Classic",
		opts: ["man", "gte", "ext", "mis", "rdm", "loa", "str", "k32", "rtn", "rdt", "unw", "bom", "rvs"],
		time: 1,
		ai: true,
		big: false,
		ewq: true
	},
	'KSH': {
		lang: "ko",
		rule: "Classic",
		opts: ["man", "gte", "ext", "mis", "rdm", "loa", "str", "rtn", "rdt", "unw", "bom", "rvs"],
		time: 1,
		ai: true,
		big: false,
		ewq: true
	},
	'CSQ': {
		lang: "ko",
		rule: "Jaqwi",
		opts: ["ijp"],
		time: 1,
		ai: true,
		big: false,
		ewq: false
	},
	'KCW': {
		lang: "ko",
		rule: "Crossword",
		opts: [],
		time: 2,
		ai: false,
		big: true,
		ewq: false
	},
	'KTY': {
		lang: "ko",
		rule: "Typing",
		opts: ["prv"],
		time: 1,
		ai: false,
		big: false,
		ewq: false
	},
	'KAP': {
		lang: "ko",
		rule: "Classic",
		opts: ["man", "gte", "ext", "mis", "rdm", "loa", "str", "rtn", "rdt", "unw", "bom", "rvs"],
		time: 1,
		ai: true,
		big: false,
		_back: true,
		ewq: true
	},
	'HUN': {
		lang: "ko",
		rule: "Hunmin",
		opts: ["ext", "mis", "rdm", "loa", "str", "rtn", "rdt", "bom", "rvs"],
		time: 1,
		ai: true,
		big: false,
		ewq: true
	},
	'KDA': {
		lang: "ko",
		rule: "Daneo",
		opts: ["ijp", "mis", "rdm", "rtn", "rdt", "bom", "rvs"],
		time: 1,
		ai: true,
		big: false,
		ewq: true
	},
	'KSS': {
		lang: "ko",
		rule: "Sock",
		opts: ["no2"],
		time: 1,
		ai: false,
		big: true,
		ewq: false
	},
	'KMH': {
		lang: "ko",
		rule: "Classic",
		opts: ["man", "gte", "ext", "mis", "rdm", "loa", "str", "rtn", "rdt", "unw", "bom", "rvs"],
		time: 1,
		ai: true,
		big: false,
		ewq: false
	},
	'KKK': {
		lang: "ko",
		rule: "Classic",
		opts: ["man", "gte", "ext", "mis", "rdm", "loa", "str", "rtn", "rdt", "unw", "bom", "rvs"],
		time: 1,
		ai: true,
		big: false,
		ewq: false
	},
	'MOQ': {
		lang: "ko",
		rule: "Moqwi",
		opts: ["ijp"],
		time: 1,
		ai: true,
		big: false,
		ewq: false
	},
	'ALL': {
		lang: "ko",
		rule: "All",
		opts: ["mis", "rdm", "rtn", "rdt", "bom", "rvs"],
		time: 1,
		ai: true,
		big: false,
		ewq: true
	},
	'KTT': {
		lang: "ko",
		rule: "Typing",
		opts: ["ijp"],
		time: 1,
		ai: false,
		big: false,
		ewq: false
	},
	'KRH': {
		lang: "ko",
		rule: "Classic",
		opts: ["man", "gte", "ext", "mis", "rdm", "loa", "str", "rtn", "rdt", "unw", "bom", "rvs"],
		time: 1,
		ai: true,
		big: false,
		ewq: true
	}
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
	"IMS", // THE iDDOLM@STER
	"VOC", // VOCALOID
	"RAG", // 간식
	"NEX", // 게임
	"AIR", // 공항
	"KTV", // 국내 방송 프로그램
	"CPY", // 기업
	"NFX", // 넷플릭스
	"KOT", // 대한민국 철도역
	"DOT", // 도타 2
	"THP", // 동방 프로젝트
	"JLN", // 라이트 노벨
	"LVL", // 러브 라이브!
	"LOL", // 리그 오브 레전드
	"MMM", // 마법소녀 마도카☆마기카
	"MIN", // 마인크래프트
	"CTH", // 문화재
	"JAN", // 만화/애니메이션
	"MAP", // 메이플스토리
	"BGP", // 뱅드림! 걸즈 밴드 파티!
	"BUS", // 버스터미널
	"BLA", // 블루 아카이브
	"CYP", // 사이퍼즈
	"NVL", // 소설
	"STA", // 스타크래프트
	"ESB", // 앙상블 스타즈!
	"KMV", // 영화
	"ELW", // 엘소드
	"OVW", // 오버워치
	"WOW", // 월드 오브 워크래프트
	"WEB", // 웹툰
	"KPO", // 유명인
	"JPT", // 일본 철도역
	"CFE", // 자격/면허
	"ZEL", // 젤다의 전설
	"CKR", // 쿠키런
	"TCG", // 트릭컬 리바이브
	"POK", // 포켓몬스터
	"PCR", // 프린세스 커넥트! Re:Dive
	"HSS", // 하스스톤
	"HAK", // 학교
	"KMU", // 한국 대중음악
	"KRP", // 한국 라디오 프로그램
	"HOS" // 히어로즈 오브 더 스톰
];
exports.EN_INJEONG = [
	"LOL"
];
exports.KO_THEME = [
	"30", "40", "60", "80", "90",
	"140", "150", "160", "170", "190",
	"220", "230", "240", "270", "310",
	"320", "350", "360", "420", "430",
	"450", "490", "530"
];
exports.EN_THEME = [
	"e05", "e08", "e12", "e13", "e15",
	"e18", "e20", "e43"
];
exports.IJP_EXCEPT = [
	"OIJ"
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
