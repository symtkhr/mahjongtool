//-*- coding: utf-8 -*-
/*
var hiname = new Array
("1","2","3","4","5","6","7","8","9",
 "1p","2p","3p","4p","5p","6p","7p","8p","9p",
 "1s","2s","3s","4s","5s","6s","7s","8s","9s",
 "ton","nan","sha","pei","hak","hat","chu"
 );
*/
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
  
var hi_tag_array = function(tehai, joiner){
  if(typeof joiner === 'undefined') joiner = "";
  var mes = "";
  for(var i=0; i<tehai.length; i++ ) mes += hi_tag(tehai[i]) + joiner;
  return mes;
}

 var gSearch_machi = function(hai){
     if (hai.length != 13) return [];
     var p = new HandSet();
     p.hai = hai;
     return [...Array(34)].map((zero, tile) => tile)
         .filter(tile => {
             if (p.t[tile] == 4) return false;
             p.hai.push(tile);
             var ret = p.split();
             p.hai.pop();
             return ret;
         });
};


var DEBUG = 0;
var ModCpMakeHand = function(t){
/***************************************************************************************/
  this.t = t;
  this.n=[];
  this.ns=[];
  this.strdebug;
  this.tval=[];
  this.tvalprogress = 0;
  this.tvalock = false;
  this.makeTingpai = function()
  {
    var str = "";
    for(var i=0; i<this.t.length; i++)
      for(var j=0; j<this.t[i]; j++) str += hiname[i] + " ";
    //this.strdebug = show_n(t)+"<br>\n";
    this.get_ments(0);
    this.strdebug = str + "<br>" + this.ns.length;
    this.get_toits(0, true);
  }
/***************************************************************************************/
  this.gSearch_machi = function(hai){
    return gSearch_machi(hai);
  }
/***************************************************************************************/
  this.get_ments = function(startpoint){
    var i = startpoint;
    var t = this.t;
    var n = this.n;
    for(;!t[i] && i<34; i++);
    var is_kots = (t[i] >= 3);
    var is_shun = (i<27 && i%9<7 && t[i+1]>0 && t[i+2]>0 );

    if(i>=34){
      if(n.length == 3) this.get_toits(0);
      return;
    }
    if(n.length == 4) return this.saveTempai();

    if(is_kots){
      t[i]-=3;
      n.push([i,i,i]);
      this.get_ments(i);
      n.pop();
      t[i]+=3;
    }
    if(is_shun){
      t[i]--; t[i+1]--; t[i+2]--;
      n.push([i,i+1,i+2]);
      this.get_ments(i);
      n.pop();
      t[i]++; t[i+1]++; t[i+2]++;
    }
    this.get_ments(i+1);
  }
/***************************************************************************************/
  this.get_toits = function(startpoint, is_7toi){
    var i = startpoint;
    var t = this.t;
    var n = this.n;
    for(;!t[i] && i<34; i++);
    var is_toi  = (t[i] >= 2);
    if(i>=34){
      if( is_7toi && n.length == 6) this.saveTempai();  
      if(!is_7toi && n.length == 5) this.saveTempai();  
      if(!is_7toi && n.length == 4) this.get_tarts(0);
      return;
    }

    if(is_toi){
      t[i]-=2;
      n.push([i,i]);
      this.get_toits(i+1, is_7toi);
      n.pop();
      t[i]+=2;
    }
    this.get_toits(i+1, is_7toi);
  }
/***************************************************************************************/
  this.get_tarts = function(startpoint){
    var i = startpoint;
    var t = this.t;
    var n = this.n;
    for(;!t[i] && i<34; i++);
    var is_toi  = (t[i] >= 2);
    var is_ryan = (i<27 && i%9<=7 && t[i+1]>0 );
    var is_kan  = (i<27 && i%9<=6 && t[i+2]>0 );

    if(i>=34){
      if(n.length == 5) this.saveTempai();
      return;
    }
    /*
    if(is_toi && 0){
      t[i]-=2;
      n.push([i,i]);
      this.get_tarts(i);
      n.pop();
      t[i]+=2;
    }
    */
    if(is_ryan){
      t[i]--; t[i+1]--;
      n.push([i,i+1]);
      this.get_tarts(i);
      n.pop();
      t[i]++; t[i+1]++;
    }    
    if(is_kan){
      t[i]--;t[i+2]--;
      n.push([i,i+2]);
      this.get_tarts(i);
      n.pop();
      t[i]++;t[i+2]++;
    }
    this.get_tarts(i+1);
  }
/***************************************************************************************/  
  this.saveTempai = function(){
    var str = "";
    var n   = this.n.slice();
    //te = te.sort(function(a,b){return a-b;});
    this.ns.push(n);
    return;
    // the followings for debug
    if(n.length==4) str="<font color=red>" + str+"</font>";
    if(n.length==6) str="<font color=green>" + str+"</font>";    
    this.strdebug += str + '<span id="q' + (this.ns.length-1) + '"></span><br>'+"\n";
    //this.case++;
  }
/***************************************************************************************/  
  this.hai2t = function(){
    var res=[];
    for( var i=0; i<35;  i++ ) res[i]=0;
    for( var i=0; i<this.t.length; i++ ) res[this.t[i]]++;
    this.t = res;
  }
/***************************************************************************************/  
  this.maketval = function(){
    var st = this.tvalprogress;
    this.tvalprogress += 200;
    if(this.ns.length < this.tvalprogress) this.tvalprogress = this.ns.length;
    var fn = this.tvalprogress;
    this.tvalock = true;
    for(var i=st; i<fn; i++) this.calcgrade(i,this.ns[i]);
    this.tvalock = false;
  }
/***************************************************************************************/  
  this.pickoutofts = function(){
    var tval = this.tval;
    tval.sort(function(a,b){return b.grade-a.grade;}); 

    for(var i=0; tval[i].grade * 10 > tval[0].grade * 8; i++);
    var koho = i;

    if(DEBUG){
      $("#debug").html("<br>"+koho+" / TingPai = "+tval.length+" cases:<br>");
      var res = "";
      for(var i=0; i<tval.length; i++){
	if(i==koho) res += "---------------------------------<br>";
	res += "("+tval[i].grade+") ";
	res += show_n(this.ns[tval[i].id]);
	if(tval[i].add >= 0) res += hiname[tval[i].add];
	res += "<br>";
      }
      $("#debug").html(res);
    }

    var t = [];
    var picked = parseInt(Math.random() * koho);
    var n = this.ns[tval[picked].id];
    for(var i=0; i<n.length; i++)
      for(var j=0; j<n[i].length; j++){
	t.push(n[i][j]);
	this.t[n[i][j]]--;
      }
    if(tval[picked].add >= 0) t.push(tval[picked].add);

    return t.sort((a,b) => (a-b));

  };
/***************************************************************************************/  
  this.calcgrade = function(id,n){
    // this.t = all given tiles, n = composed tingpai
    var r = this.t.slice(); // Rest of the given tiles
    var te = [];
    var res = "";
    var is_add = (n.length!=5); // possible to add any one to 12 tiles
    for(var i=0; i<n.length; i++)
      for(var j=0; j<n[i].length; j++ ){
	te.push(n[i][j]);
	r[n[i][j]]--;
      }
    for(var j=0; j<r.length; j++){
      var is_jihai = false;
      if(is_add){
	if(r[j]==0) continue;
	if(n.length==4 && this.t[j]-r[j]>=3) continue;
	if(n.length==6 && this.t[j]-r[j]>0 ) continue;
	te.push(j);
      }
      var agn = 0;
      var ag = gSearch_machi(te);
      for(var i=0; i<ag.length; i++){ 
	res += " " + hiname[ag[i]]; 
	agn += 4 - this.t[ag[i]];
	if(ag[i] >= 27) is_jihai = true;
      }
      this.tval.push( { 
	grade: ag.length * agn *(is_jihai ? 2:1), 
	id   : id, 
	add  : (is_add ? j:-1) 
      });
      if(!is_add) break;
      te.pop();
    }
    return;
    if(n.length==5){
      var agn = 0;
      var ag = gSearch_machi(te);
      for(var i=0; i<ag.length; i++){ 
	res += " " + hiname[ag[i]]; 
	agn += 4 - this.t[ag[i]];
	if(ag[i] >= 27) is_jihai = true;
      }
      tval.push( {grade: ag.length * agn *(is_jihai ? 2:1), id:id, add:-1} );
    }
  }
}
/***************************************************************************************/
function show_n(n){
  var str = "";
  for(var i=0; i<n.length; i++){
    str+="[";
    for(var j=0; j<n[i].length; j++) str += hiname[n[i][j]];
    str+="]";
  }
  if(n.length==4) str = "<font color=red>"+str+"</font>";
  if(n.length==6) str = "<font color=blue>"+str+"</font>";
  return str;
}
function show_te(te){
  var str = "";
  for(var i=0; i<te.length; i++){
    if(i==3||i==6||i==9||i==11) str += " ";
    str += hiname[te[i]];
  }
  return str;
}
function shuffle(yamahi){
  var n = yamahi.length;
  for(var i=0;i<300;i++) {
    var r1 = Math.floor(Math.random()*n);
    var r2 = Math.floor(Math.random()*n);
    var st = (r1 < r2) ? r1:r2;
    for(var j=0; j<1+Math.abs(r2-r1); j++) { 
      tmp = yamahi[st+j];
      yamahi[st+j] = yamahi[j];
      yamahi[j] = tmp;
    }
  }
}

var ModPlayer = function(name, is_hito){
  this.name = name; 
  this.is_hito = is_hito;
  this.point = 50;
  this.wind  = 0;
  this.ObjCpu;
  this.dump_tile = function(){
    this.dealt   = [];
    this.discard = [];
    this.handset = [];
    this.target  = [];
    this.river   = [];
    this.pass    = [];
    this.isReady = false;
    this.isFin   = false;
    this.isWaiver = false;
    this.isIllegal = false;
    $("#debug").html("");
  }
  this.dump_tile();
  this.make_hand = function(){
    if(this.dealt.length < 13) return;
    if(this.is_hito)
      return user_make_hand(this.dealt.sort(function(a,b){return a-b;}));
    this.ObjCpu = new ModCpMakeHand(this.dealt);
    var ObjCpu = this.ObjCpu;
    ObjCpu.hai2t();
    ObjCpu.makeTingpai();
    return;
  }
  this.cpu_set_hand = function() {
    if(this.is_hito || this.isReady) return;
    var ObjCpu = this.ObjCpu;
    if(ObjCpu.tvalock) return;
    if(ObjCpu.tvalprogress < ObjCpu.ns.length ){
      ObjCpu.maketval();
      $("#debug").append(this.name + ":" + ObjCpu.tvalprogress + "/" + ObjCpu.ns.length + "<br>\n");
      return;
    } 
    this.handset = ObjCpu.pickoutofts();
    var dealt = [];
    for(var hi=0; hi<34; hi++)
      for(var j=0; j<ObjCpu.t[hi]; j++) dealt.push(hi);
    this.dealt = dealt;
    this.isReady = true;
  }
  this.cpu_discard = function(turn){
    if(this.is_hito) return ask_user_discard(turn);
    var sute_order = -1;
    // check if my discard[] including other player's river[]
    for(var j=0; j<this.discard.length; j++){
      var sute = this.discard[j];
      for(var i=0; i<3; i++)
	if(gPlayer[i].river.indexOf(sute) >= 0 && this.target.indexOf(sute) < 0){ sute_order = j; break; }
      if(sute_order >= 0) break;
    }
    // in the case of no safety in my discard[]
    if(sute_order < 0){
      var wholeRiver = [];
      var inclchar = [0,0,0]; // n of char tiles
      var safe_rate = Array(34);
      for(var i=0; i<3; i++){
	wholeRiver = wholeRiver.concat(gPlayer[i].river);
	inclchar[i] = 29 - ( gPlayer[i].discard.length + gPlayer[i].river.length );
      }
      var res=[]; // n of tiles seen from me
      for( var i=0; i<34;  i++ ) res[i]=0;
      for( var i=0; i<wholeRiver.length; i++ ) res[wholeRiver[i]]++;
      for( var i=0; i<this.discard.length; i++ ) res[this.discard[i]]++;
      for( var i=0; i<this.handset.length; i++ ) res[this.handset[i]]++;
      var safe_eval = [];
      for( var i=0; i<34; i++ ) safe_eval.push(1);
      
      for(var i=0;i<3;i++){
	if(i==turn) continue;
	var c = Math.floor(gPlayer[i].handset[0]/9);
	var n_mom = 0, c_mom = 0;
	for(j=0;j<9;j++) if(wholeRiver.indexOf(c*9+j)>=0) n_mom++;
	for(j=0;j<7;j++) if(wholeRiver.indexOf(27+j)>=0)  c_mom++;
	var is_oya = (gPlayer[i].wind==0);
	var is_top = (gPlayer[i].point>gPlayer[(i+1)%3].point && gPlayer[i].point>gPlayer[(i+2)%3].point);
	for(j=0;j<34; j++) safe_rate[j] = 1;
	for(j=c*9; j<c*9+9; j++){
	  if(inclchar[i]%3==0) safe_rate[j] -= n_mom < 3.5 ? 5.5/(9-n_mom) : 1;
	  if(inclchar[i]%3==2) safe_rate[j] -= n_mom < 3 ?     3/(9-n_mom) : 1;
	  if(safe_rate[j]==1) continue;
	  if(inclchar[i]==0) safe_rate[j] *= .9;
	  if(is_oya) safe_rate[j] *= .9;
	  if(is_top) safe_rate[j] *= .9;
	}
	for(j=27;j<34;j++){
	  if(inclchar[i]%3==1) safe_rate[j] -= c_mom==7 ? 0 : (inclchar[i]==1?1:2)/(7-c_mom);
	  if(inclchar[i]%3==2) safe_rate[j] -= c_mom==7 ? 0 : 1/(7-c_mom);
	  if(safe_rate[j]==1) continue;
	  if(is_oya) safe_rate[j] *= .9;
	  if(is_top) safe_rate[j] *= .9;
	}
	for(j=0;j<34; j++){ 
	  safe_eval[j] *= safe_rate[j];
	  safe_rate[j] = Math.ceil(safe_rate[j]*100);
	}
        $("#debug").append("safe_rate["+i+"]"+safe_rate.join(",")+"<br>");
      }
      for(i=0; i<this.target.length;i++) safe_rate[this.target[i]] = 0;
      this.discard.sort(function(a,b){ return safe_eval[b]-safe_eval[a]; });
      $("#debug").append("安全順:"+hi_tag_array(this.discard)+"<br>");
    for(var i=0; safe_eval[this.discard[i]]==safe_eval[this.discard[0]]; i++);
      sute_order = parseInt(Math.random() * i);
    }
    this.river.push(this.discard[sute_order]);
    this.discard.splice(sute_order,1);
    $("#p"+turn  +" .river").html(hi_tag_array(this.river, " "));
    $("#p"+turn+" .discard").html("打牌候補: "+this.discard.length+"枚"); //[todo:this should be out of class.
  }
  this.cpu_discard0 = function(turn) {
    if(this.is_hito) return ask_user_discard(turn);
    var sute_order = -1;

    for(var j=0; j<this.discard.length; j++){
      var sute = this.discard[j];
      for(var i=0; i<3; i++)
	if(gPlayer[i].river.indexOf(sute) >= 0 && this.target.indexOf(sute) < 0){ sute_order = j; break; }
      if(sute_order >= 0) break;
    }
    if(sute_order < 0)
      for(var i=0; i<50; i++){
	sute_order = parseInt(Math.random() * this.discard.length);
	var q = Math.random() * (30 - this.river.length * 2);
	var sute = this.discard[sute_order];
	if(this.target.indexOf(sute)<0 && (sute>= 27 || q < 1)) break;
      }
    this.river.push(this.discard[sute_order]);
    this.discard.splice(sute_order,1);
    $("#p"+turn  +" .river").html(hi_tag_array(this.river, " "));
    $("#p"+turn+" .discard").html("打牌候補: "+this.discard.length+"枚"); //[todo:this should be out of class.
    //disp_river(this.river);
    //disp_user_discard_item(this.discard, turn); 
  }
}

var gTurn  = 0;
var gTsumi = 0;
var gKyoku = 0;
var gPlayer = Array(3);

function init_game(){
  gPlayer[0] = new ModPlayer("ヒト", true);
  gPlayer[1] = new ModPlayer("タコ", false);
  gPlayer[2] = new ModPlayer("イカ" , false);
  gTurn = parseInt(Math.random()*3);
  gTsumi = 0;
  gKyoku = 0;

  var yakudef = HandCalc.prototype.yaku_all;
  var yakudis = HandCalc.prototype.yaku_disable; 
  var yaku_rule = [[],[]];
  for(var yakutag in yakudef) yakudef[yakutag][1] = 0;

  var disable_tag =
    ["RENHO", "TSUMO", "RINSHAN", "WREACH", "CHINRO", "TSUI", "3KAN", "4KAN", 
     "SHO4", "DAI4", "3SHIKI", "3SKDOK", "KOKUSHI", "KOKUSHI13", 
     "CHANKAN", "J9REN", "4ANKT"];
  yakudef["RENHO"] = [0,0,"人和"];
  yakudis["3PU"] = false;
  yakudis["100MAN"] = false;

  for(var i=0; i<disable_tag.length; i++){
    var yakutag = disable_tag[i];
    yakudis[yakutag] = true;
    yaku_rule[1].push(yakudef[yakutag][2]);
  }
  for(var yakutag in yakudef){
    if(yakudis[yakutag]) continue;
    yaku_rule[0].push(yakudef[yakutag][2] + "(" + yakudef[yakutag][0] + ")");
  }
  $("#yakulist0").html(yaku_rule[0].join(", "));
  $("#yakulist1").html(yaku_rule[1].join(", "));
}


function deal_tile(){
  var suhai = [];
  var jihai = [];
  var color = [[0,1,2],[0,2,1],[1,2,0],[1,0,2],[2,0,1],[2,1,0]];
  var c = parseInt(Math.random() * 6);
  var chname = ["東","南","西","北"];
  var cname  = ["萬","筒","索"];
  var cbg    = ["#fdd", "#ddf", "#dfd"];

  $("#subtitle").html("手作り");
  $("#phase").html(chname[parseInt(gKyoku/3)] + (gKyoku % 3 + 1) + "局" + gTsumi + "本場<br>");
  for(var j=0; j<3; j++) gPlayer[j].dump_tile();

  for(var j=0; j<3; j++){
    gPlayer[j].wind = (3 + j - gTurn) % 3;
    for(var i=0; i<36; i++) suhai.push(color[c][j]*9 + Math.floor(i/4));
    shuffle(suhai);
    for(var i=0; i<16; i++) gPlayer[  j    ].dealt.push(suhai.shift());
    for(var i=0; i<10; i++) gPlayer[(j+1)%3].discard.push(suhai.shift());
    for(var i=0; i<10; i++) gPlayer[(j+2)%3].discard.push(suhai.shift());
    var mes = chname[gPlayer[j].wind]+"家: ";
    mes += "<b>" + gPlayer[j].name + "</b><br>";
    mes += "(" + cname[color[c][j]] + ': <span class="p' + j +'">' + gPlayer[j].point + "k</span>)";
    $("#stat_p"+j+", #p"+j+" .name").html(mes);
    $("#stat_p"+j+", #p"+j).css("background-color",cbg[color[c][j]]);
    //$("#phase").append(mes.split("<br>").join("")+"<br>");
  }
  $("#user_handset").css("background-color", cbg[color[c][0]]);
  for(var i=0; i<28; i++) jihai.push(Math.floor(i/4)+27);
  shuffle(jihai);
  for(var j=0; j<3; j++){
    for(var i=0; i<9; i++) gPlayer[j].dealt.push(jihai.shift());
    gPlayer[j].discard.sort(function(a,b){return a-b;});
  }
}

var prepare_discard = function(){
  $(".handset, #askron").hide();
  $("#p0 .handset").show();
  $("#subtitle").html("打ち合い");

  for(var i=0; i<3; i++){
    gPlayer[i].target = gSearch_machi(gPlayer[i].handset);
    for(var j=0; j<gPlayer[i].dealt.length; j++){
      if(gPlayer[i].dealt[j]>=27) gPlayer[i].discard.push(gPlayer[i].dealt[j]);
    }
    gPlayer[i].discard.sort(function(a,b){return a-b;});
    $("#p"+i + " .discard").html("打牌候補: "+gPlayer[i].discard.length+"枚").show();
    $("#p"+i + " .handset").html(hi_tag_array(gPlayer[i].handset));
    $("#p"+i + " .river").html("");
  }
  disp_user_discard_item(gPlayer[0].discard);
}

function ask_user_discard(){
  $("#message").html("ヒトの手番です。打牌してください。");
  $("#discard0 li.disc_hi").click(function(){
      if($(this) == null) return;
      $(this).hide();
      var sute_order = $(this).attr("id").replace("disc","") - 1;
      gPlayer[0].river.push(gPlayer[0].discard[sute_order]);
      gPlayer[0].discard.splice(sute_order,1);
      $("#message").html("");
      $("li.disc_hi").unbind().css("cursor","default");
      $("#p0 .river").html(hi_tag_array(gPlayer[0].river, " "));
      //disp_river(gPlayer[0].river);
      disp_user_discard_item(gPlayer[0].discard);
      state_machine();
    }).css("cursor","pointer");
}

var is_user_lag_to_declare = function (sute){
    if(gTurn==0) return false;
    if(gPlayer[0].pass.indexOf(sute)>=0) return false;
    if(gPlayer[0].handset.indexOf(sute) >= 0) return true;
    if(sute >= 27) return false;
    if(Math.floor(sute/9) != Math.floor(gPlayer[0].handset[0]/9) ) return false;
    if(gPlayer[0].handset.indexOf(sute+1) < 0 && gPlayer[0].handset.indexOf(sute-1)< 0 ) return false;
    return true;
}

var checkfin = function() {
  var river = gPlayer[gTurn].river;
  var sute = river[river.length-1];
  for(var i=0; i<3; i++){
/*
    if(gPlayer[i].is_hito && i!=gTurn){
	if(gPlayer[i].pass.indexOf(sute)>=0) continue;
	if( gPlayer[i].handset.indexOf(sute)>=0 || 
	   (sute<27 && Math.floor(sute/9) == Math.floor(gPlayer[i].handset[0]/9) )) // this is rough condition...
	gPlayer[i].isFin = true;
    }
*/
    if(gPlayer[i].isWaive || gPlayer[i].target.indexOf(sute)<0) continue;
    if(i!=gTurn) gPlayer[i].isFin = true;
    if(i==gTurn) gPlayer[i].isWaive = true;
  }
  $("#debug").append("gPlayer.target:"+gPlayer[1].target+"/"+gPlayer[2].target+"/sute="+sute);
  if(is_user_lag_to_declare(sute)) gPlayer[0].isFin = true;
  if(gPlayer[0].isFin) return 1; // NEXT.ASKRON
  if(gPlayer[1].isFin || gPlayer[2].isFin) return 2; // NEXT.SAYRON
  gTurn =(gTurn + 1) % 3;
  for(i=0;i<3;i++) if(gPlayer[0].river.length<15) return 0; // NEXT.NEIGHBOR
  return 3; // NEXT.DRAW
}
  
var declare_finish = function() {
  $("#askron").hide();
  var is_fin = false;
  var river = gPlayer[gTurn].river;
  var sute = river[river.length-1];
  for(var i=0; i<3; i++){
    if(!gPlayer[i].isFin) continue;
    //$("#river"+i).append("RON! to " + gPlayer[gTurn].name);
    $("#p"+i + " .handset").show().append(" ロン"+hi_tag(sute));
    $("#p"+i + " .name").css("color", "blue");
    is_fin = true;
  }
    if(gPlayer[0].isFin ){
	if( gPlayer[0].target.indexOf(sute)<0){
	 gPlayer[0].isIllegal = true;
	 $("#p0 .handset").append("<br>錯和(誤栄)");
       } else if(gPlayer[0].isWaive){
	 gPlayer[0].isIllegal = true;
	 $("#p0 .handset").append("<br>錯和(振聴)");
	}
    if(gPlayer[1].isFin || gPlayer[2].isFin) gPlayer[0].isIllegal = false;
  }
  return is_fin;
}

var ask_finish = function() {
  $("#askron").show();
  $(":button#ron"   ).unbind().click( function(){ state_machine(); } );
  $(":button#cancel").unbind().click( function(){ 
      var river = gPlayer[gTurn].river;
      var sute = river[river.length-1];
      gPlayer[0].isFin = false;  
      if(gPlayer[0].target.indexOf(sute)>=0) gPlayer[0].isWaive = true;
      gPlayer[0].pass.push(sute);
      state_machine(); 
  } ); 
}

function user_make_hand(yamahi){
  $(":button#clear, :button#sort, :button#start").show();
  //$("#message").html("Make a tingpai hand by picking out of the dealt 25 tiles.");
  $("#message").html("配牌25枚から13枚を選んで聴牌形をつくってください。<span id='resttime'>180</span>");
  $("#dealt, #handset").html("");
  var tehai = new Array();
  for(var i=0; i<yamahi.length; i++ ){
    $("#dealt").append('<li class="yama_hi" id="'+i+'_add'+yamahi[i]+'">'+hi_tag(yamahi[i]) + "</li>");
  }
  $(".yama_hi").bind("click", function(){ 
      $(this).hide();
      var artmp = $(this).attr("id").split("_add");
      var hi = yamahi[artmp[0]-0];
      var mes = '<span class="te_hi" id="' + artmp.join("_del") + '">' + hi_tag(hi) + "</span> ";
      $("#handset").append(mes);
      $("#start").attr('disabled', $("span.te_hi").length!=13);
    });
  $("#handset").on("click", "span.te_hi", function(){ 
      $("#" + $(this).attr("id").split("_del").join("_add")).show();
      $(this).remove();
      $("#start").attr('disabled', $("span.te_hi").length!=13);
  });
  $(":button#clear").click(function(){$(".yama_hi").show(); $("span.te_hi").remove();});
  $(":button#sort").click(function(){
      var tehai = [];
      $("span.te_hi").each(function(){
        tehai.push($(this).attr("id").split("_del").shift()-0);
      });
      tehai.sort(function(x,y){return x-y;});
      var mes = "";
      var hinum, hi;
      for(var i=0; i<tehai.length; i++){
        hinum = tehai[i];
        hi = yamahi[hinum];
        mes += '<span class="te_hi" id="' + hinum + "_del" + hi + '">' + hi_tag(hi) + "</span> ";
      }
      $("#handset").html(mes);
    });
  $(":button#start").unbind().click(function(){
      var tehai = [];
      if($("span.te_hi").length!=13) return;
      $("span.te_hi").each(function(){
        var hai = $(this).attr("id").split("_del").pop()-0;
        tehai.push(hai);
        yamahi.splice(yamahi.indexOf(hai),1);
      });//.die();
      $(".yama_hi").unbind();
      $(":button#clear, :button#sort, :button#start").hide();
      gPlayer[0].handset = tehai.slice().sort((x,y) => (x-y));
      gPlayer[0].isReady = true;
      state_machine();
    }).attr('disabled', true);
}
/*
function disp_river(sutehi){
  $("#p"+gTurn +" .river").html(hi_tag_array(sutehi, " "));
}
*/
var disp_user_discard_item = function(sutehi){
    $("#discard0").html("").show();
    for(var i=0; i<sutehi.length; i++ )
      $("#discard0").append('<li class="disc_hi" id="disc'+(i+1)+'">'+ hi_tag(sutehi[i]) + "</li>");
    $("#discard0").append('<div style="float:left;">('+sutehi.length+"枚)</div>");
    return;
}

var payment = function(){
  $("#result").html("").show();
  $("#sidebox").show();
  for(var i=0; i<3; i++){
     if(!gPlayer[i].isFin) continue;
     if(gPlayer[i].isIllegal){
         var point = (gPlayer[i].wind==0) ? 12:8; //[9+9=18 or 6+9=15]
	 gPlayer[i].point -= point * 2;
         gPlayer[(i+1)%3].point += point;
         gPlayer[(i+2)%3].point += point;	 
         $("#p"+i+" .handset").append(" = " + point + "kオール");
	 continue;
     }
    var ag =  gPlayer[gTurn].river[gPlayer[gTurn].river.length-1];
    var HandObj = new HandSet();
    HandObj.hai = gPlayer[i].handset;
    //HandObj.hai2t();
    HandObj.hai.push(ag);
    var CalcObj = new HandCalc();
    CalcObj.ba_kz = parseInt(gKyoku/3);
    CalcObj.ch_kz = gPlayer[i].wind;
    CalcObj.tsumo = (gPlayer[gTurn].river.length <15)?0:2;
    CalcObj.reach = (gPlayer[gTurn].river.length== 1)?2:1;
    CalcObj.tsumi = 0;
    CalcObj.dora  = 0;
    CalcObj.aghi  = ag;
    var ResObj  = new JangResult();
    ResObj.get_result_by_hand(HandObj, CalcObj);
    //ResObj.HandObj = HandObj;
    //ResObj.CalcObj = CalcObj;
    //ResObj.get_result();
    var res = "<br>";
    res += CalcObj.yaku().join( " + " );
    res += " = " + CalcObj.han() + "翻 " + (CalcObj.point(0) / 1000) + "k";
    $("#p"+i+" .handset").append(res);
    var budget = CalcObj.point(0)/1000 + gTsumi;
    gPlayer[i].point += budget;
    gPlayer[gTurn].point -= budget;
  }
  for(i=0;i<3;i++)  $(".p"+i).html(gPlayer[i].point+"k");
}

var show_all = function(){
  $(":button#expose").unbind().remove();
  for(var i=0; i<3; i++){
    var res = hi_tag_array(gPlayer[i].discard);
    if(i==0)  $("#discard0").html(res);
    else $("#p"+ i +" .discard").append(res);
    var res = " (待ち: "+ hi_tag_array(gPlayer[i].target) + ")";
    $("#p"+i+" .handset").show().append(res);
  }
}

var ask_next = function(){
  var res = '<input type="button" class="ui" id="next" value="Next">';
  res    += '<input type="button" class="ui" id="expose" value="全露">';
  $("#message").html(res);
  
  $(":button#expose").click(show_all);
  $(":button#next").unbind().click(function(){ $("#message").html("お待ちください"); state_machine(); });
  for(var i=0; i<3; i++) if(gPlayer[i].wind == 0) break;
  if(gPlayer[i].isFin){ gTsumi++; gTurn = i; return; }
  gTurn = (i + 1) % 3;
  gKyoku++;
  gTsumi = 0;
}

var check_finish = function(){
  var isFin = (gKyoku >= 3*2);
  if(!isFin)
    for(var i=0; i<3; i++) if(gPlayer[i].point < 0) isFin = true;
  if(!isFin) return false;
  $("#titlebox").show();
  $("#presentation").hide();
  var res = "<h3>Thank you for playing</h3>";
  var rank = [0,1,2].sort(function(a,b){
      return gPlayer[b].point - gPlayer[a].point;
    });
  res += "<ol>";
  for(var i=0; i<3; i++){
    res += "<li>" + gPlayer[rank[i]].name;
    res += " (" + gPlayer[rank[i]].point + "k)</li>";
  }
  res += "</ol>";
  $("#title").html(res);
  $("#subtitle").html("結果")
  if(rank[0]==0) 
    $("#message").html("おめでとうございます。");
  else
    $("#message").html("がんばりましょう。");
  return true;
}

var stState = 0;
var stTime = 0;
var gRtime = 0;
var gPsgID;
////////////////
function count_start(sec) {
  gRtime = sec;
  gPsgID = setInterval(showPassage, 1000);
}
////////////////
function count_stop() {
  if(gPsgID) clearInterval( gPsgID );
  var ret = gRtime;
  gRtime = 0;
  return ret;
}
/////////////// 
function showPassage() {
  gRtime--;
  $("#count").html(Math.ceil(gRtime));
  if(gRtime <= 0) state_machine();
}
/////////////// 
var state_machine = function() {
  var WAIT = { 
    NOTHING:0,
    FORUSER:1,
    FORTIME:2
  }
  var STATE = {
  INIT:        0,
  DEAL_TILE:  20,
  MAKE_HAND:  1,
  TURN_START: 2, 
  THINKING_TIME: 3,
  ASK_DISCARD:4,
  DISCARD:    5,
  CHECK  :    6,
  ASK_FINISH: 7,
  DECLARE_FINISH: 8,
  PAYMENT:    9,
  DRAW:      10,
  FINISH:    11
  }
  count_stop();
  var swWait = WAIT.NOTHING;
  while(!swWait){
    switch(stState){
    case STATE.INIT:
      //$("#message").html("お待ちください");
      stState = STATE.DEAL_TILE;
      break;
    case STATE.DEAL_TILE:
      $("#titlebox, #discard_tiles, #result").hide();
      $("#presentation, #make_hands").show();
      deal_tile();
      for(var i=0; i<3; i++) gPlayer[i].make_hand();
      stState = STATE.MAKE_HAND;
      swWait  = WAIT.FORTIME;
      stTime = 180;
      break;
    case STATE.MAKE_HAND:
      stTime--;
      swWait  = WAIT.FORTIME;
      $("#resttime").html(stTime);
      for(var i=0; i<3; i++) 
	if(!gPlayer[i].isReady && !gPlayer[i].is_hito){
	  gPlayer[i].cpu_set_hand();
	  break;
	}
      if(gPlayer[0].isReady){
	stState = STATE.TURN_START;
	swWait  = WAIT.NOTHING;
      }
      break;
    case STATE.TURN_START:
      prepare_discard();
      $("#discard_tiles").show();
      $("#make_hands").hide();
      stState = STATE.THINKING_TIME;
      break;
    case STATE.THINKING_TIME:
      for(var i=0; i<3; i++) $("#p"+i+" .name").css("color", i==gTurn ? "red":"black");
      if(gTurn != 0)  swWait = WAIT.FORTIME;
      stState = STATE.DISCARD;
      break;
    case STATE.ASK_DISCARD:
    case STATE.DISCARD:
      if(gTurn == 0){
	//ask_user_discard(gTurn);
	swWait = WAIT.FORUSER;
      } else {
      }
      gPlayer[gTurn].cpu_discard(gTurn);
      stState = STATE.CHECK;
      break;
    case STATE.CHECK:
      switch(checkfin()){
      case 0: stState = STATE.THINKING_TIME; break;
      case 1: stState = STATE.ASK_FINISH;    break;
      case 2: stState = STATE.DECLARE_FINISH; swWait = WAIT.FORTIME; break;
      case 3: stState = STATE.DRAW; break;
      }
      break;
    case STATE.ASK_FINISH: 
      ask_finish();
      swWait = WAIT.FORUSER;
      stState = STATE.DECLARE_FINISH;
      break;
    case STATE.DECLARE_FINISH:
      if(declare_finish()){
        stState = STATE.PAYMENT;
      } else {
        stState = STATE.THINKING_TIME;
        gTurn = (gTurn + 1)%3;
        //gRag = [false,false,false];
      }
      $("#message").html("");
      break;
    case STATE.DRAW://draw
      ask_next();
      swWait = WAIT.FORUSER;
      stState = STATE.FINISH;
      break;
    case STATE.PAYMENT:
      payment();
      ask_next();
      swWait = WAIT.FORUSER;
      stState = STATE.FINISH;
      break;
    case STATE.FINISH:
      if(check_finish())
	swWait = WAIT.FORUSER;
      else
	stState = STATE.INIT;
      break;
    }
  }
  if(swWait==WAIT.FORTIME) count_start(1);
}

$(document).ready( function() {
    init_game();
    $("#show_rule").click( function(){ $("#rule").show(); $("#main").hide(); } );
    $("#hide_rule").click( function(){ $("#rule").hide(); $("#main").show(); } );
    $("#titlebox").click(function(){  $("#message").html("お待ちください"); $(this).unbind(); state_machine(); });
});

