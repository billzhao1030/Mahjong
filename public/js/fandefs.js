/* =====================================================================
 * fandefs.js — the MCR fan table (also powers the in-game 胡牌手册)
 * Each entry: id, v (fan value), zh/en name, dz/de one-line description.
 * ===================================================================== */
(function (global) {
  'use strict';
  var F = [
    /* ---------------- 88 ---------------- */
    { id: 'BIG_FOUR_WINDS', v: 88, zh: '大四喜', en: 'Big Four Winds',
      dz: '东南西北四种风牌各一副刻子（或杠）。', de: 'Pungs/kongs of all four wind tiles.', ex: '111z 222z 333z 444z 55m' },
    { id: 'BIG_THREE_DRAGONS', v: 88, zh: '大三元', en: 'Big Three Dragons',
      dz: '中、发、白三种箭牌各一副刻子（或杠）。', de: 'Pungs/kongs of all three dragons.', ex: '555z 666z 777z 123m 99p' },
    { id: 'ALL_GREEN', v: 88, zh: '绿一色', en: 'All Green',
      dz: '全部由 2、3、4、6、8 条和发财组成。', de: 'Only 2/3/4/6/8 bamboo and the green dragon.', ex: '234s 234s 666s 888s 22s' },
    { id: 'NINE_GATES', v: 88, zh: '九莲宝灯', en: 'Nine Gates',
      dz: '门清一色 1112345678999 再加同花色任意一张。', de: 'Concealed 1112345678999 in one suit plus any tile of it.', ex: '111m 234m 55m 678m 999m', exw: '5m' },
    { id: 'FOUR_KONGS', v: 88, zh: '四杠', en: 'Four Kongs',
      dz: '和牌时有四个杠。', de: 'Four kongs in the hand.', ex: '#1111m *2222p *3333s #5555z 99s' },
    { id: 'SEVEN_SHIFTED_PAIRS', v: 88, zh: '连七对', en: 'Seven Shifted Pairs',
      dz: '同一花色七个连续数序的对子。', de: 'Seven consecutive pairs in one suit.', ex: '11m 22m 33m 44m 55m 66m 77m' },
    { id: 'THIRTEEN_ORPHANS', v: 88, zh: '十三幺', en: 'Thirteen Orphans',
      dz: '十三种幺九字牌各一张，再加其中任意一张。', de: 'One of each terminal/honour plus a duplicate.', ex: '19m 19p 19s 1234567z 5z', exw: '5z' },
    /* ---------------- 64 ---------------- */
    { id: 'ALL_TERMINALS', v: 64, zh: '清幺九', en: 'All Terminals',
      dz: '全部由一、九数牌的刻子组成。', de: 'All pungs of terminals (1s and 9s only).', ex: '111m 999m 111p 999p 11s' },
    { id: 'LITTLE_FOUR_WINDS', v: 64, zh: '小四喜', en: 'Little Four Winds',
      dz: '三副风刻加一对风牌将。', de: 'Three wind pungs plus a pair of the fourth wind.', ex: '111z 222z 333z 44z 567m' },
    { id: 'LITTLE_THREE_DRAGONS', v: 64, zh: '小三元', en: 'Little Three Dragons',
      dz: '两副箭刻加一对箭牌将。', de: 'Two dragon pungs plus a pair of the third dragon.', ex: '555z 666z 77z 123m 456m' },
    { id: 'ALL_HONORS', v: 64, zh: '字一色', en: 'All Honors',
      dz: '全部由风牌、箭牌组成。', de: 'Every tile is a wind or a dragon.', ex: '111z 222z 555z 666z 33z' },
    { id: 'FOUR_CONCEALED_PUNGS', v: 64, zh: '四暗刻', en: 'Four Concealed Pungs',
      dz: '四副暗刻（暗杠计为暗刻）。', de: 'Four concealed pungs (a concealed kong counts).', ex: '111m 333m 555p 777s 99m' },
    { id: 'PURE_TERMINAL_CHOWS', v: 64, zh: '一色双龙会', en: 'Pure Terminal Chows',
      dz: '同花色 123、123、789、789 加 5 作将。', de: 'Same suit 123 123 789 789 with a pair of 5s.', ex: '123m 123m 789m 789m 55m' },
    /* ---------------- 48 ---------------- */
    { id: 'QUADRUPLE_CHOW', v: 48, zh: '一色四同顺', en: 'Quadruple Chow',
      dz: '同花色四副完全相同的顺子。', de: 'Four identical chows in one suit.', ex: '123p 123p 123p 123p 99p' },
    { id: 'FOUR_PURE_SHIFTED_PUNGS', v: 48, zh: '一色四节高', en: 'Four Pure Shifted Pungs',
      dz: '同花色依次递增一位的四副刻子。', de: 'Four pungs in one suit shifted up by one.', ex: '222s 333s 444s 555s 77s' },
    /* ---------------- 32 ---------------- */
    { id: 'FOUR_PURE_SHIFTED_CHOWS', v: 32, zh: '一色四步高', en: 'Four Pure Shifted Chows',
      dz: '同花色四副顺子依次递增 1 位或 2 位。', de: 'Four chows in one suit shifted by 1 or 2.', ex: '123m 345m 567m 789m 11m' },
    { id: 'THREE_KONGS', v: 32, zh: '三杠', en: 'Three Kongs',
      dz: '和牌时有三个杠。', de: 'Three kongs in the hand.', ex: '#1111m *2222p *3333s 456s 99m' },
    { id: 'ALL_TERMINALS_AND_HONORS', v: 32, zh: '混幺九', en: 'All Terminals and Honors',
      dz: '全部由幺九牌和字牌的刻子组成。', de: 'All pungs of terminals and honours.', ex: '111m 999p 111z 555z 99s' },
    /* ---------------- 24 ---------------- */
    { id: 'SEVEN_PAIRS', v: 24, zh: '七对', en: 'Seven Pairs',
      dz: '门清七个对子。', de: 'Seven pairs, concealed.', ex: '11m 33m 55p 77p 22s 44s 99s' },
    { id: 'GREATER_HONORS_AND_KNITTED', v: 24, zh: '七星不靠', en: 'Greater Honors and Knitted',
      dz: '七种字牌各一张，加七张组合龙中的不靠牌。', de: 'All seven honours plus seven knitted tiles.', ex: '1234567z 147m 258p 3s' },
    { id: 'ALL_EVEN_PUNGS', v: 24, zh: '全双刻', en: 'All Even Pungs',
      dz: '全部由 2、4、6、8 的刻子和将组成。', de: 'All pungs made of even simples.', ex: '222m 444p 666s 888m 22p' },
    { id: 'FULL_FLUSH', v: 24, zh: '清一色', en: 'Full Flush',
      dz: '全部由同一种花色的数牌组成。', de: 'The whole hand is one suit, no honours.', ex: '123p 345p 678p 999p 22p' },
    { id: 'PURE_TRIPLE_CHOW', v: 24, zh: '一色三同顺', en: 'Pure Triple Chow',
      dz: '同花色三副完全相同的顺子。', de: 'Three identical chows in one suit.', ex: '*234s 234s 234s 678m 99p' },
    { id: 'PURE_SHIFTED_PUNGS', v: 24, zh: '一色三节高', en: 'Pure Shifted Pungs',
      dz: '同花色依次递增一位的三副刻子。', de: 'Three pungs in one suit shifted up by one.', ex: '333m 444m 555m 789p 66s' },
    { id: 'UPPER_TILES', v: 24, zh: '全大', en: 'Upper Tiles',
      dz: '全部由 7、8、9 组成。', de: 'Every tile is a 7, 8 or 9.', ex: '789m 789p 789s 999m 88p' },
    { id: 'MIDDLE_TILES', v: 24, zh: '全中', en: 'Middle Tiles',
      dz: '全部由 4、5、6 组成。', de: 'Every tile is a 4, 5 or 6.', ex: '456m 456p 456s 444m 55p' },
    { id: 'LOWER_TILES', v: 24, zh: '全小', en: 'Lower Tiles',
      dz: '全部由 1、2、3 组成。', de: 'Every tile is a 1, 2 or 3.', ex: '123m 123p 123s 111m 22p' },
    /* ---------------- 16 ---------------- */
    { id: 'PURE_STRAIGHT', v: 16, zh: '清龙', en: 'Pure Straight',
      dz: '同花色 123、456、789 三副顺子。', de: '123 456 789 all in one suit.', ex: '123s 456s 789s 234m 55p' },
    { id: 'THREE_SUITED_TERMINAL_CHOWS', v: 16, zh: '三色双龙会', en: 'Three-Suited Terminal Chows',
      dz: '两种花色的 123、789，加第三色 5 作将。', de: '123+789 in two suits, pair of 5s in the third.', ex: '123m 789m 123p 789p 55s' },
    { id: 'PURE_SHIFTED_CHOWS', v: 16, zh: '一色三步高', en: 'Pure Shifted Chows',
      dz: '同花色三副顺子依次递增 1 位或 2 位。', de: 'Three chows in one suit shifted by 1 or 2.', ex: '123m 234m 345m 678p 99s' },
    { id: 'ALL_FIVE', v: 16, zh: '全带五', en: 'All Fives',
      dz: '每副牌及将牌都含有 5。', de: 'Every set and the pair contains a 5.', ex: '345m 456m 567p 555s 55p' },
    { id: 'TRIPLE_PUNG', v: 16, zh: '三同刻', en: 'Triple Pung',
      dz: '三种花色数序相同的三副刻子。', de: 'Three pungs of the same number in three suits.', ex: '333m 333p 333s 456m 99p' },
    { id: 'THREE_CONCEALED_PUNGS', v: 16, zh: '三暗刻', en: 'Three Concealed Pungs',
      dz: '三副暗刻。', de: 'Three concealed pungs.', ex: '111m 555p 999s 234m 77p' },
    /* ---------------- 12 ---------------- */
    { id: 'LESSER_HONORS_AND_KNITTED', v: 12, zh: '全不靠', en: 'Lesser Honors and Knitted',
      dz: '由单张的不靠数牌和字牌组成，无对子。', de: 'Fourteen unrelated singles on knitted residues.', ex: '147m 258p 39s 123456z' },
    { id: 'KNITTED_STRAIGHT', v: 12, zh: '组合龙', en: 'Knitted Straight',
      dz: '三种花色的 147、258、369 各一组。', de: '147 / 258 / 369 across the three suits.', ex: '147m 258p 369s 678s 11z' },
    { id: 'UPPER_FOUR', v: 12, zh: '大于五', en: 'Upper Four',
      dz: '全部由 6、7、8、9 组成。', de: 'Every tile is 6 or higher.', ex: '678m 789p 999s 666m 88p' },
    { id: 'LOWER_FOUR', v: 12, zh: '小于五', en: 'Lower Four',
      dz: '全部由 1、2、3、4 组成。', de: 'Every tile is 4 or lower.', ex: '123m 234p 123s 444m 22p' },
    { id: 'BIG_THREE_WINDS', v: 12, zh: '三风刻', en: 'Big Three Winds',
      dz: '三副风牌刻子。', de: 'Three pungs of winds.', ex: '111z 222z 333z 456m 99p' },
    /* ---------------- 8 ---------------- */
    { id: 'MIXED_STRAIGHT', v: 8, zh: '花龙', en: 'Mixed Straight',
      dz: '三种花色分别组成 123、456、789。', de: '123 456 789 spread over the three suits.', ex: '123m 456p 789s 234m 55p' },
    { id: 'REVERSIBLE_TILES', v: 8, zh: '推不倒', en: 'Reversible Tiles',
      dz: '只用 1234589 筒、245689 条和白板。', de: 'Only point-symmetric tiles are used.', ex: '123p 345p 456s 999p 88s' },
    { id: 'MIXED_TRIPLE_CHOW', v: 8, zh: '三色三同顺', en: 'Mixed Triple Chow',
      dz: '三种花色数序相同的三副顺子。', de: 'The same chow in all three suits.', ex: '345m 345p 345s 678m 99p' },
    { id: 'MIXED_SHIFTED_PUNGS', v: 8, zh: '三色三节高', en: 'Mixed Shifted Pungs',
      dz: '三种花色依次递增一位的三副刻子。', de: 'Three pungs in three suits shifted up by one.', ex: '333m 444p 555s 789m 22p' },
    { id: 'CHICKEN_HAND', v: 8, zh: '无番和', en: 'Chicken Hand',
      dz: '和牌时全无任何番种可计。', de: 'A winning hand that scores no other fan at all.', ex: '234m 678m 345p 567s 11z', exw: '2m' },
    { id: 'LAST_TILE_DRAW', v: 8, zh: '妙手回春', en: 'Last Tile Draw',
      dz: '自摸牌墙最后一张牌和牌。', de: 'Self-draw the very last tile of the wall.', ex: '123m 456m 789m 123p 55s', exw: '5s' },
    { id: 'LAST_TILE_CLAIM', v: 8, zh: '海底捞月', en: 'Last Tile Claim',
      dz: '和最后一张打出的牌。', de: 'Win on the last discard of the hand.', ex: '123m 456m 789m 123p 55s', exw: '3p' },
    { id: 'OUT_WITH_REPLACEMENT', v: 8, zh: '杠上开花', en: 'Out with Replacement Tile',
      dz: '开杠后摸到的补花牌自摸和牌。', de: 'Self-draw the replacement tile after a kong.', ex: '#1111m 234p 567p 789s 99m', exw: '9m' },
    { id: 'ROBBING_THE_KONG', v: 8, zh: '抢杠和', en: 'Robbing the Kong',
      dz: '和别家补杠的那张牌。', de: 'Win on the tile someone added to a melded pung.', ex: '123m 456m 789m 234p 55s', exw: '2p' },
    /* ---------------- 6 ---------------- */
    { id: 'ALL_PUNGS', v: 6, zh: '碰碰和', en: 'All Pungs',
      dz: '由四副刻子（杠）和将组成。', de: 'Four pungs/kongs and a pair.', ex: '*222m *555p 888s 333z 99m' },
    { id: 'HALF_FLUSH', v: 6, zh: '混一色', en: 'Half Flush',
      dz: '由一种花色数牌和字牌组成。', de: 'One suit plus honours.', ex: '123m 456m 789m 111z 99m' },
    { id: 'MIXED_SHIFTED_CHOWS', v: 6, zh: '三色三步高', en: 'Mixed Shifted Chows',
      dz: '三种花色依次递增一位的三副顺子。', de: 'Three chows in three suits shifted up by one.', ex: '123m 234p 345s 678m 99p' },
    { id: 'ALL_TYPES', v: 6, zh: '五门齐', en: 'All Types',
      dz: '万、筒、条、风、箭五种牌都有。', de: 'All five tile categories appear.', ex: '123m 456p 789s 111z 55z' },
    { id: 'MELDED_HAND', v: 6, zh: '全求人', en: 'Melded Hand',
      dz: '四副牌均为吃碰明杠，单钓将点和。', de: 'Every set melded; win by discard on the pair.', ex: '*123m *456m *789m *123p 11s', exw: '1s' },
    { id: 'TWO_CONCEALED_KONGS', v: 6, zh: '双暗杠', en: 'Two Concealed Kongs',
      dz: '两个暗杠。', de: 'Two concealed kongs.', ex: '#1111m #2222p 345s 678s 99m' },
    { id: 'TWO_DRAGON_PUNGS', v: 6, zh: '双箭刻', en: 'Two Dragon Pungs',
      dz: '两副箭牌刻子。', de: 'Two pungs of dragons.', ex: '555z 666z 123m 456m 99p' },
    /* ---------------- 4 ---------------- */
    { id: 'OUTSIDE_HAND', v: 4, zh: '全带幺', en: 'Outside Hand',
      dz: '每副牌及将牌都含幺九或字牌。', de: 'Every set and the pair contains a terminal or honour.', ex: '123m 789p 111z 999s 11m' },
    { id: 'FULLY_CONCEALED_HAND', v: 4, zh: '不求人', en: 'Fully Concealed Hand',
      dz: '门前清自摸和牌。', de: 'Self-drawn win with a fully concealed hand.', ex: '123m 456m 789m 234p 55s', exw: '5s' },
    { id: 'TWO_MELDED_KONGS', v: 4, zh: '双明杠', en: 'Two Melded Kongs',
      dz: '两个明杠。', de: 'Two melded kongs.', ex: '*1111m *2222p 345s 678s 99m' },
    { id: 'LAST_TILE', v: 4, zh: '和绝张', en: 'Last Tile',
      dz: '和牌张是场上明示的第四张。', de: 'The winning tile is the last of its kind.', ex: '123m 456m 789m 234p 55s', exw: '2p' },
    /* ---------------- 2 ---------------- */
    { id: 'DRAGON_PUNG', v: 2, zh: '箭刻', en: 'Dragon Pung',
      dz: '中、发、白其中一种的刻子。', de: 'A pung of dragons.', ex: '555z 123m 456m 789m 99p' },
    { id: 'PREVALENT_WIND', v: 2, zh: '圈风刻', en: 'Prevalent Wind',
      dz: '与当前圈风相同的风刻。', de: 'A pung of the prevailing wind.', ex: '111z 123m 456m 789m 99p' },
    { id: 'SEAT_WIND', v: 2, zh: '门风刻', en: 'Seat Wind',
      dz: '与自己门风相同的风刻。', de: 'A pung of your own seat wind.', ex: '222z 123m 456m 789m 99p' },
    { id: 'TILE_HOG', v: 2, zh: '四归一', en: 'Tile Hog',
      dz: '某种牌四张都在手，但未开杠。', de: 'All four of a tile used without a kong.', ex: '111m 123m 456m 789m 99p' },
    { id: 'DOUBLE_PUNG', v: 2, zh: '双同刻', en: 'Double Pung',
      dz: '两种花色数序相同的刻子。', de: 'Two pungs of the same number in two suits.', ex: '333m 333p 456s 789s 99m' },
    { id: 'TWO_CONCEALED_PUNGS', v: 2, zh: '双暗刻', en: 'Two Concealed Pungs',
      dz: '两副暗刻。', de: 'Two concealed pungs.', ex: '111m 999p 234s 567s 88m' },
    { id: 'CONCEALED_KONG', v: 2, zh: '暗杠', en: 'Concealed Kong',
      dz: '一个暗杠。', de: 'One concealed kong.', ex: '#1111m 234p 567p 789s 99m' },
    { id: 'ALL_SIMPLES', v: 2, zh: '断幺', en: 'All Simples',
      dz: '没有任何幺九牌和字牌。', de: 'No terminals and no honours.', ex: '234m 567p 345s 678s 55m' },
    /* ---------------- 1 ---------------- */
    { id: 'PURE_DOUBLE_CHOW', v: 1, zh: '一般高', en: 'Pure Double Chow',
      dz: '同花色两副相同的顺子。', de: 'Two identical chows in one suit.', ex: '234m 234m 567p 789s 99m' },
    { id: 'MIXED_DOUBLE_CHOW', v: 1, zh: '喜相逢', en: 'Mixed Double Chow',
      dz: '两种花色数序相同的顺子。', de: 'The same chow in two different suits.', ex: '234m 234p 567s 789s 99m' },
    { id: 'SHORT_STRAIGHT', v: 1, zh: '连六', en: 'Short Straight',
      dz: '同花色相连的两副顺子，如 123+456。', de: 'Two chows in one suit forming six in a row.', ex: '123m 456m 789p 234s 55s' },
    { id: 'TWO_TERMINAL_CHOWS', v: 1, zh: '老少副', en: 'Two Terminal Chows',
      dz: '同花色的 123 和 789。', de: '123 and 789 in the same suit.', ex: '123m 789m 456p 234s 55s' },
    { id: 'PUNG_OF_TERMINALS_OR_HONORS', v: 1, zh: '幺九刻', en: 'Pung of Terminals or Honors',
      dz: '由一、九或字牌组成的刻子。', de: 'A pung of terminals or honours.', ex: '111m 234p 567p 789s 99s' },
    { id: 'MELDED_KONG', v: 1, zh: '明杠', en: 'Melded Kong',
      dz: '一个明杠。', de: 'One melded kong.', ex: '*1111m 234p 567p 789s 99m' },
    { id: 'ONE_VOIDED_SUIT', v: 1, zh: '缺一门', en: 'One Voided Suit',
      dz: '万、筒、条中缺少一门。', de: 'One of the three suits is absent.', ex: '123m 456m 789m 123p 55p' },
    { id: 'NO_HONORS', v: 1, zh: '无字', en: 'No Honors',
      dz: '没有风牌和箭牌。', de: 'No winds and no dragons.', ex: '123m 456p 789s 234m 55p' },
    { id: 'EDGE_WAIT', v: 1, zh: '边张', en: 'Edge Wait',
      dz: '和 12 缺的 3、或 89 缺的 7，且只有这一种和法。', de: 'Winning on the 3 of 12 or the 7 of 89.', ex: '123m 456m 789m 123p 11s', exw: '3p' },
    { id: 'CLOSED_WAIT', v: 1, zh: '坎张', en: 'Closed Wait',
      dz: '和顺子中间的那张牌。', de: 'Winning on the middle tile of a chow.', ex: '123m 456m 789m 123p 11s', exw: '2p' },
    { id: 'SINGLE_WAIT', v: 1, zh: '单钓将', en: 'Single Wait',
      dz: '单钓将牌和牌。', de: 'Winning by completing the pair.', ex: '123m 456m 789m 123p 11s', exw: '1s' },
    { id: 'SELF_DRAWN', v: 1, zh: '自摸', en: 'Self-Drawn',
      dz: '自己摸牌和牌。', de: 'Winning on your own draw.', ex: '*123m 456m 789m 234p 55s', exw: '5s' },
    { id: 'FLOWER_TILES', v: 1, zh: '花牌', en: 'Flower Tiles',
      dz: '每张花牌计 1 番（不计入起和番）。', de: '1 fan per flower (does not count toward the minimum).', ex: '123m 456m 789m 234p 55s 12f', exw: '5s' }
  ];

  var BY_ID = {};
  for (var i = 0; i < F.length; i++) BY_ID[F[i].id] = F[i];

  var SUITS = { m: 0, p: 1, s: 2, z: 3 };

  /** "3p" / "5z" / "1f" -> tile id */
  function parseTile(code) {
    var T = global.MJ.Tiles;
    var suit = code.charAt(code.length - 1), d = parseInt(code, 10);
    if (suit === 'f') return T.FLOWER_BASE + d - 1;
    return T.tileId(SUITS[suit], d);
  }

  /**
   * Parse an example hand such as "*123m #1111p 55s 12f" into groups.
   *   (none) concealed   * melded (chow/pung/melded kong)   # concealed kong   xf flowers
   */
  function parseExample(str) {
    var T = global.MJ.Tiles, out = [], parts = String(str).trim().split(/\s+/);
    for (var i = 0; i < parts.length; i++) {
      var g = parts[i], kind = 'concealed';
      if (g.charAt(0) === '*') { kind = 'melded'; g = g.slice(1); }
      else if (g.charAt(0) === '#') { kind = 'ankan'; g = g.slice(1); }
      var suit = g.charAt(g.length - 1), digits = g.slice(0, -1), tiles = [];
      for (var j = 0; j < digits.length; j++) {
        var d = parseInt(digits.charAt(j), 10);
        tiles.push(suit === 'f' ? (T.FLOWER_BASE + d - 1) : T.tileId(SUITS[suit], d));
      }
      out.push({ kind: suit === 'f' ? 'flower' : kind, tiles: tiles });
    }
    return out;
  }

  global.MJ = global.MJ || {};
  global.MJ.FanDefs = { list: F, byId: BY_ID, parseExample: parseExample, parseTile: parseTile };
})(typeof window !== 'undefined' ? window : globalThis);
