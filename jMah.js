// ver.1.40 since 2020/03/10 (ECMA6 based coding)
// ver.1.30 since 2014/03/07 (Redesign the whole specs)
// ver.1.22 since 2014/01/30 (Fix the yaku_all as prototype)
// ver.1.21 since 2012/12/20 (Fix the type determinant of minko)

//////////////////////////////////////////////////////
const hiname =
    ["m1","m2","m3","m4","m5","m6","m7","m8","m9",
     "p1","p2","p3","p4","p5","p6","p7","p8","p9",
     "s1","s2","s3","s4","s5","s6","s7","s8","s9",
     "ton","nan","sha","pei","hak","hat","chu"];
const typename = ["chi", "shun", "twin", "pon", "anko", "kan", "ankan"];
const $J = hiname.reduce((hi, v, i) => { hi[v] = i; return hi; }, {});

$J.type = typename.reduce((typ, v, i) => { typ[v] = i; return typ; }, {});
$J.type.toString = type => ["明順","暗順","対子","明刻","暗刻","明槓","暗槓"][type];
$J.num = (tile) => (tile % 9 + 1);
$J.isji = tile => (tile >= $J.ton);
$J.is_yao = tile => ((tile % 9 == 0) || (tile % 9 == 8) || $J.isji(tile));
$J.is4xi = (tile) => (tile >= $J.ton) && (tile <= $J.pei);
$J.is3gen = (tile) => (tile >= $J.hak);
$J.type.is_shun = type => (type < $J.type.twin);
$J.type.is_koh = type => ($J.type.twin < type); 
$J.hitag = (hi => (hi < 0) ? "# " : hiname[hi] + " ");

//////////////////////////////////////////////////////
var HandCalc = function(ments) {
  // 入力
  this.tsumo = 0;
  this.reach = 0;
  this.ba_kz = 0;
  this.ch_kz = 0;
  this.aghi  = 0;
  this.dora  = 0;
  this.tsumi = 0;
  // 出力
  var pvt_mai = 0;
  var pvt_han = 0;
  var pvt_fu  = 0;
  var pvt_yaku   = [];
  var pvt_fueach = []; // 確定面子の種類と符
  var pvt_point  = [];
  // その他内部メンバ
  var yakutag = [];  // 役タグ
  var mstat  = {};   // 面子の統計情報
  ////////////////////////////

  this.hands = function(){
      return ments;
  };
  this.fueach = () => pvt_fueach;
  this.fu = function(is_round) {
      return (!is_round || pvt_fu == 25) ? pvt_fu : (10 * Math.ceil(pvt_fu / 10));
  };
  this.han = () => pvt_han;
  this.yaku = () => pvt_yaku;
  this.point = (cat) => pvt_point[cat];

  var init_private = function(){
      yakutag = [];
      ments = [];
      mstat = {
          color: {"man":0, "pin":0, "sou":0, "ji":0, "yao":0},
          type: {},
          furo: 0,
      };
  }
  ////////////////////////////
  this.run = this.yaku_check = function(setments) {
      init_private();
      if (![5, 7, 13].some(v => v == setments.length)) return -1;

      ments = setments.sort((a, b) => {
          if (a[1] == 2) return -1;
          if (b[1] == 2) return 1;
          return (a[0] - b[0]);
      }).map(v => { return { head: v[0], type: v[1]}; });
      
      this._ments_statistics();
      this._judge_yaku();
      this._determine_hands();
      this._determine_fu();
      pvt_point = this._cal_point();

      return this;
  };
  /////////////////// 面子の統計
  this._ments_statistics = function(){
      // 総枚数計上
      this._n2mai();

      // 色計上 (ロン面子判定で ments[].type が変動する前に副露数を計上する)
      ments.forEach(m => {
          var color = v => {
              if (v <= $J.m9) return "man";
              if (v <= $J.p9) return "pin";
              if (v <= $J.s9) return "sou";
              return "ji";
          };
          mstat.color[color(m.head)]++;
          if (m.type == $J.type.chi || m.type == $J.type.pon || m.type == $J.type.kan) mstat.furo++;
          if (!$J.type.is_shun(m.type) && $J.is_yao(m.head)) mstat.color.yao++;
          if ($J.type.is_shun(m.type) && ($J.num(m.head) == 1 || $J.num(m.head) == 7)) mstat.color.yao++;
      });
      // 状況整合
      if (mstat.furo) this.reach = 0;

      // 面子の待ち候補判定
      var aghi = this.aghi;
      ments = ments.map(m => {
          m.machi = ((type, head) => {
              // 単騎
              if (type == $J.type.twin && aghi == head) return "tanki";
              // 双碰
              if (type == $J.type.anko && aghi == head) return "shabo";

              if (type != $J.type.shun) return;
              var num = $J.num(aghi);
              var pos = aghi - head;

              // 嵌張(2-8が中央牌)
              if ((num != 1) && (num != 9) && (pos == 1)) return "kan";

              // 辺張(7が先頭牌 or 3が末尾牌)
              if ((num == 7 && pos == 0) || (num == 3 && pos == 2)) return "pen";

              // 両面(1-6が先頭牌 or 4-9が末尾牌)
              if ((num < 7 && pos == 0) || (num > 3  && pos == 2)) return "ryan";

          })(m.type, m.head);

          return m;
      });

      // 双碰ロン面子の明刻化
      if (!(this.tsumo % 2) && ments.map(m => m.machi ? m.machi : "").join("") == "shabo") {
          var i = ments.findIndex(m => m.machi == "shabo");
          ments[i].type = $J.type.pon;
      }

      // 面子タイプ個数を計上
      typename.forEach(v => mstat.type[v] = 0);
      ments.forEach(m => mstat.type[typename[m.type]]++);
  };

  ////////////////// 各牌の枚数
  this._n2mai = function(){
      pvt_mai = Array(34).fill(0);
      ments.forEach(m => {
          switch(m.type){
          case $J.type.twin:
              pvt_mai[m.head] += 2; break;
          case $J.type.anko:
          case $J.type.pon:
              pvt_mai[m.head] += 3; break;
          case $J.type.ankan:
          case $J.type.kan:
              pvt_mai[m.head] += 4; break;
          case $J.type.shun:
          case $J.type.chi:
              pvt_mai[m.head+0]++;
              pvt_mai[m.head+1]++;
              pvt_mai[m.head+2]++;
          }
      });
  };
  //////////////////////////////// 各種役判定
    this._judge_yaku = function(){
      if (ments.length == 13)
          return this._check_13orphans();

      this._check_tile_limited_hand();
      this._check_color_limited_hand();
      this._check_type_limited_hand();
      this._check_4ments_related_hand();
      this._check_3ments_related_hand();
      this._check_2ments_related_hand();
      this._check_context_hand();
      this._check_fu_related_hand();
  };
  //////////////////////////////// 和了状況の役
  this._check_context_hand = function(){
      var yakuset = {
          "TSUMO":  this.tsumo % 2 && mstat.furo == 0,
          "HAITEI": this.tsumo == 2 || this.tsumo == 3,
          "RINSHAN":this.tsumo == 5 && mstat.type.kan + mstat.type.ankan > 0,
          "CHANKAN":this.tsumo == 4 && pvt_mai[this.aghi] <= 1,
          "REACH":  this.reach == 1 || this.reach == 2,
          "WREACH": this.reach == 3 || this.reach == 4,
          "1PATSU": this.reach == 2 || this.reach == 4,
          "HADAKA": mstat.furo + mstat.type.ankan == 4, // 裸単騎※
      };
      yakutag = yakutag.concat(Object.keys(yakuset).filter(tag => yakuset[tag]));
  };
  /////////////////////////////// 符計算に関わる役
  this._check_fu_related_hand = function() {
      if (this.tsumo % 2 && !this.is_pinzumo) return;
      if (ments.slice(1).every(m => $J.type.is_shun(m.type)) &&
          ments.some(m => m.machi == "ryan") &&
          mstat.furo == 0)
          yakutag.push("PINFU"); // 平和
  };

  Array.prototype.havingonlykeys = function(keys){
      for (var i = 0; i < this.length; i++)
          if(this[i] > 0 && keys.indexOf(i) < 0) return false;
      return true;
  };
  Array.prototype.searchsubset = function(subset){
      var j = 0;
      for (var i = 0; i < this.length; i++) {
          if (this[i] < subset[j]) {
              j = 0;
              if (this[i] < subset[j]) continue;
          }
          j++;
          if (j == subset.length) return i - subset.length + 1;
      }
      return -1;
  };

  ////////////////////////////// 使用牌の制限がある役
  this._check_tile_limited_hand = function() {
      this._check_fanpai_hand();

      var ryu_hai = [$J.s2, $J.s3, $J.s4, $J.s6, $J.s8, $J.hat,];
      var tpt_hai = [$J.p1, $J.p2, $J.p3, $J.p4, $J.p5, $J.p8, $J.p9,
                     $J.s2, $J.s4, $J.s5, $J.s6, $J.s8, $J.s9, $J.hak,];
      var mnt3gen = ments.filter(m => $J.is3gen(m.head) && $J.type.is_koh(m.type));
      var mnt4xi = ments.filter(m => $J.is4xi(m.head) && $J.type.is_koh(m.type));
      var mai9ren = [3,1,1,1,1,1,1,1,3];
      var head9ren = pvt_mai.searchsubset(mai9ren);
      var is9ren = !$J.isji(head9ren) && ($J.num(head9ren) == 1) && (0 == mstat.type.ankan + mstat.furo);
      var aghi = this.aghi;

      var yakuset = {
          "J9REN": is9ren && (pvt_mai[aghi] == mai9ren[aghi % 9] + 1), // 純正九蓮
          "9REN":  is9ren, // 九蓮
          "DAI3":  mnt3gen.length == 3,  // 大三
          "SHO3": (mnt3gen.length == 2) && $J.is3gen(ments[0].head),  //小三
          "DAI4":  mnt4xi.length == 4,  // 大四
          "SHO4":  mnt4xi.length == 3 && $J.is4xi(ments[0].head),  //小四
          "3PU":   mnt4xi.length == 3,   //三風刻※
          "RYUI": (mstat.color.sou + mstat.color.ji == 5) && pvt_mai.havingonlykeys(ryu_hai), // 緑一色
          "TOIPU": pvt_mai.havingonlykeys(tpt_hai), // 推不倒※
          "100MAN": (mstat.color.man == ments.length) &&
              (100 <= pvt_mai.reduce((sum, n, i) => sum + (i + 1) * n, 0)), // 百万石※
      };
      yakutag = yakutag.concat(Object.keys(yakuset).filter(tag => yakuset[tag]));
  };

  this._check_fanpai_hand = function(){
      var ba_kz = this.ba_kz + $J.ton;
      var ch_kz = this.ch_kz + $J.ton;
      var subments = ments.slice(1);
      var n = subments.filter(m => $J.is3gen(m.head) || (m.head == ba_kz)).length
          + subments.filter(m => (m.head == ch_kz)).length;
      yakutag = yakutag.concat(Array(n).fill("YAKUHAI"));
  };

  ////////////////////////////// 色の制限がある役
  this._check_color_limited_hand = function() {
      var mentslen = mstat.color;
      var is_noshun = (mstat.type.chi + mstat.type.shun == 0);
      var is_chant = (mentslen.yao == ments.length);
      var is_hon = (mentslen.man + mentslen.ji == ments.length) ||
          (mentslen.sou + mentslen.ji == ments.length) ||
          (mentslen.pin + mentslen.ji == ments.length);

      var yakuset = {
          "CHIN":  is_hon && mentslen.ji == 0,  // 清一色
          "HON":   is_hon, // 混一色
          "TSUI":  mentslen.ji == ments.length,  // 字一色
          "TAN":   mentslen.yao + mentslen.ji == 0,  // 断幺
          "CHINRO":is_chant && is_noshun && mentslen.ji == 0, //清老
          "HONRO": is_chant && is_noshun, //混老
          "JCHANT":is_chant && mentslen.ji == 0, // 純全帯
          "CHANT": is_chant,  // 全帯
          // 五門斉※
          "5MENC": (ments.length == 5) &&
              (mentslen.man == 1) && (mentslen.sou == 1) && (mentslen.pin == 1) &&
              ments.some(m => $J.is3gen(m.head)) && ments.some(m => $J.is4xi(m.head))
      };
      yakutag = yakutag.concat(Object.keys(yakuset).filter(tag => yakuset[tag]));
  };
  //////////////////////////////////////// 面子タイプに関わる役
  this._check_type_limited_hand = function() {

      var yakuset = {
          "7TOI":   mstat.type.twin == 7, // 七対子
          "4ANK":   mstat.type.anko + mstat.type.ankan == 4, // 四暗刻
          "4ANKT":  mstat.type.anko + mstat.type.ankan == 4 && (ments[0].head == this.aghi), // 四暗刻単騎
          "TOITOI": mstat.type.shun + mstat.type.chi   == 0 && (ments.length == 5), // 対々和
          "3ANK":   mstat.type.anko + mstat.type.ankan == 3,  // 三暗
          "3KAN":   mstat.type.kan  + mstat.type.ankan == 3,  // 三槓
          "4KAN":   mstat.type.kan  + mstat.type.ankan == 4,  // 四槓
      };
      yakutag = yakutag.concat(Object.keys(yakuset).filter(tag => yakuset[tag]));
  };

  /////////////////////////////////////// 4面子同士の比較に関わる役
  this._check_4ments_related_hand =  function() {
      if (ments.length != 5) return;
        
      var head = ments.map(m => m.head).slice(1);
      var num = $J.num(head[0]);
      var is2pair = (head[0] == head[1]) && (head[2] == head[3]);
      var isshun = (mstat.type.shun + mstat.type.chi == 4);
      
      var yakuset = {
          // 二盃口
          "2PEKO": is2pair && isshun,
          // 一色四順※
          "1SK4J": is2pair && isshun && (head[1] == head[2]),
          // 一色四歩※
          "1SK4PO": isshun &&
              ((head.every((v, i) => head[0] + i == v) && num < 5) ||
               (head.every((v, i) => head[0] + i * 2 == v) && num == 1)),
          // 四連刻※
          "4RENK": (mstat.type.shun + mstat.type.chi == 0) &&
              (mstat.type.twin == 1) &&
              (num < 7) && (head[0] < 27) &&
              head.every((v, i) => head[0] + i == v)
      };

      yakutag = yakutag.concat(Object.keys(yakuset).filter(tag => yakuset[tag]));
    };
  /////////////////////////////////////// 3面子同士の比較に関わる役
  this._check_3ments_related_hand = function() {
      var head = ments.map(m => m.head);
      [[1,2,3], [1,2,4], [1,3,4], [2,3,4]].some(combi3 => {
          var is_shn = combi3.every(v => $J.type.is_shun(ments[v].type));
          var is_koh = combi3.every(v => $J.type.is_koh(ments[v].type) && !$J.isji(head[v]));
          if (!is_shn && !is_koh) return;
          
          var hinum = combi3.map(v => $J.num(head[v])).sort();
          var hicolor = combi3.map(v => Math.floor(head[v] / 9));
          var is_3sk = (hicolor[0] == 0) && (hicolor[1] == 1) && (hicolor[2] == 2);
          var is_1sk = (hicolor[0] == hicolor[1]) && (hicolor[1] == hicolor[2]);
          var is_1ts = (hinum[0] == 1) &&  (hinum[1] == 4)  && (hinum[2] == 7);
          var is_doj = (hinum[0] == hinum[1]) && (hinum[1] == hinum[2]);
          var is_3po = (hinum[0] + 1 == hinum[1]) && (hinum[1] + 1 == hinum[2]);
          var is_6po = (hinum[0] + 2 == hinum[1]) && (hinum[1] + 2 == hinum[2]);
          
          var yakuset = {
              "3SK1TS": is_shn && is_3sk && is_1ts,  // 三色一通(花竜)※
              "3SHIKI": is_shn && is_3sk && is_doj,  // 三色同順
              "3SK3PO": is_shn && is_3sk && is_3po,  // 三色三歩※
              "ITTSU" : is_shn && is_1sk && is_1ts,  // 一気通貫
              "1SK3J" : is_shn && is_1sk && is_doj,  // 一色三順
              "1SK3PO": is_shn && is_1sk && (is_3po || is_6po), // 一色三歩※
              "3SKDOK": is_koh && is_3sk && is_doj,  // 三色同刻
              "3SKRNK": is_koh && is_3sk && is_3po,  // 三色連刻※
              "3RENK" : is_koh && is_1sk && is_3po,  // 三連刻※
          };
          yakutag = yakutag.concat(Object.keys(yakuset).filter(tag => yakuset[tag]));
      });
  };
  //////////////////////////////////////// 2面子同士の比較に関わる役
  this._check_2ments_related_hand = function() {
      let ret = [[1,2], [1,3], [1,4], [2,3], [2,4], [3,4]].some(combi => {
          var m1 = ments[combi[0]];
          var m2 = ments[combi[1]];
          return (m1.head == m2.head) && ($J.type.is_shun(m1.type) || $J.type.is_shun(m2.type));
      });
      if (ret) yakutag.push("1PEKO"); // 一盃口
  };
  //////////////////////////////////////// 国士無双に関わる役
  this._check_13orphans = function() {
      yakutag = ["KOKUSHI"];
      if (ments.some(m => (m.type == $J.type.twin) && (m.head == this.aghi)))
          yakutag.push("KOKUSHI13");
  };
  ////////////////// 役の確定
  this._determine_hands = function() {
      yakutag = this._unique(yakutag);

      var yaku2han = {};
      yakutag.forEach(tag => {
          yaku2han[tag] = this._defined_han(tag, 0 < mstat.furo);
      });
      yakutag = yakutag.sort((a, b) => (yaku2han[b] - yaku2han[a]));

      var is_yakuman = (13 <= yaku2han[yakutag[0]]);
      yakutag = yakutag.filter(tag => {
          if (!tag || yaku2han[tag] == 0) return false;

          //これ以降の排他役を削除
          this.exclusive.forEach(exclusives => {
              if (exclusives.indexOf(tag) < 0) return;
              exclusives.forEach(exclusive => {
                  var n = yakutag.indexOf(exclusive);
                  if (n < 0) return;
                  yakutag[n] = false;
              });
          });
          
          // 役満成立時の一般役を除去
          return !is_yakuman || (13 <= yaku2han[tag]);
      });

      pvt_yaku = yakutag.map(tag => this.yaku_all[tag][2] + "(" + yaku2han[tag] + ")");
      pvt_han = yakutag.reduce((sum, tag) => sum + yaku2han[tag], 0);

      // ドラ
      if (0 < pvt_han && !is_yakuman)
          pvt_han = (this.dora + pvt_han > 13) ? 13 : (this.dora + pvt_han);
  };
  //////////////////// 重複判定役の削除
  this._unique = function(arr) {
      var storage = {};
      return arr.filter(val => {
          if (this.selfduplicatable.indexOf(val) < 0 && storage[val]) return false;
          storage[val] = true;
          return true;
      });
  };
  ///////////////////////////
  this._defined_han = function(yakutag, is_furo) {
      var yaku_all = this.yaku_all;
      if (!yaku_all[yakutag]) return 0;
      if (this.yaku_disable[yakutag]) return 0;
      return yaku_all[yakutag][is_furo ? 1 : 0];
  };
  ///////////// 符計算
  this._determine_fu = function() {
      if (ments.length != 5) {
          pvt_fu = 25;
          return;
      }

      //面子符
      var ba_kz = this.ba_kz + $J.ton;
      var ch_kz = this.ch_kz + $J.ton;
      var is_chuzan = this.is_chuzan;
      ments = ments.map(m => {
          m.fu = 0;
          var is_yakuhai = (m.head == ba_kz || m.head == ch_kz || $J.is3gen(m.head));
          if ((m.type == $J.type.twin) && is_yakuhai) {
              m.fu = (ba_kz == ch_kz && m.head == ch_kz && is_chuzan) ? 4 : 2;
              return m;
          }
          if ($J.type.is_koh(m.type)) {
              m.fu = 1 << (m.type - ($J.is_yao(m.head) ? 1 : 2));
          }
          return m;
      });

      //ツモ符・待ち符・門前ロン符
      var is_pinfu = (yakutag.indexOf("PINFU") != -1);
      var is_tsumo = (this.tsumo % 2);
      var fu = [(is_tsumo && !is_pinfu) ? 2 : 0];
      fu.push(!is_pinfu && ments.some(m => m.machi == "tanki" || m.machi == "kan" || m.machi == "pen") ? 2 : 0);
      fu.push(!is_tsumo && (mstat.furo == 0) ? 10 : 0);
      
      // ロン面子の明順化 (優先: 平和なら両面、それ以外は 単 < 嵌辺)
      if (!is_tsumo && (is_pinfu || !ments[0].machi)) {
          (is_pinfu ? ["ryan"] : ["kan", "pen", "ryan"]).some(machi => ments.some((m, i) => {
              if (m.machi != machi) return false;
              ments[i].type = $J.type.chi;
              return true;
          }));
      }

      pvt_fueach[0] = ments.map(m => m.fu).concat(fu);
      pvt_fueach[1] = ments.map(m => m.type);
      
      pvt_fu = 20 + pvt_fueach[0].reduce((sum, fu) => sum + fu, 0);

      // 喰い平和型を桁上げ
      if (pvt_fu == 20 && !is_pinfu && this.is_30fu_kuipinfu) pvt_fu = 30;
  }
  ////////////// 点数計算
  this._cal_point = function() {
      var tsumi = this.tsumi;
      const mangan = [8,12,12,16,16,(this.triple != 10) ? 16 : 24,24,24,32];

      var basepoint = ((han, fu) => {
          if (han == 0) return 0;
          if (this.is_hypaethral) {
              if (fu != 25) fu = Math.ceil(fu/10)*10;
              return 16 * fu << han;
          }
          if (han < 5) {
              if (fu != 25) fu = Math.ceil(fu/10) * 10;
              let p = 16 * fu << han;
              return (p > 8000 || (this.is_mangan77 && p > 7600)) ? 8000 : p;
          }
          if (han >= 13) {
              return mangan[8] * 1000 * Math.floor(han/13);
          }
          return mangan[han - 5] * 1000;
      })(pvt_han, pvt_fu);

      if (this.ch_kz == 0) basepoint *= 3/2;
      basepoint = Math.ceil(basepoint / 100) * 100;  // 切り上げ
      if (this.tsumo % 2 == 0) return [ basepoint + tsumi * 300 ];

      // ツモ和了の場合
      let points = [0];
      if (this.ch_kz == 0) {
          points[1] = Math.ceil(basepoint / 300) * 100 + tsumi * 100;
          points[0] = points[1] * 3;
      } else {
          points[1] = Math.ceil(basepoint / 200) * 100;
          points[2] = Math.ceil(points[1] / 200) * 100 + tsumi * 100;
          points[1] += tsumi * 100;
          points[0] = points[1] + points[2] * 2;
      }
      return points;
  };
}
HandCalc.prototype.yaku_all = {
    "PINFU": [1,0,"平和"],  "TAN":   [1, 1,"断幺"],   "YAKUHAI":[1,1,"役牌"],
    "HAITEI":[1,1,"牌底"],  "TSUMO": [1, 0,"自摸"],   "RINSHAN":[1,1,"嶺上開花"],
    "REACH": [1,0,"立直"],  "WREACH":[2, 0,"W立直"],  "1PATSU": [1,0,"一発"],
    "1PEKO": [1,0,"一盃口"],"2PEKO": [3, 0,"二盃口"], "TOITOI": [2,2,"対々和"],
    "SHO3":  [2,2,"小三元"],"DAI3": [13,13,"大三元"], "ITTSU":  [2,1,"一気通貫"],
    "3ANK":  [2,2,"三暗刻"],"4ANK": [13, 0,"四暗刻"], "4ANKT":  [26,0,"四暗単騎"],
    "HON":   [3,2,"混一色"],"CHIN":  [6, 5,"清一色"], "RYUI":   [13,13,"緑一色"],
    "HONRO": [2,2,"混老頭"],"CHINRO":[13,13,"清老頭"],"TSUI":   [13,13,"字一色"],
    "3KAN":  [2,2,"三槓子"],"4KAN":  [13,13,"四槓子"],"CHANKAN":[1,1,"搶槓"],
    "CHANT": [2,1, "全帯"],      "JCHANT":[ 3, 2,"純全帯"],
    "SHO4":  [13,13,"小四喜"],   "DAI4":  [13,13,"大四喜"],
    "3SHIKI":[2,1, "三色同順"],  "3SKDOK":[ 2, 2,"三色同刻"],
    "9REN":  [13,0, "九蓮宝灯"], "J9REN": [26, 0,"純正九蓮"],
    "KOKUSHI":[13,0,"国士無双"], "KOKUSHI13":[26,0,"国士13面"], "7TOI":[2,0,"七対子"],
    /* the following hands are disable by default */
    "1SK4J":[13,13,"一色四順"], "1SK3J":[ 3,2,"一色三順"],
    "3RENK":[2,2,"三連刻"],   "4RENK":[ 13,13,"四連刻"], "3PU":[  2,2,"三風刻"],
    "5MENC":[1,1,"五面斉"],   "HADAKA":[1,1,"裸単騎"],   "TOIPU":[2,2,"推不倒"],
    "3SK1TS":[1,0,"花竜"],    "3SKRNK":[1,1,"三色連刻"], "100MAN":[13,13,"百萬石"],
    "1SK4PO":[4,3,"一色四歩"],"1SK3PO":[2,1,"一色三歩"], "3SK3PO":[1,0,"三色三歩"] 
};

HandCalc.prototype.yaku_disable = {
    "4ANKT":true, "J9REN":true, "KOKUSHI13":true,
    "1SK4J":true, "1SK3J":true, "3RENK":true, "4RENK":true, "3PU":true, 
    "5MENC":true, "HADAKA":true, "TOIPU":true, "3SK1TS":true, "3SKRNK":true, "100MAN":true, 
    "1SK4PO":true,"1SK3PO":true, "3SK3PO":true 
};
HandCalc.prototype.exclusive = [
    ["4ANK","4ANKT","TOITOI"], ["9REN","J9REN"], ["KOKUSHI13", "KOKUSHI"],
    ["CHIN", "HON"],
    ["1PEKO", "2PEKO", "1SK4J", "1SK3J"],
    ["CHANT", "JCHANT", "HONRO", "CHINRO"]
];
HandCalc.prototype.selfduplicatable = ["YAKUHAI"];
HandCalc.prototype.triple = 11;
HandCalc.prototype.is_chuzan = true;
HandCalc.prototype.is_mangan77 = false;
HandCalc.prototype.is_pinzumo = true;
HandCalc.prototype.is_30fu_kuipinfu = true;
HandCalc.prototype.is_hypaethral = false;

//////////////////////////////////////////////////////
var JangResult = function(){
  // 入力
  this.HandObj;
  this.CalcObj;
  // 出力
  var pvt_jhans = [];
  var result_html = "";
  var pvt_id_res;
  var pvt_config = {show_haishi: true};  
  //////////////////// 総合計算
  this.get_result_by_hand = this.run = function(HandObj, CalcObj) {
      if (HandObj) this.HandObj = HandObj;
      if (CalcObj) this.CalcObj = CalcObj;
      if (typeof(HandObj) == "string") this.runByID(HandObj);
      if (!this.HandObj.split(true)) {
          return "不聴";
      }
      this._apply_max();
      result_html = this._draw_result_table();
      pvt_id_res = this._get_res_id();
      return this;
  }
  this.config_show_haishi = function(bool) {
      pvt_config.show_haishi = bool;
  };
  ////////////////// 
  this.result_table = function(){
      return result_html;
  }
  ////////////////// 
  this.result_id = function(){
      return pvt_id_res;
  }
  //////////////////// 高点法
  this._apply_max = function() {
      var ns = this.HandObj.ments();
      if (ns.length == 0) return false;

      var Calc = this.CalcObj;
      
      pvt_jhans = ns.map(n => {
          Calc.run(n);
          return {
              n: n,
              jhan: Calc.han() + "翻" + Calc.fu(true) + "符",
              point: Calc.point(0),
              han: Calc.han(),
          };
      });
      pvt_jhans.sort((a, b) => (b.point + b.han - a.point - a.han));
      Calc.run(pvt_jhans[0].n);
  };
  //////////////////
    var show_hi = function(n, single_flag) { // 牌表示
      var res = (single_flag ? [n]: n).map(n0 => {
          var type = n0[1];
          var head = n0[0];
          var pstyle = {
              0: "[ %1%2%3 ]",
              1: "%1%2%3",
              2: "%1%1",
              3: "[ %1%1%1 ]",
              4: "%1%1%1",
              5: "[ %1%1%1%1 ]",
              6: "%1" + $J.hitag(-1) + $J.hitag(-1) + "%1"
          }[type] || "%1";
          pstyle = pstyle.split("%1").join($J.hitag(head));
          pstyle = pstyle.replace( /%2\%3/, $J.hitag(head+1) + $J.hitag(head+2) );
          return pstyle;
      });
      return res.join(" ");
  };
    //////////////////
    this._haishi = function() {
        var jkz = "東南西北";
        var hai = this.HandObj.hai.slice();
        var furo = this.HandObj.n.slice();
        var aghi = this.CalcObj.aghi;
        var i = hai.findIndex(v => v == this.CalcObj.aghi);
        hai.splice(i, 1);
        var $state = jkz[this.CalcObj.ba_kz] + "場 "
            + jkz[this.CalcObj.ch_kz] + "家 "
            + ["ロン", "ツモ"][(this.CalcObj.tsumo % 2)];
        var $hai = hai.map(v => show_hi([[v, -1]])).join("");
        var $furo = show_hi(furo);
        return $state + "<br>" + $hai + " " + $J.hitag(aghi) + " " + $furo;
    };

    //////////////////
  this._draw_result_table = function(max_n) { // 計算結果出力
      if (pvt_jhans.length == 0) return false;
      
      var $hai = pvt_config.show_haishi ? this._haishi() : "";
      var Calc = this.CalcObj;
      var res = pvt_jhans[0];
      var ments = res.n.length;

      var $ments = (n => {
          if (n.length != 5) {
              return '<tr><td>' + show_hi(res.n) + "</td></tr>";
          }
          return n.map(
              (n, i) => 
                  '<tr align="center">'
                  + "<td>" + show_hi(n, true) + "</td>"
                  + "<td>" + $J.type.toString(Calc.fueach()[1][i]) + Calc.fueach()[0][i] + "符</td>"
                  + "</tr>"
          ).join("");
      })(res.n);

      var $aghi = (Calc  => {
          var ret =  '<tr><td> ( 和了牌 = ' + $J.hitag(Calc.aghi) + ' ) </td>';
          if (res.n.length != 5) return ret;
          return ret + "<td>ツモ"+ Calc.fueach()[0][5] + "符 "
              + "待ち"+ Calc.fueach()[0][6] + "符 </td>"
              + "</tr>";
      })(this.CalcObj);

      var $point = ((Calc, res) => {
          var $ret = [];
          $ret.push((res.n.length == 5) ? "<td colspan=2>" : "<td>");
          $ret.push("役：" + Calc.yaku().join(",") + "<br>"
                    + "点：" + res.jhan + " <b>" + Calc.point(0) + "点</b>");
          if (Calc.tsumo % 2) {
              var $each = (Calc.ch_kz == 0) ?
                  (Calc.point(1) + "点オール") :
                  (Calc.point(2) + " / " + Calc.point(1) + "点");
              $ret.push(" ⇒ <b>" + $each + "</b>");
          }
          $ret.push("</td>")
          return "<tr>" + $ret.join("") + "</tr>"
      })(Calc, res);
      var $table = '<table class=r>' + $ments + $aghi + $point +  '</table>';
      
      if (1 == pvt_jhans.length) return $hai + $table;

      var $another = '[他の面子の切り方]' +
          pvt_jhans.slice(1).map(ret => "<div>" + ret.jhan + "<br>" + show_hi(ret.n) + "</div>")
          .join("");

      return $hai + $table + $another;
  }
  this._get_res_id = function() {
      var ns = this.HandObj.ns();
      if (ns.length == 0) return false;
      var n = pvt_jhans[0].n;
      var Calc = this.CalcObj;
      var bytes = [
          (Calc.ba_kz << 2)|(Calc.ch_kz),
          (Calc.tsumo << 3)|(Calc.reach),
          Calc.tsumi,
          Calc.dora,
          Calc.aghi,
          n.length,
      ];
      if (n.length == 5){
          var typebyte = [
              n[0][1] << 3,
              (n[2][1] << 3) | n[1][1],
              (n[4][1] << 3) | n[3][1]
          ];
          var headbyte = n.map(nx => nx[0]);
          bytes.pop();
          bytes = bytes.concat(typebyte).concat(headbyte);
      }
      if (n.length == 7){
          var headbyte = n.map(nx => nx[0]);
          bytes = bytes.concat(headbyte);
      }
      if (n.length == 13){
          bytes[6] = n.find(nx => nx[1] == 2)[0];
      }
      return base64encode(bytes);
  };
  this.runByID = this.get_result_by_id = function(str_id){
      var bytes = base64decode(str_id);
      var Calc = new HandCalc;
      Calc.ch_kz =  bytes[0] & 0x03;
      Calc.ba_kz = (bytes[0] >> 2) & 0x03;
      Calc.reach =  bytes[1] & 0x07;
      Calc.tsumo = (bytes[1] >> 3) & 0x07;
      Calc.tsumi = bytes[2];
      Calc.dora  = bytes[3];
      Calc.aghi  = bytes[4];
      var ment = bytes[5];
      var n = [];
      switch(ment) {
      case 7:
          n = bytes.slice(6).map(byte => [byte, 2]);
          break;
      case 13:
          n = [0,8,9,17,18,26,27,28,29,30,31,32,33]
              .map(hi => [hi, bytes[6] == hi ? 2 : -1]);
          break;
      default:
          n = Array(5).fill(0).map((v, i) => {
              var type = bytes[Math.ceil(i / 2) + 5];
              if (i % 2 == 0) type >>= 3;
              return [bytes[8 + i], type & 0x7];
          });
          Calc.yaku_check(n);
          break;
      }
      this.CalcObj = Calc;
      this.HandObj = new HandSet(n);
      return this;
  };
};
//////////////////////////////////////////////////////
var HandSet = function(n)
{
  this.hai = [];  // 門前牌
  this.n = n || [];    // 副露牌
  this.t = Array(34).fill(0); // 面前牌枚数

  var pvt_mai = Array(34).fill(0); // 手牌枚数
  var pvt_split = [];              // 面子の切り方

  ////////////////// 入力整合性判定
  this.is_valid = () => {
      var nsum = this.n.reduce((sum, v) => sum + (v[1] < 0 ? 1 : (v[1] == 2 ? 2 : 3)), 0);
      if (nsum == 14) {
          this.n2nt();
          this.t2hai();
          return true;
      }

      var hsum = this.hai.length;
      if (hsum + nsum == 14) {
          this.hai2t();
          return true;
      }

      var tsum = this.t.reduce((sum, v) => sum + v, 0);
      if (tsum + nsum == 14) {
          this.n2nt();
          this.t2hai();
          return true;
      }

      return false;
  };
    
  ////////////////// 面子に切る
  this.split_into_ments = this.split = function(is_all) {
      if (!this.is_valid()) return false;
      pvt_split = [];

      var t = this.t.slice(); // 面前牌枚数
      var n = this.n.slice(); // 面子
      
      // 七対・国士
      if (this.hai.length == 14 && 
          (t.every((len, tile) => len == 0 || len == 2) ||
           t.every((len, tile) => $J.is_yao(tile) ? (0 < len) : (0 == len)))) {
          if (!is_all) return true;
          var ret = t.map((len, head) => [head, len == 1 ? -1 : len]).filter(v => v[1] != 0);
          n = [];
          pvt_split.push(ret);
      }
      
      // 面子除去用再起関数
      var get_ments = function(tile) {
          // 現行位置から牌のある場所を探す
          var index = t.slice(tile).findIndex(len => len != 0);

          // 探し切った
          if (index < 0){
              pvt_split.push(n.slice());
              return true;
          }

          // 牌の現行位置
          tile += index;
          
          // 刻子を試す
          if (t[tile] == 3) {
              t[tile] -= 3;
              n.push([tile, $J.type.anko]);
              if (get_ments(tile) && !is_all) return true;
              n.pop();
              t[tile] += 3;
          }
          // 順子を試す
          if (!$J.isji(tile) && ($J.num(tile) <= 7) && (0 < t[tile + 1]) && (0 < t[tile + 2])) {
              [0, 1, 2].forEach(next => t[tile + next]--);
              n.push([tile, $J.type.shun]);
              if (get_ments(tile) && !is_all) return true;
              n.pop();
              [0, 1, 2].forEach(next => t[tile + next]++);
          }
          return false;
      };
      
      // 4面子型
      t.some((len, tile) => {
          if (len < 2) return;
          // 雀頭
          n.push([tile, 2]);
          t[tile] -= 2;
          if (get_ments($J.m1) && !is_all) return true;
          n.pop();
          t[tile] += 2;
          return false;
      });

      return (0 < pvt_split.length);
  };
  ////////////////// 切った面子を得る
  this.ments = this.ns = function(){
      if (pvt_split.length) return pvt_split;
      this.split_into_ments(true);
      return pvt_split;
  };
  //////////////////入力変換
  this.n2nt = function(){
    var t = this.t;

    this.n = this.n.filter(nx => {
        var type = nx[1];
        var head = nx[0];
        var tappend = ({
            [-1]: head => { t[head]++; },
            [$J.type.shun]: head => [0,1,2].forEach(i => t[head + i]++),
            [$J.type.twin]: head => { t[head] += 2; },
            [$J.type.anko]: head => { t[head] += 3; },
        })[type];

        if (!tappend) return true;
        tappend(head);
        return false;
    });
    return this;
  };
  this.hai2t = function(){
      this.t = Array(34).fill(0);
      this.hai.forEach(v => this.t[v]++);
      return this.t;
  };
  this.t2hai = function(){
      this.hai = [];
      this.t.forEach((len, tile) => {
          this.hai = this.hai.concat(Array(len).fill(tile));
      });
  };
  ////////////////牌の総枚数
  this.mai = function() {
      var t = this.hai2t().slice();
      this.n.forEach(nx => {
          var type = nx[1];
          var head = nx[0];
          var tappend = ({
              [-1]:        head => { t[head]++; },
              [$J.type.shun]:  head => [0,1,2].forEach(i => t[head + i]++),
              [$J.type.chi]:   head => [0,1,2].forEach(i => t[head + i]++),
              [$J.type.twin]:  head => { t[head] += 2; },
              [$J.type.anko]:  head => { t[head] += 3; },
              [$J.type.pon]:   head => { t[head] += 3; },
              [$J.type.kan]:   head => { t[head] += 4; },
              [$J.type.ankan]: head => { t[head] += 4; },
          })[type];
          tappend(head);
      });
      return t;
  };

  this.sum = () => (this.hai.length + this.n.length * 3);
  this.sorthai = () => this.hai.sort((a, b) => (a - b));

  this.addhi = (head, type) => {
      if (isNaN(type)) type = -1;

      var a = (type < 0) ? this.hai : this.n;
      var v = (type < 0) ? head : [head, type];
      a.push(v);
      
      if (14 < this.sum() || this.mai().some(v => (4 < v))) a.pop();

      return this;
  };

  this.delhi = (order, is_n) => {
      (is_n ? this.n : this.hai).splice(order, 1);
      return this;
  };
}

var base64list = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
var base64encode = s => s.map(b => base64list.charAt(b & 0x3f)).join("");
var base64decode = t => t.split("").map(c => base64list.indexOf(c));

//////////////////////////////////////////////////////

///////// UnitTest
var UnitTest = function() {
    var ResObj  = new JangResult();
    [
        //一翻手
        {id:"AIAADQJpABNPb", h:2,f:40},
        {id:"FKAAFQJJIFKKW", h:5,f:20},
        //二翻手
        {id:"FBAAJQJJeADGJ", h:4,f:30},
        {id:"FAAAaQJJeAGJY", h:3,f:30},
        {id:"FAAABQJBEBBKT", h:2,f:30},
        {id:"FIAAWQlcWDMVg", h:5,f:50},
        {id:"FBAAHHDEGHKLM", h:4,f:25},
        {id:"FAAARQkcgFRbe", h:2,f:50},
        {id:"FIAAgQkjRFbeg", h:5,f:50},
        {id:"FIAAfQBsfNXgh", h:4,f:50},
        {id:"FIAARQkrJARah", h:5,f:60},
        {id:"CIAAJQpudJSah", h:4,f:90},
        //三翻手
        {id:"FIAAEQJbEBBch", h:5,f:30},
        {id:"CBAAHQJJRFFTT", h:5,f:30},
        {id:"CAAAUQIBRAJSY", h:3,f:30},
        //清一色
        {id:"CAAATQJIZSSVY", h:6,f:30},
        {id:"CAAAZQJJaTTVX", h:8},
        //役満
        {id:"CIAAZQkkNLZbd", h:13},
        {id:"BAAARNb",       h:13},
        {id:"AIAAhNb",       h:13},
        {id:"GYAAVQIsXTTZg", h:13},
        {id:"GAAAIQccIAJRS", h:13},
        {id:"FAAANQhbdLbce", h:13},
        {id:"EAAAbQccJbcde", h:13},
        {id:"GIAAcQuucBIQg", h:13},
        {id:"GYAAfQjbdcfgh", h:26},
    ].forEach(v => {
        ResObj.get_result_by_id(v.id).run();
        var $head = (v.h == ResObj.CalcObj.han()) &&
            (!v.f || v.f == ResObj.CalcObj.fu(true)) ?
            "<div class=test>" : "<div class='test fail'>";
        document.getElementById("result").innerHTML +=
            $head + ResObj.result_table() + "</div>";
    });
};
