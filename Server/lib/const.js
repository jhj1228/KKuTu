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
	// 'bom': { name: "Boom" }, // 폭탄
	// 'rvs': { name: "Reverse" }, // 리버스
	'wpk': { name: "Wordpick" }, // 워드픽
	'ulm': { name: "Unlimited" }, // 무제한
	'due': { name: "Dueum" }, // 두음법칙 금지
	'thw': { name: "Threeword" }, // 3글자
	// 'ddl': { name: "Dodoli" }, // 도돌이 금지
	'fre': { name: "Free" }, // 자유
	'mwd': { name: "Moreword" } // 특수 단어 허용
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
		opts: ["man", "gte", "ext", "mis", "rdm", "loa", "str", "k32", "rtn", "rdt", "due", "mwd"],
		time: 1,
		ai: true,
		big: false,
		ewq: true
	},
	'KSH': { // 끝말잇기
		lang: "ko",
		rule: "Classic",
		opts: ["man", "gte", "ext", "mis", "rdm", "loa", "str", "rtn", "rdt", "unw", "due", "mwd"],
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
		ai: true,
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
		opts: ["man", "gte", "ext", "mis", "rdm", "loa", "str", "rtn", "rdt", "unw", "due", "mwd"],
		time: 1,
		ai: true,
		big: false,
		_back: true,
		ewq: true
	},
	'HUN': { // 훈민정음
		lang: "ko",
		rule: "Hunmin",
		opts: ["ext", "mis", "rdm", "loa", "str", "rtn", "rdt", "thw"],
		time: 1,
		ai: true,
		big: false,
		ewq: true
	},
	'KDA': { // 단어대결
		lang: "ko",
		rule: "Daneo",
		opts: ["ijp", "mis", "rdm", "rtn", "rdt"],
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
		opts: ["man", "gte", "ext", "mis", "rdm", "loa", "str", "rtn", "rdt", "unw", "due", "mwd"],
		time: 1,
		ai: true,
		big: false,
		ewq: false
	},
	'KKK': { // 끄투
		lang: "ko",
		rule: "Classic",
		opts: ["man", "gte", "ext", "mis", "rdm", "loa", "str", "rtn", "rdt", "due", "mwd"],
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
		opts: ["mis", "rdm", "rtn", "rdt", "fre"],
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
		opts: ["man", "gte", "ext", "mis", "rdm", "loa", "str", "rtn", "rdt", "unw", "due", "mwd"],
		time: 1,
		ai: true,
		big: false,
		ewq: true
	},
	'KAT': { // 앞말쿵쿵따
		lang: "ko",
		rule: "Classic",
		opts: ["man", "gte", "ext", "mis", "rdm", "loa", "str", "k32", "rtn", "rdt", "due", "mwd"],
		time: 1,
		ai: true,
		big: false,
		ewq: true
	}
};
exports.getPreScore = function (text, chain, tr) {
	return 2 * (Math.pow(5 + 7 * (text || "").length, 0.74) + 0.88 * (chain || []).length) * (0.5 + 0.5 * tr) * 5;
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
	"IMS", "VOC", "RAG", "NEX",
	"KTV", "CPY", "WOR", "NFX", "KOT", "DOT", "THP",
	"DGM", "JLN", "LVL", "LKT", "LOA", "LOL",
	"MIN", "MAF", "CTH", "BGP", /*"BUT",*/ "BUS",
	"HSR", "BLA", "CYP", "NVL", "STA", "APT", "ESB",
	"ELW", "KMV", "OVW", "GEN", "WOW", "WEB", "UWH",
	"KPO", "ERT", "JPT", "ZEL",
	"CKR", "TCG", "POK", "PJS", "HSS", "HAK", "KMU",
	"KRP", "KAD", "HOS"
];
exports.EN_INJEONG = [
	"LOL", "GTD"
];
exports.KO_THEME = [
	"30", "40", "60", "80", "90",
	"140", "190", "150", "160", "170",
	"220", "230", "240", "270", "310",
	"320", "350", "360", "420", "430",
	"450", "490", "530"
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
