var HandObj = new HandSet();
var $id = (tagID) => document.getElementById(tagID);

function winning_tiles()
{
    var find_agari = {
        // 和了形
        14: (HandObj) =>
            HandObj.split() &&
            HandObj.hai.filter((v,i,self) => (self.indexOf(v) == i)),
        
        // 聴牌形
        13: (HandObj) => 
            Array(34).fill(0).map((zero, tile) => tile)
            .filter(tile => {
                if (HandObj.mai()[tile] == 4) return false;
                HandObj.hai.push(tile);
                var ret = HandObj.split();
                HandObj.hai.pop();
                return ret;
            }),
    };
    if (!find_agari[HandObj.sum()]) return;

    var winning = (HandObj => {
        var sum = HandObj.sum();
        var ret = find_agari[sum](HandObj) || [];

        return {
            tiles: ret,
            message: {
                13: ["不聴", ret.length + '面待ちの聴牌'],
                14: ["錯和", "和了形"],
            }[sum][ret.length && 1],
        };

    })(HandObj);
    

    $id("command").innerHTML = winning.message;
    if (!winning.tiles.length) return;

    var $head = '<b>和了牌：</b><div style="margin:2px;">';
    var $options = winning.tiles.map(function(agari) {
        return '<li onclick="calc(' + agari + ')">' + $imgtile(agari) + '</li> ';
    }).join("");
    var $foot = '<div class="br"></div></div><hr>';

    $id("calc").style.display = "block";
    $id("aghi").innerHTML = $head + $options + $foot;

    if (winning.tiles.length == 1) return calc(winning.tiles[0]);

    $id("result").innerHTML = "";
    $id("command").innerHTML += '。和了牌を選択してください。';
}

function calc(aghi)
{
    var is_tempai = (0 <= aghi) && (HandObj.sum() == 13);

    if (is_tempai) HandObj.hai.push(aghi);
    if (HandObj.split_into_ments(true)) {

        var CalcObj = new HandCalc();
        CalcObj.ba_kz = parseInt(document.hai.ba.value);
        CalcObj.ch_kz = parseInt(document.hai.ie.value);
        CalcObj.tsumo = parseInt(document.hai.tsumo.value);
        CalcObj.reach = parseInt(document.hai.reach.value);
        CalcObj.tsumi = parseInt(document.hai.tsumi.value);
        CalcObj.dora  = parseInt(document.hai.dora.value);
        CalcObj.aghi  = aghi;
        CalcObj.yaku_disable = apply_rule();
        CalcObj.triple = document.rule.triple.checked ? 10 : 11;
        CalcObj.is_mangan77 = document.rule.mangan77.checked;
        CalcObj.is_pinzumo = !(document.rule.pinzumo.checked);
        CalcObj.is_30fu_kuipinfu = !(document.rule.kuipinfu.checked);
        CalcObj.is_chuzan = document.rule.chuzan.checked;
        CalcObj.is_hypaethral = document.rule.hypaethral.checked;
        
        var ResObj  = new JangResult();
        ResObj.config_show_haishi(false);
        ResObj.HandObj = HandObj;
        ResObj.CalcObj = CalcObj;
        ResObj.get_result_by_hand();
        $id("result").innerHTML = ResObj.result_table();
        $id("result").innerHTML += '<a href="?' + ResObj.result_id() + '" target="_blank">この和了手のパーマリンク</a>';
    }
    if (is_tempai) HandObj.hai.pop();
}

function apply_rule()
{
    var disablehands = {};
    var $checks = $id("yakulist").getElementsByTagName("input");
    for (var i = 0; i < $checks.length; i++) {
        var $check = $checks[i];
        if ($check.type == "checkbox") {
            disablehands[$check.id] = (!$check.checked);
        }
    }
    return disablehands;
}

function draw_tiles(is_calc)
{
    var $tehai = HandObj.hai.map(function(hi, i) {
        return '<span onclick="$delhi(' + i + ')">' + $imgtile(hi) + '</span> '
    });

    var $furo = HandObj.n.map(function(mentz, i) {
        var type = mentz[1];
        var head = mentz[0];
        var $val = {
            [$J.type.chi]: '[ ' + $imgtile(head) + $imgtile(head + 1) + $imgtile(head + 2) + ' ]',
            [$J.type.pon]: '[ ' + $imgtile(head).repeat(3) + ' ]',
            [$J.type.kan]: '[ ' + $imgtile(head).repeat(4) + ' ]',
            [$J.type.ankan]: $imgtile(head) + $imgtile(-1) + $imgtile(-1) + $imgtile(head),
        }[type];

        return ' <span class="tehai" onclick="$delhi(' + i + ', true)">' + $val + "</span>";
    });
    
    $id("edit_button").style.display = (0 < HandObj.sum()) ? "inline" : "none";
    $id("mentz").innerHTML = $tehai.join("") + $furo.join("");
    
    if (!is_calc) {
        $id("command").innerHTML = "和了形または聴牌形を入力してください。";
        $id("aghi").innerHTML = "";
    }

    $id("result").innerHTML = "";
    $id("calc").style.display = "none";

    winning_tiles();
}

var $imgtile = $J.hitag = function(hi)
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

function $formclear()
{
    HandObj = new HandSet();
    $id("edit_button").style.display = "none";
    $id("command").innerHTML = "和了形または聴牌形を入力してください。";
    draw_tiles();
}

function $addhi(hi)
{
    var type = [-1, $J.type.chi, $J.type.pon, $J.type.kan, $J.type.ankan];
    HandObj.addhi(parseInt(hi), type[document.hai.type.value]);
    draw_tiles();
}

function $delhi(i, furo_flag)
{
    HandObj.delhi(i, furo_flag);
    draw_tiles();
}
function $rmhi(i, furo_flag)
{
    HandObj.rmhai(i);
    draw_tiles();
}

function $toggle_help()
{
    var stat = $id("help").style.display;
    $id("help").style.display = (stat == "block") ? "none" : "block";
}

function $sorthi()
{
    HandObj.sorthai();
    draw_tiles();
}

window.onload = function()
{
    document.getElementsByClassName("h")[0].innerHTML = [...Array(34)]
        .map((v, i) =>
             '<li onclick="$addhi(' + i + ')">' + $imgtile(i) + '</li>')
        .join("");
    
    function yaku_list()
    {
        var Calc = new HandCalc();
        var hands = Calc.yaku_all;
        var disablehands = Calc.yaku_disable;
        var yakutags = Object.keys(hands);
        
        $id("yakulist").innerHTML = yakutags.sort(function(a,b) {
            var eval = disablehands[a] ? 500 : 0;
            eval -= disablehands[b] ? 500 : 0;
            eval += (hands[a][0] - hands[b][0]) * 10;
            eval += (hands[a][1] - hands[b][1]);
            return eval;
        }).map(function(yakutag, i) {
            var def = hands[yakutag].slice();
            var handname = def.pop();
            if (def[1] == 0) def.pop();
            
            var $val = handname + "(" + def.join("/") + ")<br />";
            var $check = '<input type="checkbox" id="' + yakutag + '"';
            $check += (yakutag in disablehands) ? ">" : " checked>";
 
            var $head = (i % 13 == 0) ? '<div class="checklist">' : "";
            var $foot = (i % 13 == 12) ? '</div>' : "";

            return $head + $check + $val + $foot;
        }).join("");
    }

    $id("help").style.display = "none";
    $formclear();
    yaku_list();

    //記憶手の出力
    var id = location.search.slice(1).split("&").shift();
    if (!id) return;

    var ResObj = (new JangResult()).run(id);
    HandObj = ResObj.HandObj;
    document.hai.ba.value    = ResObj.CalcObj.ba_kz;
    document.hai.ie.value    = ResObj.CalcObj.ch_kz;
    document.hai.tsumo.value = ResObj.CalcObj.tsumo;
    document.hai.reach.value = ResObj.CalcObj.reach;
    document.hai.tsumi.value = ResObj.CalcObj.tsumi;
    document.hai.dora.value  = ResObj.CalcObj.dora;

    if (!HandObj.split_into_ments(true)) return false;

    draw_tiles(true);
    calc(ResObj.CalcObj.aghi);
};

