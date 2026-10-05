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

const Spawn = require("child_process").spawn;
const JLog = require("./lib/sub/jjlog");
const PKG = require("./package.json");
const LANG = require("../language.json");
const SETTINGS = require("../settings.json");
const SCRIPTS = {
	'server-on': startServer,
	'server-off': stopServer,
	'web-server-on': startWebServer,
	'web-server-off': stopWebServer,
	'game-server-on': startGameServers,
	'game-server-off': stopGameServers,
	'program-info': () => {
		exports.send('alert', [
			`=== ${PKG.name} ===`,
			`${PKG.description}`, "",
			`Version: ${PKG.version}`,
			`Author: ${PKG.author}`,
			`License: ${PKG.license}`,
			`Repository: ${PKG.repository}`
		].join('\n'));
	},
	'program-blog': () => exports.send('external', "http://blog.jjo.kr/"),
	'program-repo': () => exports.send('external', "https://github.com/JJoriping/KKuTu"),
	'exit': () => process.exit(0)
};
exports.MAIN_MENU = [
	{
		label: LANG['menu-server'],
		submenu: [
			{
				label: LANG['menu-server-on'],
				accelerator: "CmdOrCtrl+O",
				click: () => exports.run("server-on")
			},
			{
				label: LANG['menu-server-off'],
				accelerator: "CmdOrCtrl+P",
				click: () => exports.run("server-off")
			},
			{ type: "separator" },
			{
				label: LANG['menu-web-server-on'],
				accelerator: "CmdOrCtrl+Alt+O",
				click: () => exports.run("web-server-on")
			},
			{
				label: LANG['menu-web-server-off'],
				accelerator: "CmdOrCtrl+Alt+P",
				click: () => exports.run("web-server-off")
			},
			{ type: "separator" },
			{
				label: LANG['menu-game-server-on'],
				accelerator: "CmdOrCtrl+Shift+O",
				click: () => exports.run("game-server-on")
			},
			{
				label: LANG['menu-game-server-off'],
				accelerator: "CmdOrCtrl+Shift+P",
				click: () => exports.run("game-server-off")
			}
		]
	},
	{
		label: LANG['menu-program'],
		submenu: [
			{
				label: LANG['menu-program-info'],
				click: () => exports.run("program-info")
			},
			{
				label: LANG['menu-program-blog'],
				click: () => exports.run("program-blog")
			},
			{
				label: LANG['menu-program-repo'],
				click: () => exports.run("program-repo")
			},
			{
				label: LANG['menu-program-dev'],
				role: "toggledevtools"
			},
			{ type: "separator" },
			{
				label: LANG['menu-program-exit'],
				accelerator: "Alt+F4",
				click: () => exports.run("exit")
			}
		]
	}
];
exports.run = (cmd) => {
	SCRIPTS[cmd]();
};
exports.send = (...argv) => {
	// override this
};

class ChildProcess {
	constructor(id, cmd, ...argv) {
		this.process = Spawn(cmd, argv);
		this.process.stdout.on('data', msg => {
			const lines = msg.toString().split(/(\r?\n)/g);
			for (let i of lines) if (i) exports.send('log', 'n', i);
		});
		this.process.stderr.on('data', msg => {
			const lines = msg.toString().split(/(\r?\n)/g);
			for (let i of lines) {
				if (i) {
					console.error(`${id}: ${i}`);
					exports.send('log', 'e', i);
				}
			}
		});
		this.process.on('close', code => {
			let msg, onClose = this.onClose;

			this.process.removeAllListeners();
			JLog.error(msg = `${id}: 코드로 닫힘 ${code}`);
			this.process = null;
			this.onClose = null;

			exports.send('log', 'e', msg);
			exports.send('server-status', getServerStatus());
			if (onClose) onClose();
		});
	}
	kill(sig, onClose) {
		if (this.process) {
			this.onClose = onClose;
			this.process.kill(sig || 'SIGINT');
		} else if (onClose) {
			onClose();
		}
	}
}
let webServer, gameServers;

function isRunning(child) {
	return child && child.process;
}

function startServer() {
	startWebServer();
	startGameServers();
}

function stopServer() {
	stopWebServer();
	stopGameServers();
}

function startWebServer() {
	if (isRunning(webServer)) {
		stopWebServer(startWebServer);
		return;
	}

	if (SETTINGS['server-name']) process.env['KKT_SV_NAME'] = SETTINGS['server-name'];
	webServer = new ChildProcess('W', "node", `${__dirname}/lib/Web/cluster.js`, SETTINGS['web-num-cpu']);
	exports.send('server-status', getServerStatus());
}

function stopWebServer(onComplete) {
	if (webServer) webServer.kill(null, onComplete);
	else if (onComplete) onComplete();
}

function startGameServers() {
	if (gameServers && gameServers.some(isRunning)) {
		stopGameServers(startGameServers);
		return;
	}

	if (!gameServers) gameServers = [];
	for (let i = 0; i < SETTINGS['game-num-inst']; i++) {
		if (!isRunning(gameServers[i])) {
			gameServers[i] = new ChildProcess('G', "node", `${__dirname}/lib/Game/cluster.js`, i, SETTINGS['game-num-cpu']);
		}
	}
	exports.send('server-status', getServerStatus());
}

function stopGameServers(onComplete) {
	const runningServers = gameServers ? gameServers.filter(isRunning) : [];
	if (!runningServers.length) {
		if (onComplete) onComplete();
		return;
	}

	let remaining = runningServers.length;
	const onServerClosed = () => {
		if (--remaining === 0 && onComplete) onComplete();
	};
	runningServers.forEach(v => v.kill(null, onServerClosed));
}

function getServerStatus() {
	if (!webServer || !gameServers) return 0;
	if (webServer.process && gameServers.every(v => v.process)) return 2;
	return 1;
}