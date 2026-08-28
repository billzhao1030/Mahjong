/* =====================================================================
 * i18n.js — Chinese / English strings and the tutorial content
 * ===================================================================== */
(function (global) {
  'use strict';

  var STR = {
    zh: {
      title: '国标麻将', subtitle: '中国麻将竞赛规则 · 四圈十六局',
      newGame: '开始新游戏', continueGame: '继续游戏', career: '生涯档案',
      manual: '胡牌手册', tutorial: '规则讲解', lang: 'English',
      overview: '概览', turnNo: '巡目', tracker: '牌张追踪', trackerHint: '未出现的张数（含你手牌已扣除）',
      players: '四家情况', waitFan: '听牌与番数', remaining: '剩余', discardCount: '打出',
      byDiscard: '点和', bySelfDraw: '自摸', notEnoughFan: '不够番', discardTo: '打出',
      thenWait: '后听', noTenpai: '当前无法听牌', myHandLabel: '我的手牌',
      matchProgress: '本场进度', handsPlayed: '已打', dealerMark: '庄家',
      difficulty: '难度', difficultyTitle: '选择难度',
      diffNovice: '新手', diffNoviceD: '只顾向听数，不看番种，鸣牌不管能不能胡。破绽很多。',
      diffNormal: '普通', diffNormalD: '会算有效进张和番型潜力，字牌取舍合理，稳健推进。',
      diffExpert: '高手', diffExpertD: '规划番型目标（清一色/碰碰和等），评估听牌威胁，落后时打安全牌弃和。',
      diffMaster: '大师', diffMasterD: '在高手之上：用算番引擎逐张核算每种听牌到底能不能和、值多少番，绝不做够不到起胡番的牌，鸣牌与弃和都更果断。',
      luck: '运气', luckTitle: '运气',
      luckHint: '50% 为公平对局。调高后你更容易摸到需要的牌，别家也更容易打出你能吃碰杠胡的牌；调低则相反。牌的总张数不变，只改变尚未摸到的顺序。',
      luckFair: '公平', luckGood: '顺风', luckBad: '逆风',
      setupTitle: '新游戏设置',
      example: '牌例', exampleWin: '和牌张', exampleMelded: '副露',
      minFanTitle: '选择起胡番数', minFanHint: '整场 16 局使用同一设置，中途不可更改。',
      minFan0: '0 番', minFan0d: '练习模式，任何胡牌牌型都可和牌。',
      minFan4: '4 番', minFan4d: '入门模式，节奏更快。',
      minFan8: '8 番', minFan8d: '国标标准，正式比赛使用。',
      start: '开始', cancel: '取消', back: '返回', close: '关闭', confirm: '确定',
      noSave: '没有未完成的对局', saveFound: '发现存档',
      resumeHand: '第 {n} 局 · {round}圈 · 你的分数 {score}',
      round: '圈', hand: '局', dealer: '庄', wallLeft: '余牌',
      east: '东', south: '南', west: '西', north: '北',
      you: '你', right: '下家', across: '对家', left: '上家',
      chi: '吃', peng: '碰', gang: '杠', hu: '胡', pass: '过',
      angang: '暗杠', bukan: '补杠', selfDraw: '自摸', discard: '打出',
      yourTurn: '轮到你了', discardPrompt: '请打出一张牌',
      claimPrompt: '{who} 打出 {tile}',
      robPrompt: '{who} 补杠 {tile} — 可以抢杠和',
      stats: '本局统计', statsTitle: '本局实况',
      handEnd: '本局结束', matchEnd: '全场结束',
      winBy: '{who} 和牌', winSelf: '{who} 自摸', drawGame: '荒牌',
      dealIn: '点炮：{who}', fanTotal: '共 {n} 番', score: '得分',
      nextHand: '下一局', viewResult: '查看结算', backToMenu: '返回主菜单',
      finalScore: '最终得分', rank: '名次',
      minFanLabel: '起胡番数', tilesLeft: '剩余牌数', myWaits: '听牌',
      notTenpai: '未听牌', shantenN: '距听牌 {n} 张', tenpai: '已听牌',
      flowers: '花牌', melds: '副露', discardsOf: '{who} 的牌河',
      careerEmpty: '还没有对局记录', matches: '总场数', matchWins: '获胜场数',
      handsTotal: '总局数', handsWon: '和牌局数', handsLost: '负局数',
      handsDrawn: '荒牌局数', dealtIn: '点炮次数', selfDraws: '自摸次数',
      winRate: '和牌率', bestFan: '最佳和牌', totalPoints: '累计得分',
      patternsGot: '已达成番种', patternCount: '{n} / {total} 种',
      recentHands: '最近对局', resetProfile: '清空档案', resetConfirm: '确定要清空所有生涯数据和存档吗？',
      searchFan: '搜索番种…', allFans: '全部番种',
      saved: '已保存', autoSaved: '进度已自动保存',
      quitConfirm: '离开会保存当前进度，确定返回主菜单吗？',
      tutorialTitle: '国标麻将规则讲解',
      manualTitle: '胡牌手册 · 番种一览',
      fanValue: '番', times: '次', never: '未达成',
      exitGame: '返回', menu: '菜单',
      sortHand: '理牌', pointsBase: '底分',
      handNoLabel: '第 {n} 局 / 16',
      paymentSelf: '三家各付 {n}', paymentDeal: '点炮付 {a}，另两家各付 {b}',
      noWinYet: '本局尚未结束', tileWall: '牌墙',
      seatWind: '门风', roundWind: '圈风',
      cannotHu: '番数不足，无法和牌（需 {n} 番）',
      readyHint: '听 {tiles}'
    },
    en: {
      title: 'Chinese Official Mahjong', subtitle: 'MCR · 4 rounds, 16 hands',
      newGame: 'New Game', continueGame: 'Continue', career: 'Career',
      manual: 'Fan Manual', tutorial: 'How to Play', lang: '中文',
      overview: 'Overview', turnNo: 'Turn', tracker: 'Tile tracker', trackerHint: 'copies not yet seen (your hand excluded)',
      players: 'Players', waitFan: 'Waits and fan', remaining: 'left', discardCount: 'Discarded',
      byDiscard: 'by discard', bySelfDraw: 'self-draw', notEnoughFan: 'below minimum', discardTo: 'Discard',
      thenWait: '→ waits on', noTenpai: 'Cannot reach a ready hand yet', myHandLabel: 'My hand',
      matchProgress: 'Match progress', handsPlayed: 'played', dealerMark: 'dealer',
      difficulty: 'Difficulty', difficultyTitle: 'Choose difficulty',
      diffNovice: 'Novice', diffNoviceD: 'Chases speed only, ignores fan, and melds into hands it can never declare.',
      diffNormal: 'Standard', diffNormalD: 'Counts useful tiles and rough fan potential, handles honours sensibly.',
      diffExpert: 'Expert', diffExpertD: 'Plans a fan goal, reads threats, and folds with safe tiles when behind.',
      diffMaster: 'Master', diffMasterD: 'Above Expert: runs the scoring engine over every candidate wait, never melds into a hand it could not declare, and folds decisively.',
      luck: 'Luck', luckTitle: 'Luck',
      luckHint: '50% is a fair deal. Higher and you draw what you need more often, and the bots part with tiles you can claim; lower and the reverse. Tile counts never change — only the order of the tiles still to come.',
      luckFair: 'fair', luckGood: 'in your favour', luckBad: 'against you',
      setupTitle: 'New match',
      example: 'Example', exampleWin: 'winning tile', exampleMelded: 'melded',
      minFanTitle: 'Choose the minimum fan', minFanHint: 'Applies to all 16 hands and cannot be changed mid-match.',
      minFan0: '0 fan', minFan0d: 'Practice: any legal hand may be declared.',
      minFan4: '4 fan', minFan4d: 'Beginner friendly, faster hands.',
      minFan8: '8 fan', minFan8d: 'Official MCR tournament setting.',
      start: 'Start', cancel: 'Cancel', back: 'Back', close: 'Close', confirm: 'OK',
      noSave: 'No unfinished match', saveFound: 'Saved match found',
      resumeHand: 'Hand {n} · {round} round · your score {score}',
      round: 'Round', hand: 'Hand', dealer: 'Dealer', wallLeft: 'Wall',
      east: 'East', south: 'South', west: 'West', north: 'North',
      you: 'You', right: 'Right', across: 'Across', left: 'Left',
      chi: 'Chow', peng: 'Pung', gang: 'Kong', hu: 'Win', pass: 'Pass',
      angang: 'Concealed kong', bukan: 'Added kong', selfDraw: 'Self-draw', discard: 'Discard',
      yourTurn: 'Your turn', discardPrompt: 'Choose a tile to discard',
      claimPrompt: '{who} discarded {tile}',
      robPrompt: '{who} is adding {tile} to a pung — you may rob the kong',
      stats: 'Hand stats', statsTitle: 'Current hand',
      handEnd: 'Hand over', matchEnd: 'Match over',
      winBy: '{who} wins', winSelf: '{who} self-draws', drawGame: 'Exhaustive draw',
      dealIn: 'Discarded by {who}', fanTotal: '{n} fan total', score: 'Score',
      nextHand: 'Next hand', viewResult: 'Result', backToMenu: 'Main menu',
      finalScore: 'Final score', rank: 'Place',
      minFanLabel: 'Minimum fan', tilesLeft: 'Tiles left', myWaits: 'Waiting on',
      notTenpai: 'Not ready', shantenN: '{n} away from ready', tenpai: 'Ready',
      flowers: 'Flowers', melds: 'Melds', discardsOf: "{who}'s discards",
      careerEmpty: 'No games recorded yet', matches: 'Matches', matchWins: 'Matches won',
      handsTotal: 'Hands played', handsWon: 'Hands won', handsLost: 'Hands lost',
      handsDrawn: 'Draws', dealtIn: 'Dealt in', selfDraws: 'Self-draws',
      winRate: 'Win rate', bestFan: 'Best win', totalPoints: 'Net points',
      patternsGot: 'Patterns achieved', patternCount: '{n} / {total}',
      recentHands: 'Recent hands', resetProfile: 'Reset career', resetConfirm: 'Erase all career data and saved games?',
      searchFan: 'Search fan…', allFans: 'All fan types',
      saved: 'Saved', autoSaved: 'Progress saved automatically',
      quitConfirm: 'Your progress will be saved. Return to the main menu?',
      tutorialTitle: 'How Chinese Official Mahjong works',
      manualTitle: 'Fan Manual',
      fanValue: 'fan', times: '×', never: 'not yet',
      exitGame: 'Back', menu: 'Menu',
      sortHand: 'Sort', pointsBase: 'base',
      handNoLabel: 'Hand {n} / 16',
      paymentSelf: 'each pays {n}', paymentDeal: 'discarder pays {a}, others {b} each',
      noWinYet: 'Hand still in progress', tileWall: 'Wall',
      seatWind: 'Seat wind', roundWind: 'Prevalent wind',
      cannotHu: 'Not enough fan to declare ({n} required)',
      readyHint: 'waiting on {tiles}'
    }
  };

  var TUTORIAL = {
    zh: [
      { h: '一、牌张与局制', p: [
        '全副 144 张：万、筒、条各 1–9 每种 4 张（108 张），东南西北风牌各 4 张（16 张），中发白箭牌各 4 张（12 张），另加春夏秋冬梅兰竹菊 8 张花牌。',
        '一场比赛打 4 圈共 16 局：圈风依次为东、南、西、北，每圈 4 局。国标不连庄，无论谁和牌，庄家都按逆时针顺移一位，所以每人在每圈各坐一次庄。',
        '门风由座位相对庄家的位置决定：庄家为东，其下家为南，再下为西、北。圈风刻与门风刻各计 2 番，若东圈东家做出东风刻，可同时计圈风刻、门风刻和幺九刻，共 5 番。'
      ] },
      { h: '二、行牌流程', p: [
        '庄家 14 张起手，其余三家各 13 张。摸到花牌立即亮出并从牌墙尾补一张。',
        '轮到自己时先摸一张，然后打出一张。别人打出的牌，你可以吃（仅限上家）、碰、杠或和；优先级为和 > 碰/杠 > 吃。',
        '杠分三种：暗杠（手中四张）、明杠（碰别人打出的第四张）、补杠（在已碰的刻子上加第四张）。开杠后从牌墙尾补摸一张，用补摸的牌自摸和牌计"杠上开花"8 番。',
        '别人补杠时，如果那张牌正好能让你和牌，可以"抢杠和"，计 8 番。',
        '牌墙摸完仍无人和牌即为荒牌，本局不计分，直接进入下一局。'
      ] },
      { h: '三、起胡番数', p: [
        '国标标准起和番为 8 番：和牌时番数总和必须达到 8 番才能宣布和牌，花牌的番不计入这个门槛。',
        '这里有个有趣的规则：如果一手牌完全没有任何番种可计，反而可以计"无番和"8 番，正好达标。但若只凑出 1–7 番（例如只有"无字"1 番），则不能和牌。',
        '本游戏允许把门槛调成 0 番或 4 番，方便练习；正式国标请使用 8 番。'
      ] },
      { h: '四、计分方式', p: [
        '底分为 8 分。自摸时，另外三家每家支付 8 + 番数，和牌者共得 24 + 3×番数。',
        '点和（吃别人打出的牌）时，点炮者支付 8 + 番数，其余两家各支付 8 分，和牌者共得 24 + 番数。',
        '荒牌不计分。16 局结束后按累计分数排名。'
      ] },
      { h: '五、算番五原则', p: [
        '不重复原则：已经计算过的番，不能重复再计。',
        '不拆移原则：已组成某一番种的牌，不能拆开或移动去凑另一个番种。',
        '不得相同原则：同一番种不得重复计算（幺九刻、箭刻、一般高等注明可累计的除外）。',
        '就高不就低原则：一手牌有多种解释时，取番数最高的一种。',
        '套算一次原则：一副牌与其他牌组只能套算一次。'
      ] },
      { h: '六、界面操作', p: [
        '你的手牌在下方，会自动按条、筒、万、风、箭理牌。点击一张牌即可打出。',
        '可以吃、碰、杠、和时，屏幕下方会弹出对应按钮；不想操作就点"过"。',
        '点击右上角的"本局统计"随时查看牌河、副露、余牌和自己的听牌情况。',
        '进度会自动保存，从主菜单的"继续游戏"可以接着打完剩下的局数。'
      ] }
    ],
    en: [
      { h: '1. Tiles and match structure', p: [
        'A full set is 144 tiles: 1–9 in characters, dots and bamboo (four of each, 108 tiles), four of each wind (16), four of each dragon (12), plus 8 single flower tiles.',
        'A match is 4 rounds of 4 hands each — 16 hands in total. The prevalent wind runs East, South, West, North. MCR has no repeated dealership: the deal always passes counter-clockwise, so everyone deals once per round.',
        'Your seat wind depends on your position relative to the dealer: the dealer is East, the next player South, then West and North. Prevalent Wind and Seat Wind are worth 2 fan each — an East pung as East dealer in the East round scores Prevalent Wind + Seat Wind + Pung of Terminals or Honours = 5 fan.'
      ] },
      { h: '2. Playing a hand', p: [
        'The dealer starts with 14 tiles, everyone else with 13. Flowers are exposed immediately and replaced from the back of the wall.',
        'On your turn you draw one tile and discard one. From a discard you may chow (only from the player to your left), pung, kong or win. Priority is win > pung/kong > chow.',
        'Kongs come in three kinds: concealed (four in hand), melded (claiming a fourth discard) and added (adding a fourth tile to your own pung). After a kong you draw a replacement from the back of the wall; winning on it scores Out with Replacement Tile, 8 fan.',
        'If someone adds a tile to a pung and that tile completes your hand, you may rob the kong for 8 fan.',
        'If the wall runs out with nobody winning, the hand is a draw and nobody scores.'
      ] },
      { h: '3. The minimum fan', p: [
        'The official minimum is 8 fan: your hand must be worth at least 8 fan before you may declare a win. Flowers do not count toward this threshold.',
        'A quirk worth knowing: a hand that scores nothing at all instead scores Chicken Hand for exactly 8 fan and is therefore legal. But a hand worth only 1–7 fan (say just No Honors, 1 fan) cannot be declared.',
        'This game lets you lower the threshold to 0 or 4 fan for practice. Use 8 for real MCR play.'
      ] },
      { h: '4. Scoring', p: [
        'The base value is 8 points. On a self-draw each of the other three players pays 8 + fan, so the winner gains 24 + 3×fan.',
        'On a discard the player who discarded pays 8 + fan and the other two pay 8 each, so the winner gains 24 + fan.',
        'Nobody scores on a drawn hand. After 16 hands the cumulative scores decide the placings.'
      ] },
      { h: '5. The five scoring principles', p: [
        'No repeats: a fan already counted cannot be counted again.',
        'No splitting: tiles that already form one fan may not be broken up or reused to form another.',
        'No identical fan: the same fan is not counted twice, except where the table explicitly allows it (Pung of Terminals, Dragon Pung, Pure Double Chow…).',
        'Highest wins: when a hand can be read several ways, the highest-scoring reading is used.',
        'One combination only: a set may combine with other sets only once.'
      ] },
      { h: '6. Using this table', p: [
        'Your hand sits along the bottom and is sorted automatically by bamboo, dots, characters, winds, dragons. Click a tile to discard it.',
        'When you may chow, pung, kong or win, the buttons appear below the table. Press Pass to decline.',
        'Open Hand stats at any time to see every discard pile, the melds, the tiles left in the wall and what you are waiting on.',
        'Progress saves automatically — pick Continue from the main menu to finish the remaining hands later.'
      ] }
    ]
  };

  var lang = 'zh';
  function t(key, vars) {
    var s = (STR[lang] && STR[lang][key]) || (STR.zh[key]) || key;
    if (vars) for (var k in vars) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  }
  function setLang(l) { lang = (l === 'en') ? 'en' : 'zh'; }
  function getLang() { return lang; }

  global.MJ = global.MJ || {};
  global.MJ.I18n = { t: t, setLang: setLang, getLang: getLang, STR: STR, TUTORIAL: TUTORIAL };
})(typeof window !== 'undefined' ? window : globalThis);
