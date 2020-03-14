// charset=euc-jp
// ver.1.22 since 2014-01-12

var MAX_LEVEL = 5;
var COND_CLEAR = 5;
var INIT_SPARE = 4;
var TIME_LIMIT = 15;

var stState = 0;
var gCntR = gCntM = gCntT = gLevel = 0;
var gMode;
var gPsgID;
var gRtime;
var gQObj;
var gResObj;
var QHand; //何とかしたい..

var PointQuiz = function(){
  this.QHand;
  this.QStat;
  this.level;
  this.yaku_id; // 役[99ランダム/0一通/1全帯/2三色/3混一/4断/5対対/6役牌/7七対子/8平和]
  this.dora;
  this.mnt;
  this.stRange;
  ////////////////// 問題作成
  this.make_quiz0 = function(level){
    var is_define = false;
    var target_lv = [0,5,15,30,50,200];
    var upper_lv = target_lv[level];
    var lower_lv = target_lv[level-1];

    $("#debug").html("");
    while(!is_define){
      var yaku_id = this.yaku_define(level);
      $("#debug").append("yaku_id = "+style_redbold(yaku_id)+"<br>");
      for(var i=0; i<15; i++){
        if(i%3 == 0 && i>0){ lower_lv--; upper_lv++; }
        var is_limited2menzen = ( Math.random() * 3 < 1 )? false : true;
        if( yaku_id == 5 ) is_limited2menzen = false;
        if( yaku_id == 8 ) is_limited2menzen = true;
        this.make_stats();
        var is_allowed2kong = (Math.random() * 3 < 1);
        if(level == 5) is_allowed2kong = true;
        this.make_hands(is_limited2menzen, is_allowed2kong);
        this.calc_ans();
        this.apply_doraconfig();
        var lv = this.level_det();
        if(level > 0 && level <= MAX_LEVEL &&
           (lv < 0 || lv < lower_lv || lv > upper_lv)) continue;
        is_define = true;
        break;
      }
    }
    gResObj.HandObj.t[this.QStat.aghi]--;
  }
  ////////////////// レベル別役設定
  this.yaku_define = function(level){
    var odds = Array(8);
    odds[1] = [ 8, 4, 4, 4, 1, 4,1,4,30,40,1,1,1,1,1];
    odds[2] = [10, 4, 4, 4, 4, 4,1,4,20,30,0,1];
    odds[3] = [13, 1, 1, 1, 1, 1,1,1];
    odds[4] = [13, 1, 1, 1, 1, 1,1,1];
    odds[5] = [10, 0, 1, 0, 1, 1,2,2];
    odds[0] = [218, 19, 26, 19, 23, 26, 25, 32, 55, 77, 1,1,1,1,1];
    var prob = (level>0 && level<=MAX_LEVEL) ? odds[level] : odds[0];
    var odds_sum = 0;
    var yaku_id;
    
    for(var i=0; i< prob.length; i++){ odds_sum += prob[i]; }
    var tmp = parseInt(Math.random()*odds_sum);
    odds_sum = 0;
    for(var i=0; i< prob.length; i++){
      odds_sum += prob[i];
      if( tmp < odds_sum ){
        yaku_id = (i==0 ? 99 : i-1);
        break;
      }
    }
    this.yaku_id = yaku_id;
    return yaku_id;
  }
  ////////////////// 問題レベル判定
  this.level_det = function(){
    var lv = 0;
    var QStat = gResObj.CalcObj;
    var num_kots = 0;
    var fu_sum = 0;
    if(QStat.fueach().length > 0){
      for( var i=0; i<7; i++ ){
          if( QStat.fueach()[0][i] == 0 ) continue;
          fu_sum += QStat.fueach()[0][i];
          if(i<5 && QStat.fueach()[1][i]!= 2 ) num_kots++;
      }
    }
    var is_tsumo  = (QStat.tsumo % 2);
    var is_menzen = gResObj.HandObj.n.length == 0;
    var is_mangan = (QStat.point(0) >= 8000 && QStat.ch_kz > 0) ||
        (QStat.point(0) >= 12000 && QStat.ch_kz == 0 );
    var is_tenkei = (Math.pow(2, QStat.han()) * QStat.fu(true) <= 512) && fu_sum >= 10;
    var is_pingf = (QStat.yaku().indexOf("平和(1)") >= 0 );
    var is_7toi  = (QStat.fu(true) == 25 );

    /*[面子切り分けがしづらい形の判定]
      "他の面子の切り方"がある or
      一色9枚以上の連続牌姿形 + 3枚持ちを含むもの: 122233344, 122333445
    */
    var is_hardments = ( gResObj.HandObj.ns.length > 1);
    var t = gResObj.HandObj.t;
    for(var i=0; i<27 && !is_hardments; i++){
      if(i%9==0 || t[i]==0){
        var seq = 0;
        var possible = false;
      }
      seq += t[i];
      if(t[i] >= 3) possible = true;
      if( seq >= 9 && possible) is_hardments = true;
    }

    var debug = "";

    if( QStat.ch_kz == 0 && !is_tsumo){ lv +=  3; debug +="+親栄"; }
    if( is_tsumo )                    { lv +=  5; debug +="+自摸"; }
    if( is_hardments )                { lv += 10; debug +="+切分け難"; }

    //----- 満貫未満 ------------- 
    if(!is_mangan || is_tenkei){
      lv += num_kots * 5; debug += "+"+num_kots+"刻子";
      if( !is_pingf && !is_7toi ){ lv +=  7; debug +="+非平和七対"; }
      //if( kots >= 1 && is_menzen && fu_sum >=6 && !is_tsumo){ lv += 7; debug += "+門前栄"; }
      if( QStat.han() < 4 ){
        if(fu_sum == 10 || fu_sum == 12) { lv += 10;     debug += "+符10-12"; } // 符ハネのギリライン
        if(fu_sum == 14 || fu_sum == 16) { lv += 5;      debug += "+符14-16"; }
        if(fu_sum >= 18 )                { lv += fu_sum; debug += "+符" + fu_sum; }
        if(QStat.fu(true) == 70 )                    { lv += 10; debug += "+70符"; } 
        if(QStat.fu(true) == 90 && QStat.ch_kz == 0 ){ lv += 10; debug += "+90符親"; } 
      }
      $("#debug").append("Tk_lv=" + lv +" ["+debug+"]<br>");
      return lv;
    }
    //----- 満貫以上 ------------- 
    if(QStat.han() > 20) return -1; // ダブル役満
    var yakulen_pin7cmplx = 0;
    var yakulen_forgetful = 0;
    var is_chin = false;

    for(var i=0; i<QStat.yaku.length; i++){
      if(QStat.yaku[i].match(/^(平和|立直|一発|自摸|断幺|七対子)/)) continue;
      if(QStat.yaku[i].match(/^清一色/)){ var is_chin = true; continue; }
      yakulen_pin7cmplx++;
      if(QStat.yaku[i].indexOf("(1)") > 0 || QStat.yaku[i].indexOf("(13)") > 0) continue;
      if(QStat.yaku[i].match(/^(混一色\(2\)|対々和|全帯|三色同順|一気通貫|小三元|七対子)/))
        continue;
      yakulen_forgetful++;
    }
    if(QStat.han() <= 3){ lv += 20; debug += "+三翻満貫" }
      if( QStat.yaku.length == 1 && QStat.han() == 13) // 単一役満
      lv += 0;
    else if( (!is_chin && is_pingf) || is_7toi ) // 平和または七対子
        lv += (yakulen_pin7cmplx + yakulen_forgetful + (QStat.dora ? 1:0) - 1) * (QStat.han() - 1);
    else { // その他
      lv += (QStat.yaku.length + yakulen_forgetful + (QStat.dora ? 1:0) - 1) * (QStat.han() - 1);
      debug += " + " + (QStat.yaku.length + yakulen_forgetful + (QStat.dora ? 1:0)) + "役" + QStat.han() + "翻";
    }
    $("#debug").append("Mg_lv=" + lv +" ["+debug+"]<br>");
    return lv;
  }
  ////////////////// 面子作成
  this.make_ments = function(order){
    var i = order;
    var yaochu = [0,8,9,17,18,26,27,28,29,30,31,32,33];
    var type = (i==4) ? 2:(parseInt(Math.random()*5)<4 ? 1:4);
    // ↑各面子の種別 <0-6 = 明順/暗順/対子/明刻/暗刻/明槓/暗槓>
    var head = parseInt(Math.random()*34);
    var range = this.stRange;
    var mai = QHand.mai();
    var QStat = this.QStat;
    
    switch(this.yaku_id){
    case 0: // 一通
      if(i>=3) break; 
      if(i==0) range = parseInt(Math.random()*3);
      head = 9*range + 3*i;
      type = 1;
      break;
    case 1: // 全帯
      head = yaochu[parseInt(Math.random()*13)];
      if(type == 1 && head%9==8) head -= 2;
      break;
    case 2: // 三色
      if(i>=3) break; 
      if(i==0) range = parseInt(Math.random()*7);
      head = range + 9*i;
      type = 1;
      break;
    case 3: // 混一
      if(i==0) range = parseInt(Math.random()*3);
      head = 18 +　parseInt(Math.random()*16);
      if(head<27) head -= range*9;
      break;
    case 4: // 断
      head = 0;
      while(head%9==0 || head%9==8 || (head%9==6 && type==1))
        head = parseInt(Math.random()*27);
      break;
    case 5: // 対々
      type = (i==4)?2:4;
      head = parseInt(Math.random()*34);
      break;
    case 6: // 役牌 
      if( i>0) break; 
      type = 4;
      head = 0;
      while(head!=QStat.ba_kz && head!=QStat.ch_kz && head<4)
        head = parseInt(Math.random()*7);
      head +=27;
      break;
    case 7: // 七対子
      type = 2;
      while(mai[head]>0) head = parseInt(Math.random()*34);
      break;
    case 8: // 平和
      if(i==4)
        while( head>30 || head== QStat.ch_kz+27 || head == QStat.ba_kz+27)
          head = parseInt(Math.random()*30);
      else
        type = 1;
      break;
    case 9: // 緑一色
      var tmp = parseInt(Math.random()*12);
      if( i < 4 ) type = ( tmp < 4 ) ? 1 : 4;
      if( tmp < 5 ) head = 19;
      else if( tmp == 5 ) head = 20;
      else if( tmp == 6 ) head = 21;
      else if( tmp == 7 ) head = 23;
      else if( tmp == 8 ) head = 25;
      else if( tmp >= 9 ) head = 32;
      break;
    case 10: // 老頭和
      head = yaochu[parseInt(Math.random()*13)];
      if( i < 4 ) type = 4;
      break;
    case 11: // 大三元
      if(i>=3) break;
      head = 31 + i;
      type = 4;
      break;
    case 12: // 字一
      head = 27 + parseInt(Math.random()*7);
      if( i < 4 ) type = 4;
      break;
    }
    
    // 振り直し
    if(type==1 && ( head>=27 || head%9>=7 ) ) return false;
    if(type==4 && mai[head]>1) return false;
    if(type==2 && mai[head]>2) return false;
    if(type==1 && (mai[head]>3 || mai[head+1]>3 || mai[head+2]>3) ) return false;

    this.stRange = range;
    return [head, type];
  }

  ////////////////// 副露設定
  this.make_furo = function(is_limited2menzen, is_allowed2kong ){
    var mnt = this.mnt;
    var n = QHand.n;
    var head, type;
    var mai = QHand.mai();
    
    for(var i = mnt-1; i>=0; i--){
      head = n[i][0];
      type = n[i][1];
      if(type==2 || Math.random()*2 < 1) continue;
      if(!is_limited2menzen && type==1) n[i][1] = 0; // 明順化
      if(type==4){
        var tmp = parseInt(Math.random()*3);
        if(is_limited2menzen){
          if(mai[head]!=4 && is_allowed2kong && tmp==2) n[i][1] = 6;
        } else if(tmp==0 || mai[head] ==4 || !is_allowed2kong) n[i][1] = 3; // 明刻化
        else if(tmp==1) n[i][1] = 5; // 明槓化
        else if(tmp==2) n[i][1] = 6; // 暗槓化
      }
    }
  }

  ////////////////// 和了形作成
  this.make_hands = function(is_limited2menzen, is_allowed2kong ){
    var yaku_id = this.yaku_id;
    this.QHand = new HandSet();
    QHand = this.QHand;
    var n = QHand.n;
    var order = 0;
    var mnt = (yaku_id==7) ? 7:5;
    var yaochu = [0,8,9,17,18,26,27,28,29,30,31,32,33];
    if( yaku_id==7 || yaku_id==8 || yaku_id==13 || yaku_id == 99 )
      is_limited2menzen = true;
    if( yaku_id>=9 && yaku_id<=12 ) is_limited2menzen = false;
    
    // 国士
    if(yaku_id==13){
      for(i=0;i<13;i++) QHand.t[yaochu[i]] = 1;
      QHand.t[yaochu[parseInt(Math.random()*13)]]++;
      mnt = 0;
    }
    // 九連宝燈
    
    // 一般手
    while(order < mnt ){
      do{
        var n_fac = this.make_ments(order);
      }while( n_fac === false )
      n.push(n_fac);
        //QHand.nt2mai();
      order++;
    }

    this.mnt = mnt;
    if(!is_limited2menzen || is_allowed2kong) this.make_furo(is_limited2menzen, is_allowed2kong );
  }

  ////////////////// ドラ表示牌
  this.get_dora_indicator = function(dora){
    if(dora==0 || dora==9 || dora==18 ) return dora+8;
    if(dora==27 ) return dora+3;
    if(dora==31 ) return dora+2;
    return dora-1;
  }
  ////////////////// 指定した数のドラを載せる
  this.apply_doraconfig = function(){
    var QStat = this.QStat;
    var mangan_han = Math.LOG2E * Math.log(50 / (QStat.fu(true)/10));
    var dora_lower = 0;
    var dora_upper = 3;
    if(QStat.han() < mangan_han) 
      dora_upper = Math.floor(mangan_han) - QStat.han();

    // ドラを載せる
    for(var i=0; i<50; i++){
      QStat.dora = this.set_dora();
      if(QStat.dora < dora_lower || QStat.dora > dora_upper) continue;
      break;
    }
    // 答えを再計算する
    gResObj.CalcObj = QStat;
    gResObj.run();
    res = gResObj.result;

    $("#debug").append("ドラ = " + QStat.dora+"個/{"+dora_lower+"~"+dora_upper+"}<br>");
  }
  ////////////////// ドラ載せ
  this.set_dora = function(){
    this.dora = [];
    var num_dora = 1;
    var dora_sum = 0;
    var n = this.QHand.n;
    var QStat = this.QStat;
    var mai = this.QHand.mai();
    for(var i=0; i<n.length; i++) if(n[i][1]>=5) num_dora++;
    if(QStat.reach) num_dora *= 2;
    var i=0;
    var maitak = mai.slice();
    while(i<num_dora){
      var dora = parseInt(Math.random()*34);
      dora_ind = this.get_dora_indicator(dora);
      if(maitak[dora_ind] == 4) continue;
      maitak[dora_ind]++;
      this.dora.push(dora);
      dora_sum += mai[dora];
      i++;
    }
    return dora_sum;
  }
  ////////////////// 和了条件作成
  this.make_stats = function(){
    this.QStat = new HandCalc();
    var QStat = this.QStat;
    
    // 状況設定
    QStat.ba_kz = parseInt(Math.random()*2); // 場 [0東/1南/2西/3北]
    QStat.ch_kz = parseInt(Math.random()*4); // 家 [0東/1南/2西/3北]
    QStat.tsumo = parseInt(Math.random()*2); // あがり方 [0ロン/1ツモ]
    var rnd_rh = parseInt(Math.random()*100);
    
    // 立直 [0ダマ/1立直/2立直一発(/3W立直/4W立直一発)]
    if(rnd_rh<40)      QStat.reach = 0;
    else if(rnd_rh<97) QStat.reach = 1;
    else               QStat.reach = 2;
  }
    
  ////////////////// 答えの計算
  this.calc_ans = function(){
    var QStat = this.QStat;
    var QHand = this.QHand;
    var n = this.QHand.n;
    // 平和の場合、ここで和了牌取得
    var aghi = -1;
    if(this.yaku_id==8)
      do
        aghi = n[parseInt(Math.random()*4)][0] + 2*(parseInt(Math.random()*2));
      while(aghi%9==2 || aghi%9 == 6 );

    // 和了牌取得
    QHand.is_valid();
    var pos = parseInt(Math.random()*QHand.hai.length);
    QStat.aghi = (aghi == -1) ? QHand.hai[pos] : aghi;

    // 答えを計算する
    gResObj  = new JangResult();
    gResObj.config_show_haishi(false).run(QHand, QStat);

    // 0点の場合
    if(gResObj.CalcObj.point(0) == 0){
      if( parseInt(Math.random() * 4) == 0 )
        QStat.tsumo = 1;
      else {
        QStat.reach = 1;
        QStat.tsumo = parseInt(Math.random()*2);
      }
      gResObj.CalcObj = QStat;
      gResObj.run();
    }
  }
}
var gMode = {
 mode: 0,
 is_levelup: true,
 is_timer: true,
 is_ansfu: false,
 is_ansopt: false
};
 
////////////////// 状態遷移
function state_machine(){
  var QSTATE = {
   INIT_GAME     : 0,
   LV_INDICATION : 1,
   TINGPAI       : 2,
   START_QUIZ    : 3,
   ANSWER_CHECK  : 4,
   GAMEOVER      : 5,
   REGISTER      : 6,
   BACK_TO_TITLE : 7
  };
  switch(stState){
  case QSTATE.INIT_GAME:
    if(!init_config()) break;
    stState = QSTATE.LV_INDICATION;
    state_machine();
    break;
  case QSTATE.LV_INDICATION:
    gCntR = 0;
    if(gMode.is_levelup){
      gLevel++;
      $("#clear").html(gCntR + " / " + COND_CLEAR);
    }
    show_level();
    count_start(2);
    stState = QSTATE.TINGPAI;
    return;
  case QSTATE.TINGPAI:
    question();
    stState = QSTATE.START_QUIZ;
    break;
  case QSTATE.START_QUIZ:
    show_agari();
    stState = QSTATE.ANSWER_CHECK;
    break;
  case QSTATE.ANSWER_CHECK:
    switch( admission() ){
    case false:
    case NEXT.HOLD: return;
    case NEXT.LEVELUP:  stState = QSTATE.LV_INDICATION; return;
    case NEXT.GAMEOVER: 
    case NEXT.COMPLETE: stState = QSTATE.GAMEOVER;      return;
    case NEXT.PROCEED:  stState = QSTATE.TINGPAI;       return;
    }
    break;
  case QSTATE.GAMEOVER:
    stState = (show_ending()) ? QSTATE.REGISTER : QSTATE.BACK_TO_TITLE;
    break;
  case QSTATE.REGISTER:
    if(ranking_submit()) stState = QSTATE.BACK_TO_TITLE;
    break;
  case QSTATE.BACK_TO_TITLE:
    location.href = "?";
    break;
  }
}

////////////////// チェックボックス読取り
function is_checked(selector){
  var checked = $(selector).prop('checked');
  if(checked==="false") checked = false; // docomoフルブラウザのバグ対策
  return checked;
}

////////////////// 初期設定
function init_config(){
  gMode.mode = $("#level_select").val();
  switch(parseInt(gMode.mode)){ 
  case 0:
    gMode.is_ansopt = is_checked("#ansopth");
    if(gMode.is_ansopt)    TIME_LIMIT = 10;
    break;
  case 2:
    break;
  case 1:
    //gMode = $('#level_select option:selected').val();
    gLevel = parseInt($(":radio[name=config]:checked").val() );
    gMode.is_levelup = false;
    gMode.is_timer  = !is_checked("#nolimit");
    gMode.is_ansopt = is_checked("#ansopt");
    gMode.is_ansfu  = is_checked("#ansfu");
    if(gMode.is_ansopt && gMode.is_ansfu) gMode.is_ansfu = false;
  }
  if(gMode.is_ansopt){
    $("#note_kb").html("(クリック直後に正解表示)");
    $("#title_kb").html("選択肢");
  }

  if($("#opt_debug").attr('checked')){
    gMode.is_timer = false;
    $("#presentation, #sidebox").show();
    $("#titlebox, #config, .calc").hide();
    $("#ranking").html('<div id="debug"></div>');
    gQObj = new PointQuiz;
    gQObj.make_quiz0(gLevel<0 ? 6 : gLevel);
    show_tingpai();
    show_stat();
    show_agari();
    $("#result").html(gResObj.result);
    $("#start").val("開始(Enter)");
    return false;
  }

  return true;
}

////////////////// レベル表示
function show_level(){
  var strLevel;
  $("#result").html("");
  $("#presentation, #config, #ranking, #tenkey").hide();
  $("#titlebox, #sidebox").show();
  if(gMode.mode == 2) strLevel = "DEMO";
  else if(gLevel<0) strLevel = "LEVEL RANDOM";
  else strLevel = "LEVEL" + gLevel;
  $("#title").html("<h2>" + strLevel + "</h2>");
  if(gMode.mode == 1) $("#title").append("練習モード");
}
/////////////// 出題
function question(){
  $("#titlebox").hide();
  $("#presentation").show();
  if(gMode.mode != 2){
    $("#card").html("(問題作成中)");
    gQObj = new PointQuiz;
    gQObj.make_quiz0(gLevel<0 ? 6 : gLevel);
  }
  show_tingpai();
  show_stat();
  count_stop();
  count_start(5);
}
/////////////// 聴牌形表示
function show_tingpai(){
  var is_reach = gResObj.CalcObj.reach;
  var QStat = gResObj.CalcObj;
  var output_string = "";
  var char_kz = "東南西北";

  $("#fieldplate").html(char_kz[QStat.ba_kz]+ "場");
  show_dora(true);
  output_string += char_kz[QStat.ch_kz]+ "家 ";
  if(is_reach) output_string += '<img src="reach.png" alt="立直棒">';
  output_string += "<br>";
  var t = gResObj.HandObj.t;
  var n = gResObj.HandObj.n;
  var TmpResObj = new JangResult;
  for(var i=0;i<t.length;i++){
    for(j=0;j<t[i];j++) output_string += hi_tag(i);
  }
  output_string += ' <span id="agari"></span>';
  $("#card").html( output_string );
  $("#furo").html(" " +  TmpResObj.show_ments(n));
}

/////////////// 状況表示
function show_stat(){
  var QStat = gResObj.CalcObj;
  var char_kz = new Array("東","南","西","北");
  var char_rh = QStat.reach ? '立直':"ダマ";
  var queue = "";

  queue += (QStat.ch_kz==0 ? style_redbold("親") : "子" ) + "が"; 
  queue += char_rh;
  queue += ' <span id="quest">で聴牌中。</span>';

  $("#ft").html( '和了まで:<br><span id="count" style="font-size:150%;">5</span>秒');
  $("#level").html(gLevel);
  $("#start").val("和了(Enter)");
  $("#command").html(queue);
  $("#result").html("");
  $("#inp_ans").val("");
  $("#debug").append("点 = "+QStat.point(0)+" = "+QStat.point(2)+" &amp; "+QStat.point(1));
}
/////////////// ドラ表示
function show_dora(is_omote){
  var num_dora = gQObj.dora.length;
  var is_reach = gQObj.QStat.reach;
  var num_omote = num_dora / (is_reach ? 2:1);
  
  $("table.wanpai td").html("");
  $("table.wanpai tr:first-child td").html(hi_tag(-1));

  for(var i=0; i < (is_omote ? num_omote : num_dora); i++){
    var pos = i + 2;
    if(is_reach && i >= num_omote) pos += 7 - num_omote; // 下段
    var res = hi_tag(gQObj.get_dora_indicator(gQObj.dora[i]));
    $("table.wanpai td").eq(pos).html(res);
  }
  return;
}
var opt21 = [24, 32, 40, 48, 56, 64, 72, 80, 88, 96, 112, 128, 144, 160, 176, 192, 200, 300, 400, 600, 800];
/////////////// 選択肢作成
function make_options(is_tsumo, ch_kz){
    var res = "";
    for(var i=0; i<21; i++){
        var val = opt21[i];
        if(!ch_kz &&  is_tsumo) val *= 2;
        if( ch_kz && !is_tsumo) val *= 4;
        if(!ch_kz && !is_tsumo) val *= 6;
        res += "<li>";
        res += Math.ceil(val/10);
        if( ch_kz &&  is_tsumo) res += " <br>"+Math.ceil(val * 2 / 10)
        res += "</li>\n";
    }
    $(".calc").html(res);
    $(".calc li").css("width","40px").css("line-height", ( ch_kz && is_tsumo ? "30px":"60px"))
    .click( function(){
    try {
        $("#inp_ans").val($(this).text());
        state_machine();
    } catch(e){}
    });
}
/////////////// 和了形表示
function show_agari(){
  var QStat = gResObj.CalcObj;
  var is_1patsu = QStat.reach==2 || QStat.reach==4;
  var tsumo = QStat.tsumo;
  var aghi = QStat.aghi;
  var queue = "で和了。";
  var str1patsu = "";
  if(is_1patsu) str1patsu = (gResObj.HandObj.n.length ? "" : "<br>") + style_redbold('一発');
    
  if(gMode.is_ansopt) make_options(QStat.tsumo % 2, QStat.ch_kz);
  if(gMode.is_ansfu){
    queue += "何翻何符。<br>([翻, 符]の形式で入力)";
  }else if(tsumo%2==0) 
    queue += "何点。";
  else if(QStat.ch_kz==0) 
    queue += "何点オール。";
  else {
    queue += "何点ずつ。<br>([子/親]の形式で入力)";
  }
  count_stop();
  
  var ag = machi_search();
  var output_string = "(" + ag.map(tile => hi_tag(tile)).join("") + "待ち)";

  if(gMode.is_timer)   
    $("#ft").html( '解答時間:<br><span id="count" style="font-size:200%;">' + TIME_LIMIT + '</span>秒');
  else
    $("#ft").html('');
  show_dora(false);
  $("#agari").html(str1patsu + (tsumo ? "ツモ":"ロン") + hi_tag(aghi));
  $("#start").val("解答(Enter)");
  $("#result").html( output_string );
  $("#quest").html(queue);
  $("#tenkey").slideToggle(200);
  if(gMode.is_timer) count_start(TIME_LIMIT);
}
/////////////// 待ち牌検索
function machi_search(){
  var p = new HandSet();
  p.t = gResObj.HandObj.t.slice();
  p.n = gResObj.HandObj.n.slice();
  p.t2hai();
  var mai = p.mai();
  return [...Array(34)].map((zero, i) => i).filter(tile => {
      if (gResObj.CalcObj.aghi == tile) return true;
      if (mai[tile] == 4) return false;
      p.hai.push(tile);
      var ret = p.split();
      p.hai.pop();
      return ret;
  });
}
////////////////// 合否判定
function admission(inp){
  var QStat = gResObj.CalcObj;
  var aghi = QStat.aghi;
  var inp  = $("#inp_ans").val();
  var is_timeleft = gRtime > 0 || !gMode.is_timer;

  inp = inp.replace(/[０-９]/g, function(s) {
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
  });
  inp = inp.replace(/[^0-9]/g,' ');
  inp.match(/([0-9]+) +([0-9]+)/);

  if( inp == "" && is_timeleft ) return false;

  var valA = parseInt(inp);
  var valB = parseInt(RegExp.$2);
  var is_correct = true;

  if(gMode.is_ansfu){
    if( valA < 5 && !valB && is_timeleft ) return false;
    var fu_ceil = QStat.fu(true);
    if( QStat.han() != valA ) is_correct = false;
    else if( fu_ceil != valB && QStat.han() <5 ) is_correct = false;
  } else if(QStat.tsumo%2==0){
    if( valB && is_timeleft ) return false;
    if(QStat.point(0) != valA && QStat.point(0) != valA*100 ) is_correct = false;
  } else if(QStat.ch_kz==0){
    if( valB && is_timeleft ) return false;
    if(QStat.point(1) != valA && QStat.point(1) != valA*100 ) is_correct = false;
  } else {
    if( !valB && is_timeleft ) return false;
    if(   ( QStat.point(2) != valA && QStat.point(2) != valA*100 )
       || ( QStat.point(1) != valB && QStat.point(1) != valB*100 ) )
      is_correct = false;
  }
  var rtime = count_stop();
  if(is_correct) gCntT += 1 + rtime;
  return show_answer(is_correct);
}
var NEXT = {
 HOLD     : 0,
 PROCEED  : 1,
 GAMEOVER : 2,
 LEVELUP  : 3,
 COMPLETE : 4
};
////////////////// 解答表示
function show_answer(is_correct){
  var QStat = gResObj.CalcObj;
  var swc_next = NEXT.PROCEED;
  
  if(is_correct) 
    gCntR++;
  else 
    gCntM++;
     
  if(gMode.is_levelup){ 
    if(gMode.mode==2 || INIT_SPARE <= gCntM)
      swc_next = NEXT.GAMEOVER;
    else if(gCntR >= COND_CLEAR)
      swc_next = (gLevel >= MAX_LEVEL) ? NEXT.COMPLETE : NEXT.LEVELUP;
  }
  var show_ft = is_correct ?
    '<span style="color:red;  font-size:200%; font-weight:bold;">&#x25ef;</span>':
    '<span style="color:blue; font-size:200%; font-weight:bold;">×</span>';
  if(is_correct){
    show_ft += "<br>" + (swc_next == NEXT.LEVELUP ? style_redbold( "昇格!") : "正解!");
  } else {
    show_ft += "<br>正解:";
    if(QStat.tsumo%2==0){
      show_ft += (QStat.point(0)/100);
    } else if(QStat.ch_kz==0){
      show_ft += (QStat.point(1)/100);           
    } else
      show_ft += (QStat.point(2)/100) + "/" + (QStat.point(1)/100);
  }
  $("#ft").html(show_ft);

    var permalink = '<a href="?' + gResObj.result_id() + '&' + base64encode(gQObj.dora) +
    '" target="_blank">この和了手のパーマリンク</a>';
   
  if(gMode.is_levelup){
    var res = "";
    for(var i=0; i < INIT_SPARE - gCntM; i++) res += "☆";
    $("#survive").html(res);
    $("#clear").html(gCntR + " / " + COND_CLEAR);   
  } else
    $("#clear").html("正答率: " + gCntR + " / " + (gCntR + gCntM) );
    $("#result").html( gResObj.result_table() + permalink  );
  $('#start').val('次(Enter)');
  $("#tenkey").css( "display", "none" );
  return swc_next;
}
////////////////// 終了表示
function show_ending(){
  if(!gMode.is_timer || gMode.mode==2) return back_to_top("");

  var is_clear = (gLevel >= MAX_LEVEL && gCntR >= COND_CLEAR);

  if(is_clear){
    var res = "<h2>Game Completed</h2>" +
      "実質おめでとう!<br>(もう少し派手な描写にしたい)";
  } else {
    var res = "<h2>Game Over</h2>" + 
      " 所詮 LEVEL " + gLevel + " 止まりなのよ!";
  }
  $("#presentation").hide();
  $("#result, #ft_column").html("").css("clear","both");
  $("#titlebox").show();
  $("#title").hide().html(res).fadeIn("slow");
  $("#inp_ans").val("").css("width", "100%");
  if(gLevel==1 && gCntR==0){
    $.get("ankorotest.php", {}, back_to_top );
    return false;
  }
  $('#command').html('名前を入力してください。');
  $('#start').val('ランキング登録').css("width", "auto");
  return true;
}
////////////////// ネトラン登録
function ranking_submit(){
  var inp  = $("#inp_ans").val();
  if(inp.length==0) return false;
  $("#inp_ans").val("");
  var sum_r = gCntR + (gLevel - 1) * COND_CLEAR;
  var sum_q = sum_r + gCntM;
  var point = Math.round(sum_r * 100 + ( gCntT * gCntT / sum_r / sum_r ) * 2);
  $.post("ankorotest.php", 
         {"Absolute":(point + "<>" + inp + "<>"+ sum_r + "<>" + sum_q + "<>" + gCntT)}, 
         back_to_top );
  return true;
}
////////////////// トップに戻る
function back_to_top(res){
    $("#command").html("おつかれさまでした。");
    $("#sidebox").hide();
    $("#start").val("トップに戻る");
    if(res) $("#ranking").html(res);
    $("#ranking").show();
    return false;
}
//////////////// ルール表示
function rule_indicate(flag){
  if(flag){
    $("#rule").slideToggle(200);
    $("#main").hide();
  } else {
    $("#main").show();
    $("#rule").hide();
  }
}
//////////////// カウンタ開始
function count_start(sec) {
    gRtime = sec;
    gPsgID = setInterval('showPassage()',1000);
}
//////////////// カウンタ中止
function count_stop() {
    if(gPsgID) clearInterval( gPsgID );
    var ret = gRtime;
    gRtime = 0;
    return ret;
}
/////////////// カウントダウン
function showPassage() {
    gRtime--;
    $("#count").html(Math.ceil(gRtime));
    if(gRtime <= 0) state_machine();
}
/////////////// 赤太字タグ
function style_redbold(str){
  //return str;
  return '<span class="redbold">'+str+'</span>';
}
/////////////// 牌画タグ
var hi_tag = $J.hitag = function(hi)
{
    if (hi < 0 || 34 <= hi) hi = 34;

    var hinamej = [
        "一萬","二萬","三萬","四萬","五萬","六萬","七萬","八萬","九萬",
        "一筒","二筒","三筒","四筒","五筒","六筒","七筒","八筒","九筒",
        "一索","二索","三索","四索","五索","六索","七索","八索","九索",
        "東","南","西","北","白","發","中"
    ];

    var x = (hi % 9);
    var y = (hi - x) / 9;
    var img = {
        style: ["left:" + (-x * 18) + 'px', "top:" + (-y * 24) + "px"].join(";"),
        src: "haiga.png",
        alt: hinamej[hi] || "■",
    };

    var $img = "<img " + Object.keys(img).map(key => key + "=" + img[key]).join(" ") + ">";
    return '<span class="tile">' + $img + "</span>";
};
/////////////// クエリ受け取り
function getRequest(){
  if(location.search.length > 1){
    var get = new Object();
    var ret = location.search.substr(1).split("&");
    return ret;
  } else {
    return false;
  }
}
/////////////// クエリロード
function form_load(){
  var c = getRequest();
  var base64list = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  if(!c) return false;

  gQObj = new PointQuiz;
  gResObj  = new JangResult();
  gResObj.config_show_haishi(false).run(c.shift());
  HandObj = gResObj.HandObj;

  if (!HandObj.split(true)) return false;
  gResObj.run();
  gQObj.QStat = gResObj.CalcObj;
  gQObj.dora  = base64decode(c.shift());
  gQObj.level_det();
  gResObj.HandObj.t[gResObj.CalcObj.aghi]--;

  $("#number").html("<u>DEMO</u><br>Clear: 0");
  $('select#level_select option').remove();
  $('select#level_select').append($('<option>').html("デモ").val("2"));

  return true;
}
/////////////// イベントハンドラ
$(document).ready( function() {
    var yaku_all = (new HandCalc()).yaku_all;
    var res = "";
    for(var i=0; i<yaku_all.length; i++){
      if(i>0) res += ", ";
      // if(i>0 && i%5==0) res += "<br>\n";
      res += yaku_all[i][3];
      res += "(" + yaku_all[i][1];
      if( yaku_all[i][2] > 0 ) res += "/" + yaku_all[i][2];
      res += ")";
    }
    $("#yakulist").html(res);
    
    if(form_load()){
      state_machine();
    } else {
      $.get("ankorotest.php", {}, function(res){ $("#ranking").html(res);} );
    }
    $("#start").click( function(){  state_machine(); } );
    $("#show_rule").click( function(){  rule_indicate(true); } );
    $("#hide_rule").click( function(){  rule_indicate(false); } );
    $("#level_select").change(function(){
        gMode.mode = $("#level_select").get(0).selectedIndex;
        if(gMode.mode==0){
          $("#titlebox").show();
          $("#config").hide();
        }else {
          $("#titlebox").hide();
          $("#config").show();
        }
    });

    $(".calc li").bind( "touchstart",function(){
    try {
      if ($(this).text() == "Clear") {
        $("#inp_ans").val("");
      } else if($(this).text() == "Enter") { 
        state_machine();
      } else if($(this).text() == "BS") { 
        var res = $("#inp_ans").val();
        res = res.substring(0,res.length-1);
        $("#inp_ans").val(res);
      } else { 
        $("#inp_ans").val($("#inp_ans").val() + $(this).text());
      }
    } catch(e) {
    }
  });
});

