'use strict';

// =====================
// 敵定義
// 各敵は以下を持つ:
//   onTurn(turn, b)      — ターン終了時に呼ばれる
//   postCombat(turn, b)  — 戦闘解決後に呼ばれる（任意）
//   forecast(turn, creatures) — 次ターン予告テキスト
//
// b インターフェース:
//   b.summon(count, opts) — クリーチャー召喚
//     opts: { power, toughness, icon, label, haste, isSliver, isArarabo }
//   b.log(msg, type)      — ログ出力
//   b.damagePlayer(n)     — プレイヤーに直接ダメージ
//   b.creatures           — 現在の戦場（参照）
// =====================

const ENEMIES = {

  // ---- 雑魚：サバンナライオン無限召喚 ----
  savannah_lion: {
    name:       'サバンナライオン',
    stageLabel: '雑魚戦',
    icon:       '🦁',
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

  // ---- 雑魚：怒り狂うゴブリン ----
  // 毎ターン1/1速攻を召喚。4の倍数ターンに溶岩のオノ(5点)。
  // 斧の前のターンは戦闘後にひとこと呟く。
  frenzied_goblin: {
    name:       '怒り狂うゴブリン',
    stageLabel: '雑魚戦',
    icon:       '👺',
    hp:         8,

    onTurn(turn, b) {
      // 毎ターン1/1速攻ゴブリン召喚
      b.summon(1, { power:1, toughness:1, icon:'👺', label:'ゴブリン', haste:true });
      b.log('ゴブリン 1体 召喚（速攻！）', 'enemy');

      // 4の倍数ターン：溶岩のオノ
      if (turn % 4 === 0) {
        b.log('🪓 溶岩のオノ！ プレイヤーに 5点ダメージ！', 'enemy');
        b.damagePlayer(5);
      }
    },

    postCombat(turn, b) {
      // 斧の直前ターン：戦闘後に呟く
      if ((turn + 1) % 4 === 0) {
        b.log('👺「斧はどこにいったけ・・・」', 'enemy');
      }
    },

    forecast(turn, creatures) {
      const next = turn + 1;
      const parts = ['ゴブリン召喚（速攻）'];
      if (next % 4 === 0) parts.push('🪓 溶岩のオノ 5点！');
      const atk = creatures.filter(c => !c.dead && c.canAttack && (c.state||'normal') === 'normal');
      if (atk.length) parts.push(`${atk.length}体がアタック`);
      return parts.join(' / ');
    },
  },

  // ---- 雑魚（弱）：甲鱗のワーム ----
  // 5ターン目以降、毎ターン7/6を召喚。召喚酔いあり。
  scaled_wurm: {
    name:       '甲鱗のワーム',
    stageLabel: '雑魚戦',
    icon:       '🪱',
    hp:         12,

    onTurn(turn, b) {
      if (turn < 5) return;
      b.summon(1, { power:7, toughness:6, icon:'🪱', label:'ワーム' });
      b.log('甲鱗のワーム(7/6)召喚（召喚酔い）', 'enemy');
    },

    forecast(turn, creatures) {
      const next = turn + 1;
      const parts = [];
      if (next >= 5) {
        parts.push('ワーム(7/6)召喚');
      } else {
        parts.push(`あと${5 - next}ターンでワーム召喚開始`);
      }
      const atk = creatures.filter(c => !c.dead && c.canAttack && (c.state||'normal') === 'normal');
      if (atk.length) parts.push(`${atk.length}体がアタック`);
      return parts.join(' / ');
    },
  },

  // ---- 強い雑魚①：獣群の呼び声使い ----
  // 3ターン目以降毎ターン3/3象召喚（予告なし）。3の倍数ターンに残酷な布告。
  call_of_herd: {
    name:       '獣群の呼び声使い',
    stageLabel: '雑魚戦',
    icon:       '🐘',
    hp:         14,

    onTurn(turn, b) {
      if (turn >= 3) {
        b.summon(1, { power:3, toughness:3, icon:'🐘', label:'象トークン' });
        b.log('🌿 獣群の呼び声！ 象(3/3)召喚（召喚酔い）', 'enemy');
      }
      if (turn % 3 === 0) {
        b.log('💀 残酷な布告！ あなたはクリーチャーを1体生け贄に捧げること！', 'enemy');
      }
    },

    forecast(turn, creatures) {
      const next = turn + 1;
      const parts = [];
      // 獣群の呼び声は予告なし
      if (next % 3 === 0) parts.push('💀 生贄が必要だ');
      const atk = creatures.filter(c => !c.dead && c.canAttack && (c.state||'normal') === 'normal');
      if (atk.length) parts.push(`${atk.length}体がアタック`);
      return parts.join(' / ') || '待機';
    },
  },

  // ---- 強い雑魚②：射手と泥棒ネズミ ----
  // 2ターン目以降、射手(2/1接死)と泥棒ネズミ(1/1)を交互に召喚。
  // ネズミ出現時：プレイヤーは手札を1枚捨てる。
  archer_rat: {
    name:       '射手と泥棒ネズミ',
    stageLabel: '雑魚戦',
    icon:       '🏹',
    hp:         13,

    onTurn(turn, b) {
      if (turn < 2) return;
      if ((turn - 2) % 2 === 0) {
        b.summon(1, { power:1, toughness:1, icon:'🐀', label:'泥棒ネズミ' });
        b.log('🐀 泥棒ネズミ召喚！ あなたは手札からカードを1枚捨てること！', 'enemy');
      } else {
        b.summon(1, { power:2, toughness:1, icon:'🏹', label:'射手(接死)', deathtouch:true });
        b.log('🏹 ソーンウィールドの射手(2/1)召喚！ 接死 — 接触したクリーチャーは死亡！', 'enemy');
      }
    },

    forecast(turn, creatures) {
      const next = turn + 1;
      const parts = [];
      if (next >= 2) {
        if ((next - 2) % 2 === 0) parts.push('🐀 ネズミ召喚（手札1枚捨て）');
        else parts.push('🏹 射手(2/1・接死)召喚');
      }
      const atk = creatures.filter(c => !c.dead && c.canAttack && (c.state||'normal') === 'normal');
      if (atk.length) parts.push(`${atk.length}体がアタック`);
      return parts.join(' / ') || '待機';
    },
  },

  // ---- 強い雑魚③：鳥の変わり身使い ----
  // 3ターン目以降毎ターン変わり身(2/2飛行)召喚。
  // 4ターン目以降3ターンに一回、圧倒的な波（変わり身はクラーケン等でもあるため残る）。
  avian_changeling: {
    name:       '鳥の変わり身使い',
    stageLabel: '雑魚戦',
    icon:       '🦅',
    hp:         15,

    onTurn(turn, b) {
      if (turn >= 3) {
        b.summon(1, { power:2, toughness:2, icon:'🦅', label:'変わり身(飛行)', isChangeling:true });
        b.log('🦅 鳥の変わり身(2/2飛行)召喚（召喚酔い）', 'enemy');
      }
      if (turn >= 4 && (turn - 4) % 3 === 0) {
        const bounced = b.creatures.filter(c => !c.dead && !c.isChangeling);
        bounced.forEach(c => { c.dead = true; });
        b.log('🌊 圧倒的な波！ クラーケン等以外のクリーチャーがすべて手札に戻った！', 'enemy');
        b.log('🌊 あなたのクリーチャーも（クラーケン等を除き）すべて手札に戻してください。変わり身は残る！', 'enemy');
      }
    },

    forecast(turn, creatures) {
      const next = turn + 1;
      const parts = [];
      if (next >= 3) parts.push('変わり身(2/2飛行)召喚');
      if (next >= 4 && (next - 4) % 3 === 0) parts.push('🌊 波が来るぞ');
      const atk = creatures.filter(c => !c.dead && c.canAttack && (c.state||'normal') === 'normal');
      if (atk.length) parts.push(`${atk.length}体がアタック`);
      return parts.join(' / ') || '待機';
    },
  },

  // ---- エリート：筋肉スリヴァー ----
  muscle_sliver: {
    name:       '筋肉スリヴァー',
    stageLabel: 'エリート戦',
    icon:       '💪',
    hp:         15,

    lordPower(creatures) {
      const n = creatures.filter(c => !c.dead && c.isSliver).length;
      return 2 + n; // 1体→3/3, 2体→4/4, ...
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
  ararabo: {
    name:       '初祖牙、アラーボ',
    stageLabel: 'ボス戦',
    icon:       '🐊',
    hp:         25,

    onTurn(turn, b) {
      const araboAlive = b.creatures.some(c => !c.dead && c.isArarabo);

      if (turn === 2) {
        b.summon(1, { power:2, toughness:2, icon:'🐊', label:'アラーボ', isArarabo:true });
        b.log('アラーボ召喚！ ライオンに+1/0のロード効果', 'enemy');
        return;
      }

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

// マップのノードタイプ → デフォルト敵キー
const NODE_TO_ENEMY = {
  normal: 'savannah_lion',
  elite:  'muscle_sliver',
  boss:   'ararabo',
};
