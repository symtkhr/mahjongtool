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
var QHand; //���Ȥ�������..

var PointQuiz = function(){
  this.QHand;
  this.QStat;
  this.level;
  this.yaku_id; // ��[99������/0����/1����/2����/3����/4��/5����/6����/7���л�/8ʿ��]
  this.dora;
  this.mnt;
  this.stRange;
  ////////////////// �������
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
  ////////////////// ��٥���������
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
  ////////////////// �����٥�Ƚ��
  this.level_det = function(){
    var lv = 0;
    var QStat = gResObj.CalcObj;
    var num_kots = 0;
    var fu_sum = 0;
    if(QStat.fueach.length > 0){
      for( var i=0; i<7; i++ ){
        if( QStat.fueach[0][i] == 0 ) continue;
        fu_sum += QStat.fueach[0][i];
        if(i<5 && QStat.fueach[1][i]!= 2 ) num_kots++;
      }
    }
    var is_tsumo  = (QStat.tsumo % 2);
    var is_menzen = gResObj.HandObj.n.length == 0;
    var is_mangan = (QStat.point[0] >= 8000 && QStat.ch_kz > 0) ||
      (QStat.point[0] >= 12000 && QStat.ch_kz == 0 );
    var is_tenkei = (Math.pow(2, QStat.han) * QStat.fu <= 512) && fu_sum >= 10;
    var is_pingf = (QStat.yaku.index("ʿ��(1)") >= 0 );
    var is_7toi  = (QStat.fu == 25 );

    /*[�̻��ڤ�ʬ�������Ť餤����Ƚ��]
      "¾���̻Ҥ��ڤ���"������ or
      �쿧9��ʾ��Ϣ³�׻ѷ� + 3�������ޤ���: 122233344, 122333445
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

    if( QStat.ch_kz == 0 && !is_tsumo){ lv +=  3; debug +="+�Ʊ�"; }
    if( is_tsumo )                    { lv +=  5; debug +="+����"; }
    if( is_hardments )                { lv += 10; debug +="+��ʬ����"; }

    //----- ����̤�� ------------- 
    if(!is_mangan || is_tenkei){
      lv += num_kots * 5; debug += "+"+num_kots+"���";
      if( !is_pingf && !is_7toi ){ lv +=  7; debug +="+��ʿ�¼���"; }
      //if( kots >= 1 && is_menzen && fu_sum >=6 && !is_tsumo){ lv += 7; debug += "+������"; }
      if( QStat.han < 4 ){
	if(fu_sum == 10 || fu_sum == 12) { lv += 10;     debug += "+��10-12"; } // ��ϥͤΥ���饤��
	if(fu_sum == 14 || fu_sum == 16) { lv += 5;      debug += "+��14-16"; }
	if(fu_sum >= 18 )                { lv += fu_sum; debug += "+��" + fu_sum; }
	if( Math.ceil(QStat.fu/10) == 7 )                    { lv += 10; debug += "+70��"; } 
	if( Math.ceil(QStat.fu/10) == 9 && QStat.ch_kz == 0 ){ lv += 10; debug += "+90���"; } 
      }
      $("#debug").append("Tk_lv=" + lv +" ["+debug+"]<br>");
      return lv;
    }
    //----- ���Ӱʾ� ------------- 
    if(QStat.han > 20) return -1; // ���֥�����
    var yakulen_pin7cmplx = 0;
    var yakulen_forgetful = 0;
    var is_chin = false;

    for(var i=0; i<QStat.yaku.length; i++){
      if(QStat.yaku[i].match(/^(ʿ��|Ωľ|��ȯ|����|����|���л�)/)) continue;
      if(QStat.yaku[i].match(/^���쿧/)){ var is_chin = true; continue; }
      yakulen_pin7cmplx++;
      if(QStat.yaku[i].indexOf("(1)") > 0 || QStat.yaku[i].indexOf("(13)") > 0) continue;
      if(QStat.yaku[i].match(/^(���쿧\(2\)|�С���|����|����Ʊ��|�쵤�̴�|������|���л�)/))
	continue;
      yakulen_forgetful++;
    }
    if(QStat.han <= 3){ lv += 20; debug += "+��������" }
    if( QStat.yaku.length == 1 && QStat.han == 13) // ñ������
      lv += 0;
    else if( (!is_chin && is_pingf) || is_7toi ) // ʿ�¤ޤ��ϼ��л�
      lv += (yakulen_pin7cmplx + yakulen_forgetful + (QStat.dora ? 1:0) - 1) * (QStat.han - 1);
    else { // ����¾
      lv += (QStat.yaku.length + yakulen_forgetful + (QStat.dora ? 1:0) - 1) * (QStat.han - 1);
      debug += " + " + (QStat.yaku.length + yakulen_forgetful + (QStat.dora ? 1:0)) + "��" + QStat.han + "��";
    }
    $("#debug").append("Mg_lv=" + lv +" ["+debug+"]<br>");
    return lv;
  }
  ////////////////// �̻Һ���
  this.make_ments = function(order){
    var i = order;
    var yaochu = [0,8,9,17,18,26,27,28,29,30,31,32,33];
    var type = (i==4) ? 2:(parseInt(Math.random()*5)<4 ? 1:4);
    // �����̻Ҥμ��� <0-6 = ����/�Ž�/�л�/����/�Ź�/����/����>
    var head = parseInt(Math.random()*34);
    var range = this.stRange;
    var mai = QHand.mai;
    var QStat = this.QStat;
    
    switch(this.yaku_id){
    case 0: // ����
      if(i>=3) break; 
      if(i==0) range = parseInt(Math.random()*3);
      head = 9*range + 3*i;
      type = 1;
      break;
    case 1: // ����
      head = yaochu[parseInt(Math.random()*13)];
      if(type == 1 && head%9==8) head -= 2;
      break;
    case 2: // ����
      if(i>=3) break; 
      if(i==0) range = parseInt(Math.random()*7);
      head = range + 9*i;
      type = 1;
      break;
    case 3: // ����
      if(i==0) range = parseInt(Math.random()*3);
      head = 18 +��parseInt(Math.random()*16);
      if(head<27) head -= range*9;
      break;
    case 4: // ��
      head = 0;
      while(head%9==0 || head%9==8 || (head%9==6 && type==1))
        head = parseInt(Math.random()*27);
      break;
    case 5: // �С�
      type = (i==4)?2:4;
      head = parseInt(Math.random()*34);
      break;
    case 6: // ���� 
      if( i>0) break; 
      type = 4;
      head = 0;
      while(head!=QStat.ba_kz && head!=QStat.ch_kz && head<4)
	head = parseInt(Math.random()*7);
      head +=27;
      break;
    case 7: // ���л�
      type = 2;
      while(mai[head]>0) head = parseInt(Math.random()*34);
      break;
    case 8: // ʿ��
      if(i==4)
        while( head>30 || head== QStat.ch_kz+27 || head == QStat.ba_kz+27)
          head = parseInt(Math.random()*30);
      else
        type = 1;
      break;
    case 9: // �а쿧
      var tmp = parseInt(Math.random()*12);
      if( i < 4 ) type = ( tmp < 4 ) ? 1 : 4;
      if( tmp < 5 ) head = 19;
      else if( tmp == 5 ) head = 20;
      else if( tmp == 6 ) head = 21;
      else if( tmp == 7 ) head = 23;
      else if( tmp == 8 ) head = 25;
      else if( tmp >= 9 ) head = 32;
      break;
    case 10: // ϷƬ��
      head = yaochu[parseInt(Math.random()*13)];
      if( i < 4 ) type = 4;
      break;
    case 11: // �绰��
      if(i>=3) break;
      head = 31 + i;
      type = 4;
      break;
    case 12: // ����
      head = 27 + parseInt(Math.random()*7);
      if( i < 4 ) type = 4;
      break;
    }
    
    // ����ľ��
    if(type==1 && ( head>=27 || head%9>=7 ) ) return false;
    if(type==4 && mai[head]>1) return false;
    if(type==2 && mai[head]>2) return false;
    if(type==1 && (mai[head]>3 || mai[head+1]>3 || mai[head+2]>3) ) return false;

    this.stRange = range;
    return [head, type];
  }

  ////////////////// ��Ϫ����
  this.make_furo = function(is_limited2menzen, is_allowed2kong ){
    var mnt = this.mnt;
    var n = QHand.n;
    var head, type;
    var mai = QHand.mai;
    
    for(var i = mnt-1; i>=0; i--){
      head = n[i][0];
      type = n[i][1];
      if(type==2 || Math.random()*2 < 1) continue;
      if(!is_limited2menzen && type==1) n[i][1] = 0; // ���粽
      if(type==4){
        var tmp = parseInt(Math.random()*3);
        if(is_limited2menzen){
          if(mai[head]!=4 && is_allowed2kong && tmp==2) n[i][1] = 6;
        } else if(tmp==0 || mai[head] ==4 || !is_allowed2kong) n[i][1] = 3; // ���ﲽ
        else if(tmp==1) n[i][1] = 5; // ���ʲ�
        else if(tmp==2) n[i][1] = 6; // ���ʲ�
      }
    }
  }

  ////////////////// ��λ������
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
    
    // ���
    if(yaku_id==13){
      for(i=0;i<13;i++) QHand.t[yaochu[i]] = 1;
      QHand.t[yaochu[parseInt(Math.random()*13)]]++;
      mnt = 0;
    }
    // ��Ϣ����
    
    // ���̼�
    while(order < mnt ){
      do{
        var n_fac = this.make_ments(order);
      }while( n_fac === false )
      n.push(n_fac);
      QHand.nt2mai();
      order++;
    }

    this.mnt = mnt;
    if(!is_limited2menzen || is_allowed2kong) this.make_furo(is_limited2menzen, is_allowed2kong );
  }

  ////////////////// �ɥ�ɽ����
  this.get_dora_indicator = function(dora){
    if(dora==0 || dora==9 || dora==18 ) return dora+8;
    if(dora==27 ) return dora+3;
    if(dora==31 ) return dora+2;
    return dora-1;
  }
  ////////////////// ���ꤷ�����Υɥ��ܤ���
  this.apply_doraconfig = function(){
    var QStat = this.QStat;
    var mangan_han = Math.LOG2E * Math.log(50 / Math.ceil(QStat.fu/10));
    var dora_lower = 0;
    var dora_upper = 3;
    if(QStat.han < mangan_han) 
      dora_upper = Math.floor(mangan_han) - QStat.han;

    // �ɥ��ܤ���
    for(var i=0; i<50; i++){
      QStat.dora = this.set_dora();
      if(QStat.dora < dora_lower || QStat.dora > dora_upper) continue;
      break;
    }
    // ������Ʒ׻�����
    gResObj.CalcObj = QStat;
    gResObj.get_result();
    res = gResObj.result;

    $("#debug").append("�ɥ� = " + QStat.dora+"��/{"+dora_lower+"~"+dora_upper+"}<br>");
  }
  ////////////////// �ɥ�ܤ�
  this.set_dora = function(){
    this.dora = [];
    var num_dora = 1;
    var dora_sum = 0;
    var n = this.QHand.n;
    var QStat = this.QStat;
    var mai = this.QHand.mai;
    for(var i=0; i<n.length; i++) if(n[i][1]>=5) num_dora++;
    if(QStat.reach) num_dora *= 2;
    var i=0;
    var maitak = mai.clone();
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
  ////////////////// ��λ������
  this.make_stats = function(){
    this.QStat = new HandCalc();
    var QStat = this.QStat;
    
    // ��������
    QStat.ba_kz = parseInt(Math.random()*2); // �� [0��/1��/2��/3��]
    QStat.ch_kz = parseInt(Math.random()*4); // �� [0��/1��/2��/3��]
    QStat.tsumo = parseInt(Math.random()*2); // �������� [0���/1�ĥ�]
    var rnd_rh = parseInt(Math.random()*100);
    
    // Ωľ [0����/1Ωľ/2Ωľ��ȯ(/3WΩľ/4WΩľ��ȯ)]
    if(rnd_rh<40)      QStat.reach = 0;
    else if(rnd_rh<97) QStat.reach = 1;
    else               QStat.reach = 2;
  }
    
  ////////////////// �����η׻�
  this.calc_ans = function(){
    var QStat = this.QStat;
    var QHand = this.QHand;
    var n = this.QHand.n;
    // ʿ�¤ξ�硢��������λ�׼���
    var aghi = -1;
    if(this.yaku_id==8)
      do
        aghi = n[parseInt(Math.random()*4)][0] + 2*(parseInt(Math.random()*2));
      while(aghi%9==2 || aghi%9 == 6 );

    // ��λ�׼���
    QHand.n2nt();
    QHand.t2hai();
    var pos = parseInt(Math.random()*QHand.hai.length);
    QStat.aghi = (aghi == -1) ? QHand.hai[pos] : aghi;
    
    QHand.nt2mai(); // ����?
    //QStat.dora = this.set_dora();

    // ������׻�����
    gResObj  = new JangResult();
    gResObj.HandObj = QHand;
    gResObj.CalcObj = QStat;
    gResObj.get_result();

    // 0���ξ��
    if(gResObj.CalcObj.point[0] == 0){
      if( parseInt(Math.random() * 4) == 0 )
        QStat.tsumo = 1;
      else {
        QStat.reach = 1;
        QStat.tsumo = parseInt(Math.random()*2);
      }
      gResObj.CalcObj = QStat;
      gResObj.get_result();
    }

    //gResObj.HandObj.t[QStat.aghi]--;
  }
}
var gMode = {
 mode: 0,
 is_levelup: true,
 is_timer: true,
 is_ansfu: false,
 is_ansopt: false
};
 
////////////////// ��������
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

////////////////// �����å��ܥå����ɼ��
function is_checked(selector){
  var checked = $(selector).attr('checked');
  if(checked==="false") checked = false; // docomo�ե�֥饦���ΥХ��к�
  return checked;
}

////////////////// �������
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
    $("#note_kb").html("(����å�ľ�������ɽ��)");
    $("#title_kb").html("�����");
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
    $("#start").val("����(Enter)");
    return false;
  }

  return true;
}

////////////////// ��٥�ɽ��
function show_level(){
  var strLevel;
  $("#result").html("");
  $("#presentation, #config, #ranking, #tenkey").hide();
  $("#titlebox, #sidebox").show();
  if(gMode.mode == 2) strLevel = "DEMO";
  else if(gLevel<0) strLevel = "LEVEL RANDOM";
  else strLevel = "LEVEL" + gLevel;
  $("#title").html("<h2>" + strLevel + "</h2>");
  if(gMode.mode == 1) $("#title").append("�����⡼��");
}
/////////////// ����
function question(){
  $("#titlebox").hide();
  $("#presentation").show();
  if(gMode.mode != 2){
    $("#card").html("(���������)");
    gQObj = new PointQuiz;
    gQObj.make_quiz0(gLevel<0 ? 6 : gLevel);
  }
  show_tingpai();
  show_stat();
  count_stop();
  count_start(5);
}
/////////////// İ�׷�ɽ��
function show_tingpai(){
  var is_reach = gResObj.CalcObj.reach;
  var QStat = gResObj.CalcObj;
  var output_string = "";
  var char_kz = new Array("��","��","��","��");

  $("#fieldplate").html(char_kz[QStat.ba_kz]+ "��");
  show_dora(true);
  output_string += char_kz[QStat.ch_kz]+ "�� ";
  if(is_reach) output_string += '<img src="./haiga/reach.png" alt="Ωľ��">';
  output_string += "<br>";
  var t = gResObj.HandObj.t;
  var n = gResObj.HandObj.n;
  var TmpResObj = new JangResult;
  for(var i=0;i<t.length;i++){
    for(j=0;j<t[i];j++) output_string += hi_tag(i);
  }
  output_string += ' <span id="agari"></span>';
  $("#card").html( output_string );
  output_string = "";
  if(n.length>0) output_string += " " +  TmpResObj.show_hi(n, false);
  $("#furo").html( output_string );
}

/////////////// ����ɽ��
function show_stat(){
  var QStat = gResObj.CalcObj;
  var char_kz = new Array("��","��","��","��");
  var char_rh = QStat.reach ? 'Ωľ':"����";
  var queue = "";

  queue += (QStat.ch_kz==0 ? style_redbold("��") : "��" ) + "��"; 
  queue += char_rh;
  queue += ' <span id="quest">��İ���档</span>';

  $("#ft").html( '��λ�ޤ�:<br><span id="count" style="font-size:150%;">5</span>��');
  $("#level").html(gLevel);
  $("#start").val("��λ(Enter)");
  $("#command").html(queue);
  $("#result").html("");
  $("#inp_ans").val("");
  $("#debug").append("�� = "+QStat.point[0]+" = "+QStat.point[2]+" &amp; "+QStat.point[1]);
}
/////////////// �ɥ�ɽ��
function show_dora(is_omote){
  var num_dora = gQObj.dora.length;
  var is_reach = gQObj.QStat.reach;
  var num_omote = num_dora / (is_reach ? 2:1);
  
  $("table.wanpai td").html("");
  $("table.wanpai tr:first-child td").html(hi_tag(-1));

  for(var i=0; i < (is_omote ? num_omote : num_dora); i++){
    var pos = i + 2;
    if(is_reach && i >= num_omote) pos += 7 - num_omote; // ����
    var res = hi_tag(gQObj.get_dora_indicator(gQObj.dora[i]));
    $("table.wanpai td").eq(pos).html(res);
  }
  return;
}
var opt21 = [24, 32, 40, 48, 56, 64, 72, 80, 88, 96, 112, 128, 144, 160, 176, 192, 200, 300, 400, 600, 800];
/////////////// ��������
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
/////////////// ��λ��ɽ��
function show_agari(){
  var QStat = gResObj.CalcObj;
  var is_1patsu = QStat.reach==2 || QStat.reach==4;
  var tsumo = QStat.tsumo;
  var aghi = QStat.aghi;
  var queue = "����λ��";
  var str1patsu = "";
  if(is_1patsu) str1patsu = (gResObj.HandObj.n.length ? "" : "<br>") + style_redbold('��ȯ');
    
  if(gMode.is_ansopt) make_options(QStat.tsumo % 2, QStat.ch_kz);
  if(gMode.is_ansfu){
    queue += "���ݲ��䡣<br>([��, ��]�η���������)";
  }else if(tsumo%2==0) 
    queue += "������";
  else if(QStat.ch_kz==0) 
    queue += "���������롣";
  else {
    queue += "�������ġ�<br>([��/��]�η���������)";
  }
  count_stop();
  
  var ag = machi_search();
  var output_string='(';
  for(var i=0; i<ag.length; i++) output_string += hi_tag(ag[i]);
  output_string += "�Ԥ�)";

  if(gMode.is_timer)   
    $("#ft").html( '��������:<br><span id="count" style="font-size:200%;">' + TIME_LIMIT + '</span>��');
  else
    $("#ft").html('');
  show_dora(false);
  $("#agari").html(str1patsu + (tsumo ? "�ĥ�":"���") + hi_tag(aghi));
  $("#start").val("����(Enter)");
  $("#result").html( output_string );
  $("#quest").html(queue);
  $("#tenkey").slideToggle(200);
  if(gMode.is_timer) count_start(TIME_LIMIT);
}
/////////////// �Ԥ��׸���
function machi_search(){
  var p = new HandSet();
  var n = [];
  var ag = [];
  p.t = gResObj.HandObj.t.clone();
  //sum = m.length + n.length * 3;
  for (var i=0; i<34; i++) {
    if(gResObj.CalcObj.aghi == i){ ag.push(i); continue; }
    if(gResObj.HandObj.mai[i]==4) continue;
    p.t[i]++;
    if(p.split_into_ments(false)) ag.push(i);
    p.t[i]--;
  }
  return ag;
}
////////////////// ����Ƚ��
function admission(inp){
  var QStat = gResObj.CalcObj;
  var aghi = QStat.aghi;
  var inp  = $("#inp_ans").val();
  var is_timeleft = gRtime > 0 || !gMode.is_timer;

  inp = inp.replace(/[��-��]/g, function(s) {
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
    var fu_ceil = QStat.fu== 25 ? 25:Math.ceil(QStat.fu/10)*10;
    if( QStat.han != valA ) is_correct = false;
    else if( fu_ceil != valB && QStat.han <5 ) is_correct = false;
  } else if(QStat.tsumo%2==0){
    if( valB && is_timeleft ) return false;
    if(QStat.point[0] != valA && QStat.point[0] != valA*100 ) is_correct = false;
  } else if(QStat.ch_kz==0){
    if( valB && is_timeleft ) return false;
    if(QStat.point[1] != valA && QStat.point[1] != valA*100 ) is_correct = false;
  } else {
    if( !valB && is_timeleft ) return false;
    if(   ( QStat.point[2] != valA && QStat.point[2] != valA*100 )
       || ( QStat.point[1] != valB && QStat.point[1] != valB*100 ) )
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
////////////////// ����ɽ��
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
    '<span style="color:blue; font-size:200%; font-weight:bold;">��</span>';
  if(is_correct){
    show_ft += "<br>" + (swc_next == NEXT.LEVELUP ? style_redbold( "����!") : "����!");
  } else {
    show_ft += "<br>����:";
    if(QStat.tsumo%2==0){
      show_ft += (QStat.point[0]/100);
    } else if(QStat.ch_kz==0){
      show_ft += (QStat.point[1]/100);	   
    } else
      show_ft += (QStat.point[2]/100) + "/" + (QStat.point[1]/100);
  }
  $("#ft").html(show_ft);

  var permalink = '<a href="?' + gResObj.id_res + '&' + base64encode(gQObj.dora) +
    '" target="_blank">������λ��Υѡ��ޥ��</a>';
   
  if(gMode.is_levelup){
    var res = "";
    for(var i=0; i < INIT_SPARE - gCntM; i++) res += "��";
    $("#survive").html(res);
    $("#clear").html(gCntR + " / " + COND_CLEAR);   
  } else
    $("#clear").html("����Ψ: " + gCntR + " / " + (gCntR + gCntM) );
  $("#result").html( gResObj.result + permalink  );
  $('#start').val('��(Enter)');
  $("#tenkey").css( "display", "none" );
  return swc_next;
}
////////////////// ��λɽ��
function show_ending(){
  if(!gMode.is_timer || gMode.mode==2) return back_to_top("");

  var is_clear = (gLevel >= MAX_LEVEL && gCntR >= COND_CLEAR);

  if(is_clear){
    var res = "<h2>Game Completed</h2>" +
      "�¼�����ǤȤ�!<br>(�⤦�����ɼ�����̤ˤ�����)";
  } else {
    var res = "<h2>Game Over</h2>" + 
      " ���� LEVEL " + gLevel + " �ߤޤ�ʤΤ�!";
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
  $('#command').html('̾�������Ϥ��Ƥ���������');
  $('#start').val('��󥭥���Ͽ').css("width", "auto");
  return true;
}
////////////////// �ͥȥ����Ͽ
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
////////////////// �ȥåפ����
function back_to_top(res){
    $("#command").html("���Ĥ��줵�ޤǤ�����");
    $("#sidebox").hide();
    $("#start").val("�ȥåפ����");
    if(res) $("#ranking").html(res);
    $("#ranking").show();
    return false;
}
//////////////// �롼��ɽ��
function rule_indicate(flag){
  if(flag){
    $("#rule").slideToggle(200);
    $("#main").hide();
  } else {
    $("#main").show();
    $("#rule").hide();
  }
}
//////////////// �����󥿳���
function count_start(sec) {
    gRtime = sec;
    gPsgID = setInterval('showPassage()',1000);
}
//////////////// ���������
function count_stop() {
    if(gPsgID) clearInterval( gPsgID );
    var ret = gRtime;
    gRtime = 0;
    return ret;
}
/////////////// ������ȥ�����
function showPassage() {
    gRtime--;
    $("#count").html(Math.ceil(gRtime));
    if(gRtime <= 0) state_machine();
}
/////////////// ����������
function style_redbold(str){
  //return str;
  return '<span class="redbold">'+str+'</span>';
}
/////////////// �ײ西��
function hi_tag(hi){
  var hiname = new Array
    ("1m","2m","3m","4m","5m","6m","7m","8m","9m",
     "1p","2p","3p","4p","5p","6p","7p","8p","9p",
     "1s","2s","3s","4s","5s","6s","7s","8s","9s",
     "ton","nan","sha","pei","hak","hat","chu"
     );
  //return (hi==-1)? "# " : hiname[hi] + " ";
  var hinamej = new Array
    ( "����","����","����","����","����","ϻ��","����","Ȭ��","����",
      "����","����","����","����","����","ϻ��","����","Ȭ��","����",
      "���","���","����","�ͺ�","�޺�","ϻ��","����","Ȭ��","���",
      "��","��","��","��","��","�","��"
      );
  if(hi==-1) return '<img src="./haiga/back.gif" width=18 height=24 alt="��">';
  return'<img src="./haiga/' + hiname[hi]+'.gif" width=18 height=24 alt="' + hiname[hi]+ '">';
}
/////////////// ������������
function getRequest(){
  if(location.search.length > 1){
    var get = new Object();
    var ret = location.search.substr(1).split("&");
    return ret;
  } else {
    return false;
  }
}
/////////////// ���������
function form_load(){
  var c = getRequest();
  var base64list = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  if(!c) return false;

  gQObj = new PointQuiz;
  gResObj  = new JangResult();
  gResObj.set_res_id(c.shift());
  HandObj = gResObj.HandObj;
  HandObj.t2hai();

  if( !HandObj.split_into_ments(true) ) return false;
  gResObj.get_result();
  gQObj.QStat = gResObj.CalcObj;
  gQObj.dora  = base64decode(c.shift());
  gQObj.level_det();
  gResObj.HandObj.t[gResObj.CalcObj.aghi]--;

  $("#number").html("<u>DEMO</u><br>Clear: 0");
  $('select#level_select option').remove();
  $('select#level_select').append($('<option>').html("�ǥ�").val("2"));

  return true;
}
/////////////// ���٥�ȥϥ�ɥ�
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

