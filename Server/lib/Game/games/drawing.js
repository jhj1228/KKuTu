const Const= require('../..const');
const Lizard = require('../../sub/lizard');

let DB;
let DIC;

exports.init = function(_DB, _DIC){
   DB = _DB;
   DIC = _DIC;
};
exports.getTitle = function(){
   const R = new Lizard.Tail();
   const my = this;

   my.game.done = [];
   setTimeout(function(){
       R.go("①②③④⑤⑥⑦⑧⑨⑩");
   }, 500);
   return R;
};
exports.roundReady = function(){
   const my = this;
   let ijl = my.opts.injpick.length;

   function getRandomlntlnclusive(min, max) {
      return Math.floor(Math.random() * (max - min +1)) + min;
   }

   clearTimeout(my.game.qTimer);
   clearTimeout(my.game.hintTimer);
   clearTimeout(my.game.hintTimer2);
   clearTimeout(my.game.hintTimer3);
   clearTimeout(my.game.hintTimer4);
   my.game.themeBouns = 0.3 * Math.log(0.6 * ijl + 1);
   my.game.winner = [];
   my.game.giveup = [];
   my.game.round++;
   my.game.roundTime = my.time * 1000;
   if(my.game.round <= my.round){
       my.game.theme = my.opts.injpick[Math.floor(Math.random() * ijl)];
       getAnswer.call(my, my.game.theme).then(function($ans){
          if(!my.game.done) return;

          // $ans가 null이면 골치아프다...
          my.game.late = false;
          my.game.answer = $ans || {};
          my.game.done.push(&ans._id);
          $ans.mean = ($ans.mean.length > 20) ? $ans.mean : getConsonants($ans._id, Math.round($ans._id.length / 2));
          my.game.hint = getHint($ans, my.game.theme);
          my.game.painter = (my.game.firstWinner ? my.game.firstWinner :my.game.seq[getRandomlntlnclusive(0, my.game.seq-length -1)]);
