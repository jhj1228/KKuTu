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

var MODE;
var BEAT = [null,
	"10000000",
	"10001000",
	"10010010",
	"10011010",
	"11011010",
	"11011110",
	"11011111",
	"11111111"
];
var NULL_USER = {
	profile: { title: L['null'] },
	data: { score: 0 }
};
var MOREMI_PART;
var AVAIL_EQUIP;
var RULE;
var OPTIONS;
var MAX_LEVEL = 360;
var TICK = 30;
var EXP = [];
var BAD = new RegExp(["느으*[^가-힣]*금마?", "니[^가-힣]*(엄|앰|엠)", "(ㅄ|ㅅㅂ|ㅂㅅ)", "미친(년|놈)?", "(병|븅|빙)[^가-힣]*신", "보[^가-힣]*지", "(새|섀|쌔|썌)[^가-힣]*(기|끼)", "섹[^가-힣]*스", "(시|씨|쉬|쒸)이*입?[^가-힣]*(발|빨|벌|뻘|팔|펄)", "십[^가-힣]*새", "씹", "(애|에)[^가-힣]*미", "자[^가-힣]*지", "존[^가-힣]*나", "좆|죶", "지랄", "창[^가-힣]*(녀|년|놈)", "fuck", "sex"].join('|'), "g");

var ws, rws;
var $stage;
$audiosets = [
	[
		{
			key: "lobby",
			value: "/media/kkutu/LobbyBGM.mp3"
		},
		{
			key: "lobbyseol",
			value: "/media/kkutu/LobbySeolBGM.mp3"
		},
		{
			key: "lobbuoriginal",
			value: "/media/kkutu/LobbyBGM.mp3"
		},
		{
			key: "lobbyending",
			value: "/media/kkutu/LobbyBGMending.mp3"
		},
		{
			key: "inthepool",
			value: "/media/kkutu/LobbyINTHEPOOL.mp3"
		},
		{
			key: "enchanted",
			valye: "/media/kkutu/LobbyEnchantedlove.mp3"
		},
		{
			key: "k",
			value: "/media/kkutu/k.mp3"
		},
		{
			key: "jaqwi",
			value: "/media/kkutu/JaqwiBGM.mp3"
		},
		{
			key: "jaqwiF",
			value: "/media/kkutu/JaqwiFastBGM.mp3"
		},
		{
			key: "game_start",
			value: "/media/kkutu/game_start.mp3"
		},
		{
			key: "round_start",
			value: "/media/kkutu/round_start.mp3"
		},
		{
			key: "fail",
			value: "/media/kkutu/fail.mp3"
		},
		{
			key: "lvup",
			value: "/media/kkutu/lvup.mp3"
		},
		{
			key: "Al",
			value: "/media/kkutu/Al.mp3"
		},
		{
			key: "success",
			value: "/media/kkutu/success.mp3"
		},
		{
			key: "missing",
			value: "/media/kkutu/missing.mp3"
		},
		{
			key: "mission",
			value: "/media/kkutu/mission.mp3"
		},
		{
			key: "kung",
			value: "/media/kkutu/kung.mp3"
		},
		{
			key: "horr",
			value: "/media/kkutu/horr.mp3"
		},
		{
			key: "timeout",
			value: "/media/kkutu/timeout.mp3"
		}
	]
];
for (i = 0; i <= 10; i++) $audiosets[0].push(
	{
		key: "T" + i,
		value: "/media/kkutu/T" + i + ".mp3"
	},
	{
		key: "K" + i,
		value: "/media/kkutu/K" + i + ".mp3"
	},
	{
		key: "As" + i,
		value: "/media/kkutu/As" + i + ".mp3"
	}
)
var $sound = {};
var $_sound = {}; // 현재 재생 중인 것들
var $data = {};
var $lib = { Classic: {}, Jaqwi: {}, Crossword: {}, Typing: {}, Hunmin: {}, Daneo: {}, Sock: {}, Drawing: {}, Moqwi: {}, All: {} };
var $rec;
var mobile;

var audioContext = window.hasOwnProperty("AudioContext") ? (new AudioContext()) : false;
var _WebSocket = window['WebSocket'];
var _setInterval = setInterval;
var _setTimeout = setTimeout;