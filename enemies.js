'use strict';

// =====================
// 敵定義
// 各敵は onTurn(turn, b) と forecast(turn, creatures) を持つ
//   b.summon(count, opts) — クリーチャーを召喚する
//   b.log(msg, type)      — ログに書き込む
//   b.creatures           — 現在の戦場（参照のみ）
// =====================

const ENEMIES = {

  // ---- 雑魚：サバンナライオン無限召喚 ----
  savannah_lion: {
    name:       'サバンナライオン',
    stageLabel: '雑魚戦',
    hp:         10,

    onTurn(turn, b) {
      if (turn % 2 !== 0) return;
      const count = 1 + Math.floor((turn - 1) / 3);
      b.summon(count, { power:2, toughness:1, icon:'🦁', label:'ライオン' });
      b.log(`サバンナライオン ${count}体 召喚（召喚酔い）`, 'enemy');
    },

    forecast(turn, creatures) {
      const next = turn + 1;
      const parts = [];
      if (next % 2 === 0) {
        const count = 1 + Math.floor((next - 1) / 3);
        parts.push(`ライオン${count}体召喚`);
      }
      const atk = creatures.filter(c => !c.dead && c.canAttack && (c.state||'normal') === 'normal');
      if (atk.length) parts.push(`${atk.length}体がアタック`);
      return parts.join(' / ') || '待機';
    },
  },

  // ---- エリート：筋肉スリヴァー ----
  // スリヴァーが増えるたびに全体+1/+1（ロード効果）
  muscle_sliver: {
    name:       '筋肉スリヴァー',
    stageLabel: 'エリート戦',
    hp:         15,

    lordPower(creatures) {
      // N体いる → 全員 (2+N)/(2+N)
      const n = creatures.filter(c => !c.dead && c.isSliver).length;
      return 2 + n;
    },

    onTurn(turn, b) {
      if (turn % 3 !== 0) return;
      b.summon(1, { power:2, toughness:2, icon:'💪', label:'スリヴァー', isSliver:true });
      const n = b.creatures.filter(c => !c.dead && c.isSliver).length;
      b.log(`筋肉スリヴァー召喚！（全体 ${2 + n}/${2 + n}）`, 'enemy');
    },

    forecast(turn, creatures) {
      const next = turn + 1;
      const parts = [];
      const slivers = creatures.filter(c => !c.dead && c.isSliver);
      if (next % 3 === 0) {
        const newN = slivers.length + 1;
        parts.push(`スリヴァー召喚（全体 ${2 + newN}/${2 + newN}に）`);
      }
      const atkers = slivers.filter(c => c.canAttack && (c.state||'normal') === 'normal');
      if (atkers.length) {
        const pow = 2 + slivers.length;
        parts.push(`${atkers.length}体(${pow}/${pow})アタック`);
      }
      return parts.join(' / ') || '待機';
    },
  },

  // ---- ボス：初祖牙、アラーボ ----
  // アラーボが生きている間、ライオン召喚時に猫トークンも生成
  ararabo: {
    name:       '初祖牙、アラーボ',
    stageLabel: 'ボス戦',
    hp:         25,

    onTurn(turn, b) {
      const araboAlive = b.creatures.some(c => !c.dead && c.isArarabo);

      // 最初の敵アクション：アラーボ登場
      if (turn === 2) {
        b.summon(1, { power:2, toughness:2, icon:'🐊', label:'アラーボ', isArarabo:true });
        b.log('アラーボ召喚！ ライオンに+1/0のロード効果', 'enemy');
        return;
      }

      // 3の倍数ターン（turn 5, 8, 11...）：ライオン＋猫トークン
      if (turn >= 5 && (turn - 2) % 3 === 0) {
        const pow = araboAlive ? 3 : 2;
        b.summon(1, { power:pow, toughness:2, icon:'🦁', label:'ライオン' });
        if (araboAlive) {
          b.summon(1, { power:1, toughness:1, icon:'🐱', label:'猫トークン' });
          b.log(`ライオン(${pow}/2)＋猫トークン召喚！`, 'enemy');
        } else {
          b.log(`ライオン(${pow}/2)召喚（アラーボ討伐済み）`, 'enemy');
        }
      }
    },

    forecast(turn, creatures) {
      const next = turn + 1;
      const parts = [];
      const araboAlive = creatures.some(c => !c.dead && c.isArarabo);

      if (next === 2) {
        parts.push('アラーボ(2/2)召喚');
      } else if (next >= 5 && (next - 2) % 3 === 0) {
        const pow = araboAlive ? 3 : 2;
        parts.push(`ライオン(${pow}/2)召喚${araboAlive ? '＋猫トークン' : ''}`);
      }

      const atk = creatures.filter(c => !c.dead && c.canAttack && (c.state||'normal') === 'normal');
      if (atk.length) parts.push(`${atk.length}体がアタック`);
      return parts.join(' / ') || '待機';
    },
  },

};

// マップのノードタイプ → 敵キー
const NODE_TO_ENEMY = {
  normal: 'savannah_lion',
  elite:  'muscle_sliver',
  boss:   'ararabo',
};
