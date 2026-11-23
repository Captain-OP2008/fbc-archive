/* ==========================================================================
   FEDERAL BUREAU OF CONTROL — INTERNAL ARCHIVE
   render.js  ·  工具函数 + 各章节渲染器
   ========================================================================== */
(function (w) {
  'use strict';

  var D = w.FBC || {};

  /* ---------------------------------------------------------------- 工具 */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* 富文本：转义 → 还原白名单行内标记 → 解析 {{等级|机密内容}} → 密文条 */
  var HL_A = '\u0001', HL_B = '\u0002';

  function rich(s) {
    var out = esc(s);
    /* 白名单行内标签（数据为本地手写，白名单外的一切保持转义）
       注意：esc() 已把 " 转成 &quot;，因此属性值必须按实体匹配 */
    out = out.replace(/&lt;(\/?)(b|i|em|strong|br|u|small|mark)(\s*\/?)&gt;/gi, '<$1$2$3>');
    out = out.replace(/&lt;span class=&quot;([a-z0-9\- ]{1,40})&quot;&gt;/gi, '<span class="$1">');
    out = out.replace(/&lt;span&gt;/gi, '<span>');
    out = out.replace(/&lt;\/span&gt;/gi, '</span>');
    /* 密文 */
    out = out.replace(/\{\{(\d)\|([^}]*)\}\}/g, function (m, lv, txt) {
      /* 密文内不参与检索高亮：先剥掉哨兵再写入，否则 <mark> 的 UA 黄底黑字
         会让被涂黑的字浮出来，整条密级玩法失效。 */
      var clean = txt.split(HL_A).join('').split(HL_B).join('');
      var len = clean.replace(/\s/g, '').length;
      return '<span class="redact" data-lv="' + lv + '" data-txt="' + clean +
             '" data-len="' + len + '字符" tabindex="0" role="button" ' +
             'aria-label="密文，需 ' + lv + ' 级权限">' + clean + '</span>';
    });
    /* 兜底：未闭合 / 非法级别 / 嵌套导致的残余标记不应把原始语法泄漏到页面。
       合法密文在上一步已整体替换，这里只会命中异常数据。 */
    out = out.replace(/\{\{\d+\|?/g, '').replace(/\}\}/g, '');
    /* 检索高亮哨兵 */
    return out.split(HL_A).join('<mark>').split(HL_B).join('</mark>');
  }

  /* 在原始文本上标记检索命中位置（之后交给 rich 统一转义） */
  function markHits(text, q) {
    if (!q) return text;
    try {
      var re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      return String(text).replace(re, HL_A + '$1' + HL_B);
    } catch (e) { return text; }
  }

  /* 富文本（不移除换行 → <br>） */
  function richLines(arr) {
    return (arr || []).map(function (p) { return '<p>' + rich(p) + '</p>'; }).join('');
  }

  function setHTML(sel, html) {
    var n = typeof sel === 'string' ? $(sel) : sel;
    if (n) n.innerHTML = html;
    return n;
  }

  /* ------------------------------------------------------- 01 局长简报 */

  function renderBriefStats() {
    var rows = (D.briefStats || []).map(function (r) {
      return '<div class="kv-row"><dt>' + esc(r.k) + '</dt><dd class="' + (r.cls || '') + '">' +
             rich(r.v) + '</dd></div>';
    }).join('');
    setHTML('#brief-stats', rows);
  }

  /* ------------------------------------------------------- 02 控制局 */

  function renderBureau() {
    var b = D.bureau || {};

    setHTML('#bureau-stats', (b.stats || []).map(function (s) {
      return '<div class="stat' + (s.red ? ' is-red' : '') + '">' +
             '<div class="v">' + esc(s.v) + (s.u ? '<span class="u">' + esc(s.u) + '</span>' : '') + '</div>' +
             '<div class="k">' + esc(s.k) + '</div></div>';
    }).join(''));

    setHTML('#bureau-about', (b.about || []).map(function (blk) {
      return (blk.h ? '<h3 style="margin:1.8rem 0 .8rem">' + esc(blk.h) + '</h3>' : '') +
             richLines(blk.p);
    }).join(''));

    setHTML('#bureau-clippings', (b.clippings || []).map(function (c) {
      return '<div class="clipping"><div class="src">' + esc(c.src) + '</div><p>' + rich(c.text) + '</p></div>';
    }).join(''));
  }

  /* ------------------------------------------------- 扇区编制归属 */

  /* 部门落在哪个扇区。规则统一为：
       ①「隶属」写成「主扇区 · 子归属」时，若子归属指向另一个扇区
          （如「超心理学部下辖」「与全景监狱合署」），该部门实际就在那个扇区里；
       ② 否则取「·」之前的主扇区名；
       ③ 早期条目没有「隶属」栏，退回 tags 里的扇区标签。 */
  function deptSectorOf(d) {
    var floors = (D.house && D.house.floors) || [];
    var names = floors.map(function (f) { return f.name; });
    var kv = (d.kv || []).filter(function (r) { return r[0] === '隶属'; })[0];
    var raw = (kv && kv[1]) ? String(kv[1]) : '';

    if (raw) {
      var parts = raw.split('·');
      if (parts.length > 1) {
        var sub = parts.slice(1).join('·');
        var best = '';
        for (var i = 0; i < names.length; i++) {
          if (sub.indexOf(names[i]) >= 0 && names[i].length > best.length) best = names[i];
        }
        if (best) return best;
      }
      var main = parts[0].trim();
      if (main) return main;
    }

    var tags = (d.tags || []).map(function (t) { return t.t || t; });
    for (var j = 0; j < names.length; j++) {
      if (tags.indexOf(names[j]) >= 0) return names[j];
    }
    return '';
  }

  function deptsInSector(name) {
    return allDepts().filter(function (d) { return deptSectorOf(d) === name; });
  }

  /* 扇区名本身就是一个部门时（通讯部、怀旧部、死信档案馆…）单独取出来 */
  function sectorSelf(name) {
    var list = allDepts();
    for (var i = 0; i < list.length; i++) { if (list[i].name === name) return list[i]; }
    return null;
  }

  /* 扇区编制清单：把扇区内部的部门逐个分开列出，每行都能直接调阅该部门档案 */
  function sectorRosterHTML(name) {
    var list = deptsInSector(name);
    var self = sectorSelf(name);
    var head = '<div class="sr-hd"><span class="sr-ttl">本扇区编制</span>' +
      '<span class="sr-cnt">' + (list.length + (self ? 1 : 0)) + ' 项</span></div>';

    if (!list.length && !self) {
      return head + '<p class="sr-none">本扇区未登记独立编制机构：此处只设值守与通行节点，' +
        '办公职能设在其他扇区。</p>';
    }

    var rows = '';
    if (self) {
      rows += '<li class="sr-row is-self"><button type="button" class="sr-item" ' +
        'data-dos="dept" data-key="' + esc(self.no) + '" title="调阅 ' + esc(self.name) + ' 档案">' +
        '<span class="sr-no">' + esc(self.no) + '</span>' +
        '<span class="sr-nm">' + esc(self.name) + '</span>' +
        '<span class="sr-nt">扇区本体</span></button></li>';
    }
    rows += list.map(function (d) {
      var role = (d.kv || []).filter(function (r) { return r[0] === '职能'; })[0];
      var note = role ? String(role[1]).split('/')[0].trim() : (d.tier === 'implied' ? '档案推定' : '');
      return '<li class="sr-row"><button type="button" class="sr-item" ' +
        'data-dos="dept" data-key="' + esc(d.no) + '" title="调阅 ' + esc(d.no) + ' ' + esc(d.name) + ' 档案">' +
        '<span class="sr-no">' + esc(d.no) + '</span>' +
        '<span class="sr-nm">' + esc(d.name) + '</span>' +
        (note ? '<span class="sr-nt">' + esc(note) + '</span>' : '') +
        '</button></li>';
    }).join('');

    return head + '<ul class="sr-list">' + rows + '</ul>';
  }

  /* 未编入任何扇区的部门（机动性质，如行动部），在 02 卷说明里单列 */
  function deptsUnassigned() {
    var floors = (D.house && D.house.floors) || [];
    var names = floors.map(function (f) { return f.name; });
    return allDepts().filter(function (d) {
      var s = deptSectorOf(d);
      return !s || names.indexOf(s) < 0;
    });
  }

  /* ------------------------------------------------------- 03 最古老屋 */

  /* 扇区类型的中文名。原先由测绘数据提供，测绘卷移除后改为本地映射。 */
  var KIND_NAME = {
    foundation: '地基 · 结构核心',
    contain:    '收容与设施',
    exec:       '行政与决策',
    research:   '研究与实验',
    ops:        '外部行动',
    lobby:      '公共区域',
    threshold:  '阈界 · 非建筑',
    danger:     '污染区 · 禁止进入'
  };

  function kindName(k) { return KIND_NAME[k] || k || '未分类'; }

  /* 地图数据里区域所属的扇区（英文 → 站内中文名） */
  var POI_REG_CN = {
    Executive: '行政扇区', Maintenance: '维护扇区', Containment: '收容扇区',
    Research: '研究扇区', Investigations: '调查扇区', Foundation: '地基 · 钉子'
  };

  function renderHouse() {
    var floors = (D.house && D.house.floors) || [];
    var sectors = (D.house && D.house.sectors) || [];
    var P = w.FBC_POIS || {};
    var byName = {};
    floors.forEach(function (f) { byName[f.name] = f; });

    /* 把地图上的区域按扇区归拢，得到每个扇区真正的内部结构 */
    var bySector = {};
    (P.locs || []).forEach(function (l) {
      if (l[2] !== 'AREA') return;
      var sid = POI_REG_CN[l[4]] || l[4];
      (bySector[sid] = bySector[sid] || []).push(l);
    });

    function row(cnName, enName, rec) {
      var n = rec ? (deptsInSector(cnName).length + (sectorSelf(cnName) ? 1 : 0)) : 0;
      var inner = '<b>' + esc(cnName) + '</b>' +
        '<i>' + esc(enName || '') + '</i>' +
        (n ? '<em>' + n + '</em>' : '');
      var hasArea = !!((w.FBC_DOSSIER_AREA || {})[cnName]);
      var dk = rec ? 'floor' : (hasArea ? 'area' : '');
      return dk
        ? '<li><button class="area-row" type="button" data-dos="' + dk + '" data-key="' + esc(cnName) + '">' +
          inner + '</button></li>'
        : '<li><span class="area-row">' + inner + '</span></li>';
    }

    setHTML('#tower', sectors.map(function (S) {
      var list = (bySector[S.key] || []).map(function (l) {
        return { cn: (typeof POI_AREA_CN !== 'undefined' && POI_AREA_CN[l[3]]) || l[3], en: l[3] };
      });

      /* 有些登记条目不在地图的区域层里（入口大堂、扇区本体等），补在后面 */
      (S.areas || []).forEach(function (nm) {
        if (!byName[nm]) return;
        if (list.some(function (x) { return x.cn === nm; })) return;
        list.push({ cn: nm, en: (byName[nm] || {}).en || '' });
      });

      list.sort(function (x, y) { return x.cn.localeCompare(y.cn, 'zh'); });

      return '<div class="fgroup' + (S.external ? ' is-external' : '') + '">' +
        '<div class="fgroup-hd">' +
          '<b>' + esc(S.key) + '</b><i>' + esc(S.en || '') + '</i>' +
          '<span class="fgroup-n mono">' + list.length + ' 个区域</span>' +
        '</div>' +
        '<ul class="area-list">' +
          list.map(function (x) { return row(x.cn, x.en, byName[x.cn]); }).join('') +
        '</ul>' +
        '</div>';
    }).join(''));
  }

  /* ------------------------------------------------------- 03 互动地图 */

  /* 世界坐标 → 逻辑画布坐标。
     Mapgenie 的瓦片是标准 Web Mercator（经度线性、纬度非线性）。
     逻辑画布统一用 zoom-14 的像素刻度；实际加载哪一级瓦片由当前 scale 决定，
     所以放大时自动切到更高清的层，而不是把一张大图拉糊。 */
  var POI_B = { x0: -1.10, x1: -0.30, y0: 0.23, y1: 1.18 };
  var POI_ZMIN = 11, POI_ZMAX = 14, POI_ZBASE = 14;
  var POI_TS = 256;

  function poiLonPx(lon, z) { return (lon + 180) / 360 * Math.pow(2, z) * POI_TS; }
  function poiLatPx(lat, z) {
    var r = lat * Math.PI / 180;
    return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * Math.pow(2, z) * POI_TS;
  }

  function poiTilesOf(z) {
    return {
      x0: Math.floor(poiLonPx(POI_B.x0, z) / POI_TS),
      x1: Math.floor(poiLonPx(POI_B.x1, z) / POI_TS),
      y0: Math.floor(poiLatPx(POI_B.y1, z) / POI_TS),
      y1: Math.floor(poiLatPx(POI_B.y0, z) / POI_TS)
    };
  }

  var POI_TB = poiTilesOf(POI_ZBASE);
  var POI_W = (POI_TB.x1 - POI_TB.x0 + 1) * POI_TS;
  var POI_H = (POI_TB.y1 - POI_TB.y0 + 1) * POI_TS;

  /* 世界坐标 → 逻辑画布（z14 像素，原点在瓦片区左上角） */
  function poiX(lon) { return poiLonPx(lon, POI_ZBASE) - POI_TB.x0 * POI_TS; }
  function poiY(lat) { return poiLatPx(lat, POI_ZBASE) - POI_TB.y0 * POI_TS; }

  /* ---- 扇区紧凑布局 ----
     原始底图是一整张约 9728×11264 的地图，六个扇区之间隔着大片空白瓦片，
     读起来像六座漂在灰色海面上的岛。这里为每个扇区算出内容包围盒，
     再按「行聚类 + 行内紧排」重排，扇区之间的空白被裁掉，
     整张舞台从 9728×11264 收到约 6580×8424（面积省一半），板块彼此紧贴。 */
  var poiLayout = null;

  function poiBuildLayout() {
    var P = w.FBC_POIS || {};
    var regs = P.regions || [];
    if (!regs.length) return null;

    var PAD = 60, GAP = 48;
    var items = regs.map(function (r) {
      var xs = [], ys = [];
      r.pts.forEach(function (p) { xs.push(poiX(p[0])); ys.push(poiY(p[1])); });
      (P.locs || []).forEach(function (l) {
        if (l[4] !== r.k) return;
        xs.push(poiX(l[0])); ys.push(poiY(l[1]));
      });
      var x0 = Math.min.apply(null, xs) - PAD, x1 = Math.max.apply(null, xs) + PAD;
      var y0 = Math.min.apply(null, ys) - PAD, y1 = Math.max.apply(null, ys) + PAD;
      return { k: r.k, x0: x0, y0: y0, x1: x1, y1: y1, w: x1 - x0, h: y1 - y0, cy: (y0 + y1) / 2 };
    });

    /* 按纵向中心聚成行 */
    items.sort(function (a, b) { return a.cy - b.cy; });
    var rows = [];
    items.forEach(function (it) {
      var row = rows[rows.length - 1];
      if (row && Math.abs(it.cy - row.cy) < Math.max(it.h, row.h) * 0.55) {
        row.items.push(it);
        row.cy = (row.cy * (row.items.length - 1) + it.cy) / row.items.length;
        row.h = Math.max(row.h, it.h);
      } else {
        rows.push({ cy: it.cy, h: it.h, items: [it] });
      }
    });

    /* 行内按横向排序后紧排，行与行之间留 GAP */
    var sects = {}, y = 0, W = 0;
    rows.forEach(function (row) {
      row.items.sort(function (a, b) { return a.x0 - b.x0; });
      var cx = 0;
      row.items.forEach(function (it) {
        sects[it.k] = {
          dx: cx - it.x0, dy: y - it.y0,
          x0: it.x0, y0: it.y0, x1: it.x1, y1: it.y1,
          w: it.w, h: it.h
        };
        cx += it.w + GAP;
      });
      W = Math.max(W, cx - GAP);
      y += row.h + GAP;
    });

    return { W: W, H: y - GAP, sects: sects };
  }

  function poiSect(k) {
    var s = poiLayout && poiLayout.sects[k];
    return s || { dx: 0, dy: 0, x0: 0, y0: 0, x1: 0, y1: 0, w: 0, h: 0 };
  }
  /* 带扇区偏移的坐标：板块重排后，所有属于该扇区的点/瓦片一起平移 */
  function poiXo(lon, sect) { return poiX(lon) + poiSect(sect).dx; }
  function poiYo(lat, sect) { return poiY(lat) + poiSect(sect).dy; }
  function poiLW() { return poiLayout ? poiLayout.W : POI_W; }
  function poiLH() { return poiLayout ? poiLayout.H : POI_H; }

  var poiState = { on: null, zoom: 1, px: 0, py: 0, z: 0, vb: null };

  /* 图钉图标：Mapgenie 那种水滴形 pin，底部尖端指向坐标点。
     尺寸固定 24×32，屏幕上恒定大小；靠 --inv 抵消 stage 缩放。 */
  var POI_PIN_PATH = 'M12 0.8C5.6 0.8 0.8 5.6 0.8 12c0 8.4 11.2 19.2 11.2 19.2S23.2 20.4 23.2 12C23.2 5.6 18.4 0.8 12 0.8z';

  /* 每个类别一个符号与配色。AREA 不画图钉，直接渲染成文字。 */
  var POI_PIN = {
    'SUPPLY CRATE':    { c: '#e3bc42', g: '▣', cn: '补给箱' },
    'RECORD':          { c: '#e3bc42', g: '◉', cn: '录音' },
    'CORRESPONDENCE':  { c: '#e3bc42', g: '✉', cn: '往来信件' },
    'CASE FILE':       { c: '#e3bc42', g: '▤', cn: '案卷' },
    'MULTIMEDIA':      { c: '#e3bc42', g: '▶', cn: '多媒体' },
    'LOCKED DOOR':     { c: '#cf3a2c', g: '▮', cn: '上锁的门' },
    'CONTROL POINT':   { c: '#e3bc42', g: '✛', cn: '控制点' },
    'HIDDEN LOCATION': { c: '#cf3a2c', g: '◉', cn: '隐秘地点' },
    'MISCELLANEOUS':   { c: '#d9d4c7', g: '?', cn: '其他' },
    'VENDING MACHINE': { c: '#e3bc42', g: '▥', cn: '自动售货机' },
    'MANEKI-NEKO':     { c: '#e3bc42', g: '◆', cn: '招财猫' },
    'COSTUME':         { c: '#e3bc42', g: '♢', cn: '服装' },
    'CLEARANCE LEVEL': { c: '#f0c22f', g: '★', cn: '权限等级' }
  };
  /* 区域在筛选栏里也要显示中文 */
  var POI_AREA_ROW = { c: '#c9a227', cn: '区域' };

  /* AREA 的中文名。查不到就退回英文原文。 */
  var POI_AREA_CN = {
    'A/C SYSTEMS': '空调系统', 'ABANDONED OFFICES': '废弃办公室', 'ACCESS CORRIDOR': '通路走廊',
    'ACTIVE INVESTIGATIONS': '现役调查', 'ARCHIVES': '档案室', 'ASHTRAY MAZE': '烟灰缸迷宫',
    'ASTRAL EXHIBITION': '星界展厅', 'ATLAS CHAMBER': '阿特拉斯室', 'AWE LOADING BAY': 'AWE 装卸区',
    'AWE TRANSIT BAY': 'AWE 转运区', 'BASE CAMP': '大本营', 'BLACK ROCK LAB': '黑岩实验室',
    'BLACK ROCK PROCESSING': '黑岩加工区', 'BLACK ROCK QUARRY': '黑岩采石场', 'BOARD ROOM': '会议室',
    'BRIGHT FALLS AWE': '亮瀑镇 AWE', 'CAFETERIA': '食堂', 'CANYON RIM': '峡谷边缘',
    'CAVE BLEED': '洞窟渗出', 'CAVE SYSTEM': '洞穴系统', 'CENTRAL CONTAINMENT': '中央收容',
    'CENTRAL EXECUTIVE': '中央行政', 'CENTRAL MAINTENANCE': '中央维护', 'CENTRAL RESEARCH': '中央研究',
    'CHASM': '深谷', 'COLLAPSED DEPARTMENT': '坍塌部门', 'COMMUNICATIONS DEPT.': '通讯部',
    'CROSSROADS': '交叉口', 'DEAD LETTERS': '死信档案馆', 'DEEP CAVERN': '深层洞窟',
    'DIMENSIONAL RESEARCH': '维度研究部', "DIRECTOR'S OFFICE": '局长办公室',
    'EAGLE LIMITED AWE': '雄鹰特快 AWE', 'EXECUTIVE AFFAIRS': '行政事务',
    'EXTRASENSORY LAB': '超感知实验室', 'FIELD TRAINING': '外勤训练场', 'FIREBREAK': '防火墙',
    'FRA MAURO AWE': '弗拉毛罗 AWE', 'FRACTURED CAVERN': '破碎洞窟', 'FURNACE CHAMBER': '熔炉室',
    'HEDRON CHAMBER': '赫德隆室', 'HOTLINE CHAMBER': '热线室', 'HRA LAB': 'HRA 实验室',
    'HYPNOSIS LAB': '催眠实验室', "JANITOR'S OFFICE": '清洁工办公室',
    'LOADING BAY VENTS': '装卸区通风口', 'LOGISTICS': '后勤', 'LOWER ACCESS': '下层通道',
    'LUCK & PROBABILITY': '概率与运气', 'MAIL ROOM': '邮件室', 'MEDICAL WING': '医疗区',
    'NSC CONTROL ROOM': 'NSC 控制室', 'NSC COOLANT PUMPS': 'NSC 冷却泵',
    'NSC ENERGY CONVERTERS': 'NSC 能量转换器', 'NSC POWER PLANT': 'NSC 发电厂',
    'OBSERVATION DECK': '观测台', 'OPERATIONS CENTER': '行动中心', 'OPERATIONS CORRIDOR': '行动走廊',
    'ORDINARY AWE': '平凡镇 AWE', 'ORDINARY DUMP': '平凡镇垃圾场', 'P6 CELL': 'P6 收容单元',
    'PANOPTICON': '全景监狱', 'PANOPTICON ENTRANCE': '全景监狱入口', 'PARAKINESIOLOGY': '超动理学',
    'PARAPSYCHOLOGY': '超心理学部', 'PARAPSYCHOLOGY ELEVATOR': '超心理学部电梯',
    'PIPEWORKS': '管道区', 'PNEUMATICS': '气动管道', 'PRIME CANDIDATE PROGRAM': '首席候选人计划',
    'PROTECTIVE STUDIES': '防护研究', 'PUMP STATION': '泵站', 'RESEARCH SITE GAMMA': '研究点 Gamma',
    'RESTRICTED AREA': '禁区', 'RITUAL DIVISION': '仪式部',
    'SEALED THRESHOLD CHECKPOINT': '封锁阈界检查站', 'SEALED THRESHOLD CORRIDOR': '封锁阈界走廊',
    'SEALED THRESHOLD HALL': '封锁阈界大厅', 'SECTOR HEAD OFFICE': '扇区主管办公室',
    'SECURITY': '安保', 'SERVICE DUCTS': '检修管道', 'SERVICE VENTS': '检修通风口',
    'SHIFTED OFFICES': '移位办公室', 'SHIFTED PASSAGE': '移位通道', 'STERLING AWE': '斯特灵 AWE',
    'SYNCHRONICITY LAB': '同步性实验室', 'TRANSIT ACCESS': '运输通道',
    'TRANSIT CORRIDOR NORTH': '运输走廊 北', 'TRANSIT CORRIDOR SOUTH': '运输走廊 南',
    'TURNTABLE': '转盘', 'UTILITY CORRIDOR': '设备走廊', 'VENTILATION': '通风区',
    'WAREHOUSE': '仓库', 'WAREHOUSE PATH': '仓库通道'
  };

  /* 全部 14 个类别：AREA 渲染成文字，其余渲染成图钉 */
  var POI_ALL_CATS = ['AREA'].concat(Object.keys(POI_PIN));

  var POI_REG_CLR = {
    Executive: '#c9a227', Maintenance: '#4a86c9', Containment: '#cf2a1e',
    Research: '#6d74ff', Investigations: '#7a8f5a', Foundation: '#8a7fd0'
  };

  var POI_GROUP = {
    'AREA': '地点', 'CONTROL POINT': '地点', 'HIDDEN LOCATION': '地点',
    'LOCKED DOOR': '地点', 'VENDING MACHINE': '地点',
    'CASE FILE': '收藏', 'CORRESPONDENCE': '收藏', 'MANEKI-NEKO': '收藏',
    'MULTIMEDIA': '收藏', 'RECORD': '收藏', 'CLEARANCE LEVEL': '收藏', 'COSTUME': '收藏',
    'SUPPLY CRATE': '物品', 'MISCELLANEOUS': '其他'
  };

  function renderPoiMap() {
    var host = $('#poi-canvas');
    if (!host) return;
    var P = w.FBC_POIS;
    if (!P || !P.locs || !P.locs.length) {
      host.innerHTML = '<div class="at-empty">点位数据未加载。</div>';
      return;
    }

    if (!poiState.on) {
      poiState.on = {};
      /* 默认显示区域名 + 控制点（151 个点位）：既不让首屏过空，也不至于像全开那样糊成一片。
         其余类别（329 个补给箱、121 段录音……）留给读者按需勾选。 */
      var poiDefaultOn = { 'AREA': 1, 'CONTROL POINT': 1 };
      POI_ALL_CATS.forEach(function (k) { poiState.on[k] = !!poiDefaultOn[k]; });
    }

    /* 先算好六个扇区的紧凑排布，后面所有坐标都按扇区偏移绘制 */
    poiLayout = poiBuildLayout();

    /* 扇区：只在底图上叠一圈很淡的描边与名称，帮助定位；房间轮廓本身来自底图 */
    var regions = (P.regions || []).map(function (r) {
      var d = r.pts.map(function (p, i) {
        return (i ? 'L' : 'M') + poiXo(p[0], r.k).toFixed(1) + ' ' + poiYo(p[1], r.k).toFixed(1);
      }).join(' ') + 'Z';
      var cx = 0, cy = 0;
      r.pts.forEach(function (p) { cx += poiXo(p[0], r.k); cy += poiYo(p[1], r.k); });
      cx /= r.pts.length; cy /= r.pts.length;
      var n = P.locs.filter(function (l) { return l[4] === r.k; }).length;
      return '<g class="poi-reg" style="--c:' + (POI_REG_CLR[r.k] || '#8a8578') + '">' +
        '<path class="poi-reg-s" d="' + d + '"/>' +
        '<text class="poi-reg-n" x="' + cx.toFixed(1) + '" y="' + (cy - 4).toFixed(1) + '">' + esc(r.k) + '</text>' +
        '<text class="poi-reg-c" x="' + cx.toFixed(1) + '" y="' + (cy + 18).toFixed(1) + '">' + n + '</text>' +
        '</g>';
    }).join('');

    /* 点：按类别分组，便于整组显隐 */
    var groups = {};
    P.locs.forEach(function (l) { (groups[l[2]] = groups[l[2]] || []).push(l); });

    /* AREA 的文字标注排在最后绘制，避免被图钉盖住 */
    var gkeys = Object.keys(groups);
    gkeys.sort(function (a, b) {
      return (a === 'AREA' ? 1 : 0) - (b === 'AREA' ? 1 : 0);
    });

    var dots = gkeys.map(function (k) {
      var hidden = poiState.on[k] ? '' : ' style="display:none"';

      /* AREA 就是房间/区域本身，渲染成文字标注；其余类别渲染成水滴图钉 */
      if (k === 'AREA') {
        return '<g class="poi-g poi-labels" data-cat="AREA"' + hidden + '>' +
          groups[k].map(function (l) {
            var cn = POI_AREA_CN[l[3]] || l[3];
            return '<text class="poi-label" x="' + poiXo(l[0], l[4]).toFixed(1) + '" y="' + poiYo(l[1], l[4]).toFixed(1) +
              '" data-t="' + esc(l[3]) + '" data-r="' + esc(l[4]) + '" data-c="AREA"' +
              ' data-cn="' + esc(cn) + '">' + esc(cn) + '</text>';
          }).join('') + '</g>';
      }

      var pin = POI_PIN[k] || { c: '#d9d4c7', g: '·' };
      return '<g class="poi-g" data-cat="' + esc(k) + '"' + hidden + '>' +
        groups[k].map(function (l) {
          return '<g class="poi-pin" style="--x:' + poiXo(l[0], l[4]).toFixed(1) + 'px;--y:' + poiYo(l[1], l[4]).toFixed(1) +
            'px;--c:' + pin.c + '" data-t="' + esc(l[3]) + '" data-r="' + esc(l[4]) +
            '" data-c="' + esc(k) + '">' +
            '<path class="poi-pin-bg" d="' + POI_PIN_PATH + '"/>' +
            '<text class="poi-pin-g" x="12" y="13.6">' + esc(pin.g) + '</text>' +
            '</g>';
        }).join('') + '</g>';
    }).join('');

    /* 每个扇区一个裁剪容器：容器尺寸就是该扇区的内容包围盒，
       紧凑排布后板块之间不再有大片空白瓦片。瓦片按扇区分别加载（同一张图可能被
       两个扇区各引用一次，但 URL 相同，浏览器只下载一次）。 */
    var LW = poiLW(), LH = poiLH();
    var sectLayers = (P.regions || []).map(function (r) {
      var s = poiSect(r.k);
      return '<div class="poi-sect" data-k="' + esc(r.k) +
        '" style="left:' + (s.x0 + s.dx).toFixed(1) + 'px;top:' + (s.y0 + s.dy).toFixed(1) +
        'px;width:' + s.w.toFixed(1) + 'px;height:' + s.h.toFixed(1) + 'px">' +
        '<div class="poi-tiles" id="poi-tiles-' + esc(r.k) + '" data-sect="' + esc(r.k) + '"></div>' +
        '</div>';
    }).join('');

    host.innerHTML =
      '<div class="poi-stage" id="poi-stage" style="width:' + LW + 'px;height:' + LH +
        'px;--inv:1;--lab:210">' +
        '<div class="poi-sects">' + sectLayers + '</div>' +
        '<svg class="poi-svg" id="poi-svg" viewBox="0 0 ' + LW + ' ' + LH + '" ' +
          'width="' + LW + '" height="' + LH + '" preserveAspectRatio="none" ' +
          'role="img" aria-label="最古老屋互动地图，' + P.locs.length + ' 个登记点位">' +
          '<g class="poi-regs">' + regions + '</g>' +
          '<g class="poi-dots">' + dots + '</g>' +
        '</svg>' +
      '</div>';
    renderPoiFilters();
    poiFit();
  }

  function renderPoiFilters() {
    var host = $('#poi-filters');
    if (!host) return;
    var P = w.FBC_POIS || {};
    var cats = P.cats || {};
    var order = Object.keys(cats).filter(function (k) { return cats[k]; });
    order.sort(function (a, b) { return (cats[b] || 0) - (cats[a] || 0); });

    var buckets = {};
    order.forEach(function (k) {
      var g = POI_GROUP[k] || '其他';
      (buckets[g] = buckets[g] || []).push(k);
    });

    host.innerHTML = Object.keys(buckets).map(function (g) {
      return '<div class="poi-bkt"><div class="poi-bkt-hd">' + esc(g) + '</div>' +
        buckets[g].map(function (k) {
          var cfg = k === 'AREA' ? POI_AREA_ROW : (POI_PIN[k] || { c: '#d9d4c7', cn: k });
          var on = !!poiState.on[k];
          return '<label class="poi-f' + (on ? '' : ' is-off') + '" data-cat="' + esc(k) + '">' +
            '<input type="checkbox"' + (on ? ' checked' : '') + ' tabindex="0">' +
            '<i class="poi-sw" style="--c:' + cfg.c + '"></i>' +
            '<span class="poi-fn">' + esc(cfg.cn || k) + '</span>' +
            '<b class="poi-fc">' + (cats[k] || 0) + '</b>' +
            '</label>';
        }).join('') + '</div>';
    }).join('');

    poiCount();
  }

  function poiCount() {
    var cats = (w.FBC_POIS || {}).cats || {};
    var shown = 0, total = 0;
    Object.keys(cats).forEach(function (k) {
      total += cats[k];
      if (poiState.on[k]) shown += cats[k];
    });
    var el = $('#poi-count');
    if (el) el.textContent = shown + ' / ' + total + ' 个点位';
  }

  function poiToggleCat(k, v) {
    poiState.on[k] = v;
    var f = document.querySelector('#poi-filters .poi-f[data-cat="' + k + '"]');
    if (f) {
      f.classList.toggle('is-off', !v);
      var cb = f.querySelector('input');
      if (cb) cb.checked = v;
    }
    poiSyncLayers();
    poiCount();
  }

  function poiAll(v) {
    POI_ALL_CATS.forEach(function (k) { poiState.on[k] = v; });
    renderPoiFilters();
    poiSyncLayers();
  }

  /* ---- 缩放与平移 ---- */

  /* translate3d 而不是 translate：前者会被提升到 GPU 合成层，
     拖拽时只改变换矩阵，不重绘 1024 个图钉和整张瓦片图层。 */
  function poiTransform() {
    return 'translate3d(' + poiState.px.toFixed(1) + 'px,' + poiState.py.toFixed(1) +
           'px,0) scale(' + poiState.zoom.toFixed(4) + ')';
  }

  /* 初始视图：整张图恰好放进容器 */
  function poiFit() {
    var st = $('#poi-canvas');
    if (!st) return;
    var w = st.clientWidth, h = st.clientHeight;
    if (!w || !h) return;
    var k = Math.min(w / poiLW(), h / poiLH());
    poiState.zoom = k;
    poiState.px = (w - poiLW() * k) / 2;
    poiState.py = (h - poiLH() * k) / 2;
    poiState.vb = null;
    poiApply();
  }

  /* 图层显隐统一在这里算：
     - 各类别按筛选勾选状态
     - 区域文字额外要求放大到 1.6 倍以上，避免初始视图糊成一片 */
  var POI_LABEL_MIN_K = 1.6;

  function poiSyncLayers() {
    var k = poiState.zoom / poiBase();
    var gs = document.querySelectorAll('#poi-canvas .poi-g');
    for (var i = 0; i < gs.length; i++) {
      var cat = gs[i].getAttribute('data-cat');
      var on = !!poiState.on[cat];
      if (cat === 'AREA') on = on && k >= POI_LABEL_MIN_K;
      gs[i].style.display = on ? '' : 'none';
    }
    var hint = $('#poi-lbl-hint');
    if (hint) hint.style.display = (poiState.on['AREA'] && k < POI_LABEL_MIN_K) ? '' : 'none';
  }

  var poiRaf = 0;

  /* 一帧最多应用一次：pointermove 频率可到 200Hz，没必要每次都写样式 */
  function poiApply() {
    if (poiRaf) return;
    poiRaf = requestAnimationFrame(function () {
      poiRaf = 0;
      poiApplyNow();
    });
  }

  function poiApplyNow() {
    var stage = $('#poi-stage');
    if (stage) {
      stage.style.transform = poiTransform();
      /* 图钉与文字都保持屏幕恒定大小：用 1/zoom 抵消 stage 的绝对缩放。
         只在缩放真的变化时写这两个变量 —— 平移时跳过，
         否则每帧都会让 1024 个 SVG 元素重算尺寸。 */
      if (poiState.sized !== poiState.zoom) {
        poiState.sized = poiState.zoom;
        stage.style.setProperty('--inv', (1 / poiState.zoom).toFixed(5));
        stage.style.setProperty('--lab', (10.5 / poiState.zoom).toFixed(2));
      }
    }
    var lv = $('#poi-zoom-lv');
    if (lv) lv.textContent = Math.round(poiState.zoom / poiBase() * 100) + '%';
    poiSyncLayers();
    poiTiles();
  }

  /* 当前 scale 应该用哪一级瓦片。
     判据是「瓦片在屏幕上是否被放大」：瓦片渲染尺寸 = 256 * 2^(14-z) * zoom，
     希望它 ≤ 256，所以 z ≥ 14 + log2(zoom)。向上取整，宁可缩小也不放大。 */
  function poiPickZ() {
    var eff = POI_ZBASE + Math.log(poiState.zoom) / Math.LN2;
    return Math.max(POI_ZMIN, Math.min(POI_ZMAX, Math.ceil(eff)));
  }

  /* 已加载的瓦片缓存：key 为 "扇区|z/x/y"。
     同一个 tile 可能同时落在两个扇区的包围盒里，因此每个扇区各持一份 DOM；
     src 相同，浏览器只下载一次。 */
  var poiTileCache = Object.create(null);

  /* 按扇区挑瓦片：每块只需自己包围盒范围内的瓦片，板块之外的空白瓦片不再请求。 */
  function poiTiles() {
    var st = $('#poi-canvas');
    if (!st || !poiLayout) return;

    var z = poiPickZ();
    var w = st.clientWidth, h = st.clientHeight;
    var vis = {
      x0: (-poiState.px) / poiState.zoom,
      y0: (-poiState.py) / poiState.zoom,
      x1: (w - poiState.px) / poiState.zoom,
      y1: (h - poiState.py) / poiState.zoom
    };

    if (poiState.z === z && poiState.vb) {
      var b = poiState.vb;
      if (vis.x0 > b.x0 && vis.y0 > b.y0 && vis.x1 < b.x1 && vis.y1 < b.y1) return;
    }

    var pad = Math.max(vis.x1 - vis.x0, vis.y1 - vis.y0) * 0.6;
    var need = { x0: vis.x0 - pad, y0: vis.y0 - pad, x1: vis.x1 + pad, y1: vis.y1 + pad };

    var f = Math.pow(2, POI_ZBASE - z);
    var tb = poiTilesOf(z);
    var ox = POI_TB.x0 * POI_TS, oy = POI_TB.y0 * POI_TS;
    var lw = POI_TS * f;

    var want = Object.create(null);

    Object.keys(poiLayout.sects).forEach(function (name) {
      var s = poiLayout.sects[name];
      var box = $('#poi-tiles-' + name);
      if (!box) return;

      /* 该扇区在舞台坐标系里的位置（已含紧凑偏移），与可见区不相交就整块跳过 */
      var sx = s.x0 + s.dx, sy = s.y0 + s.dy;
      if (sx + s.w < need.x0 || sx > need.x1 || sy + s.h < need.y0 || sy > need.y1) return;

      var frag = document.createDocumentFragment();
      for (var ty = tb.y0; ty <= tb.y1; ty++) {
        for (var tx = tb.x0; tx <= tb.x1; tx++) {
          var px = tx * POI_TS * f - ox;   /* 瓦片左上角（原始舞台坐标） */
          var py = ty * POI_TS * f - oy;
          /* 只要与该扇区包围盒相交的瓦片，其余空白瓦片直接丢弃 */
          if (px + lw < s.x0 || px > s.x1) continue;
          if (py + lw < s.y0 || py > s.y1) continue;

          var key = name + '|' + z + '/' + tx + '/' + ty;
          want[key] = 1;
          var el = poiTileCache[key];
          if (!el) {
            el = document.createElement('img');
            el.className = 'poi-tile';
            el.alt = '';
            el.draggable = false;
            /* 瓦片缺失时用同尺寸深灰占位，避免地图出现破图/空洞 */
            el.onerror = function () {
              this.onerror = null;
              this.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(
                '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">' +
                '<rect width="256" height="256" fill="#1c1c22"/></svg>');
            };
            el.src = 'assets/tiles/' + z + '/' + tx + '/' + ty + '.webp';
            poiTileCache[key] = el;
          }
          el.style.left = (px - s.x0).toFixed(0) + 'px';
          el.style.top = (py - s.y0).toFixed(0) + 'px';
          el.style.width = (lw + 1) + 'px';
          el.style.height = (lw + 1) + 'px';
          if (!el.parentNode) frag.appendChild(el);
        }
      }
      box.appendChild(frag);
    });

    /* 这一层用不到的瓦片从 DOM 摘掉，但留在缓存里 ——
       切回来时可以直接挂回去，不重新走网络，也就不会黑屏。 */
    Object.keys(poiTileCache).forEach(function (k) {
      if (!want[k]) {
        var old = poiTileCache[k];
        if (old && old.parentNode) old.parentNode.removeChild(old);
      }
    });

    poiState.z = z;
    poiState.vb = need;
  }

  /* 把地图定位到某个区域：放大并居中，供档案里的「在地图上定位」调用 */
  function locateOnMap(cnName) {
    var P = w.FBC_POIS || {};
    var hit = null;
    (P.locs || []).forEach(function (l) {
      if (hit || l[2] !== 'AREA') return;
      var cn = (typeof POI_AREA_CN !== 'undefined' && POI_AREA_CN[l[3]]) || l[3];
      if (cn === cnName) hit = l;
    });
    var st = $('#poi-canvas');
    if (!hit || !st) return false;

    /* 紧凑布局后，区域坐标要带上所属扇区的偏移 */
    var off = poiSect(hit[4]);
    var tx = poiX(hit[0]) + off.dx, ty = poiY(hit[1]) + off.dy;
    poiState.zoom = poiBase() * 6;
    poiState.px = st.clientWidth / 2 - tx * poiState.zoom;
    poiState.py = st.clientHeight / 2 - ty * poiState.zoom;
    poiState.vb = null;               /* 强制重算可见瓦片 */
    poiApplyNow();
    return true;
  }

  /* 完全自由拖动：不设边界，也不在图比容器小时强行居中。
     否则初始视图下（整图小于容器）拖拽会被立刻抵消，看起来像"拖不动"。
     想回到初始位置按复位键。 */
  function poiClamp() { /* 无边地图：不做任何位置约束 */ }

  /* 以「整图刚好放进容器」的倍率为 1，缩放范围 1x–24x */
  function poiBase() {
    var st = $('#poi-canvas');
    if (!st) return 0.01;
    return Math.min(st.clientWidth / poiLW(), st.clientHeight / poiLH()) || 0.01;
  }

  function poiZoomAt(f, cx, cy) {
    var st = $('#poi-canvas');
    if (!st) return poiState.zoom;
    var r = st.getBoundingClientRect();
    var ox = (cx == null ? r.width / 2 : cx - r.left);
    var oy = (cy == null ? r.height / 2 : cy - r.top);
    var base = poiBase();
    var z0 = poiState.zoom;
    var z1 = Math.max(base, Math.min(base * 24, z0 * f));
    var k = z1 / z0;
    poiState.px = ox - (ox - poiState.px) * k;
    poiState.py = oy - (oy - poiState.py) * k;
    poiState.zoom = z1;
    poiClamp(); poiApply();
    return z1;
  }

  function poiPan(dx, dy) {
    poiState.px += dx; poiState.py += dy;
    poiClamp(); poiApply();
  }

  /* 复位 = 回到「整图可见」的初始视图 */
  function poiReset() {
    poiFit();
    return poiState.zoom;
  }

  function poiZoom() { return poiState.zoom; }

  function floorInfo(i) {
    var floors = (D.house && D.house.floors) || [];
    var f = floors[i];
    if (!f) return '';
    var tags = (f.tags || []).map(function (t) {
      return '<span class="tag' + (t.red ? ' is-red' : t.yellow ? ' is-yellow' : '') + '">' + esc(t.t || t) + '</span>';
    }).join('');
    return '<div class="sub">' + esc(f.lv) + ' · ' + esc(f.en || '') + '</div>' +
           '<h3>' + esc(f.name) + '</h3>' +
           '<div style="display:flex;gap:.4rem;flex-wrap:wrap;margin:.2rem 0 .3rem">' + tags + '</div>' +
           '<p>' + rich(f.desc) + '</p>' +
           (f.kv && f.kv.length ? '<dl class="kv-stack">' + f.kv.map(function (r) {
             return '<div class="kv-row"><dt>' + esc(r[0]) + '</dt><dd>' + rich(r[1]) + '</dd></div>';
           }).join('') + '</dl>' : '') +
           sectorRosterHTML(f.name) +
           '<button class="dos-open" type="button" data-dos="floor" data-key="' + esc(f.name) + '">扇区完整登记 ▸</button>';
  }

  function renderHiss() {
    var h = D.hiss || {};
    setHTML('#chant', (h.chant || []).map(function (line) {
      var cn = line[0], en = line[1] || '';
      return '<li' + (en ? ' title="' + esc(en) + '"' : '') + '>' + rich(cn) + '</li>';
    }).join(''));

    setHTML('#hiss-about', (h.about || []).map(function (blk) {
      return (blk.h ? '<h3 style="margin:1.8rem 0 .7rem">' + esc(blk.h) + '</h3>' : '') +
             richLines(blk.p);
    }).join(''));

    var tags = (h.tags || []).map(function (t) {
      return '<span class="tag is-red">' + esc(t) + '</span>';
    }).join('');
    if (tags) setHTML('#hiss-about', $('#hiss-about').innerHTML + '<div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:1.4rem">' + tags + '</div>');
  }

  /* ------------------------------------------------------- 05 董事会 */

  function renderBoard() {
    var b = D.board || {};
    setHTML('#board-feed', '<span class="cursor"></span>');
    if (b.note) {
      var p = $('.board-console').parentNode.querySelector('.tiny.faint');
      if (p) p.innerHTML = rich(b.note);
    }
  }

  /* ------------------------------------------------------- 06 部门 */

  /* 名册 = 基础名册 + depts-extra.js 的扩充条目（未加载时缺省为空） */
  function allDepts() {
    return (D.departments || []).concat(w.FBC_DEPTS_EXTRA || []);
  }

  function allItems() {
    return (D.items || []).concat(w.FBC_ITEMS_EXTRA || []);
  }

  function allGloss() {
    return (D.glossary || []).concat(w.FBC_GLOSSARY_EXTRA || []);
  }

  /* 地图上的区域（AREA 类）——每个都是一份可调阅的地点档案 */
  function areaRecs() {
    var P = w.FBC_POIS || {};
    var out = [];
    var seen = {};
    (P.locs || []).forEach(function (l) {
      if (l[2] !== 'AREA') return;
      var cn = (typeof POI_AREA_CN !== 'undefined' && POI_AREA_CN[l[3]]) || l[3];
      if (seen[cn]) return;
      seen[cn] = 1;
      out.push({ cn: cn, en: l[3], sect: (typeof POI_REG_CN !== 'undefined' && POI_REG_CN[l[4]]) || l[4] });
    });
    return out;
  }

  function deptCard(d, i) {
    var kv = (d.kv || []).map(function (r) {
      return '<dt>' + esc(r[0]) + '</dt><dd>' + rich(r[1]) + '</dd>';
    }).join('');
    return '<div class="dept" data-i="' + i + '" role="button" tabindex="0" aria-expanded="false">' +
           '<span class="toggle">＋</span>' +
           '<span class="no">' + esc(d.no) + '</span>' +
           '<span class="nm">' + esc(d.name) + '</span>' +
           '<span class="en">' + esc(d.en) + '</span>' +
           '<span class="sum">' + rich(d.summary) + '</span>' +
           '<span class="meta">' +
           '<button class="dos-open" type="button" data-dos="dept" data-key="' + esc(d.no) + '">完整档案 ▸</button>' +
           (d.head ? '<span class="tag is-head">' + rich(d.head) + '</span>' : '') +
           (d.tags || []).map(function (t) {
             return '<span class="tag' + (t.red ? ' is-red' : t.yellow ? ' is-yellow' : '') + '">' + esc(t.t || t) + '</span>';
           }).join('') + '</span>' +
           /* 详情放 template 里：不参与布局与绘制，点击展开时才注入 */
           '<template class="more-tpl">' + richLines(d.detail) +
           (kv ? '<dl class="kv">' + kv + '</dl>' : '') + '</template>' +
           '<div class="more"></div>' +
           '</div>';
  }

  /* 编制按扇区分组，和地图 / 02 卷的结构一致 */
  function renderDepts() {
    var sectors = (D.house && D.house.sectors) || [];
    var all = allDepts();
    var idx = {};
    all.forEach(function (d, i) { idx[d.no] = i; });

    if (!sectors.length) {
      setHTML('#dept-grid', all.map(function (d, i) { return deptCard(d, i); }).join(''));
      return;
    }

    var used = {};
    var html = sectors.map(function (S) {
      var list = deptsInSector(S.key);
      list.forEach(function (d) { used[d.no] = 1; });
      return '<div class="fgroup' + (S.external ? ' is-external' : '') + '">' +
        '<div class="fgroup-hd">' +
          '<b>' + esc(S.key) + '</b><i>' + esc(S.en || '') + '</i>' +
          '<span class="fgroup-n mono">' + list.length + ' 个部门</span>' +
        '</div>' +
        (list.length
          ? '<div class="dept-group">' + list.map(function (d) { return deptCard(d, idx[d.no]); }).join('') + '</div>'
          : '<div class="dept-empty">本扇区未登记独立编制机构</div>') +
        '</div>';
    }).join('');

    /* 不编入任何扇区的（机动部门）单独成组 */
    var rest = all.filter(function (d) { return !used[d.no]; });
    if (rest.length) {
      html += '<div class="fgroup is-external">' +
        '<div class="fgroup-hd">' +
          '<b>不编入扇区</b><i>UNASSIGNED</i>' +
          '<span class="fgroup-n mono">' + rest.length + ' 个部门</span>' +
        '</div>' +
        '<div class="dept-group">' +
          rest.map(function (d) { return deptCard(d, idx[d.no]); }).join('') +
        '</div>' +
        '</div>';
    }

    setHTML('#dept-grid', html);
  }

  /* ------------------------------------------------------- 07 异化物 */

  var itemFilter = 'ALL';

  function renderItems() {
    var kinds = [{ k: 'ALL', t: '全部藏品' }, { k: 'OOP', t: '力量之物 OOP' }, { k: 'AI', t: '异化物 AI' }];
    setHTML('#item-filters', kinds.map(function (x) {
      return '<button class="chip" data-kind="' + x.k + '" aria-pressed="' + (itemFilter === x.k) + '">' + esc(x.t) + '</button>';
    }).join('') + '<span class="tiny faint" style="margin-left:auto;font-family:var(--font-mono)">点击行展开收容记录</span>');

    var list = allItems().filter(function (it) { return itemFilter === 'ALL' || it.kind === itemFilter; });
    setHTML('#item-rows', list.map(function (it, i) {
      return '<tr data-i="' + i + '">' +
             '<td>' + rich(it.no) + '</td>' +
             '<td class="nm">' + esc(it.name) + '<small>' + esc(it.en || '') + '</small>' +
             (it.date ? '<span class="dt">取得 ' + rich(it.date) + '</span>' : '') +
             '<button class="dos-open" type="button" data-dos="item" data-key="' + esc(it.no) + '">完整案卷 ▸</button></td>' +
             '<td>' + rich(it.place) + '</td>' +
             '<td>' + rich(it.effect) + '</td>' +
             '</tr>' +
             '<tr class="detail-row"><td colspan="4"><div>' + richLines(it.detail) + '</div></td></tr>';
    }).join(''));
  }

  /* ------------------------------------------------------- 08 AWE */

  function renderAwe() {
    setHTML('#awe-list', (D.awe || []).map(function (a, i) {
      return '<div class="tl-item" data-i="' + i + '">' +
             '<div class="yr">' + rich(a.year) + ' · ' + rich(a.code) + '</div>' +
             '<div class="hd">' + esc(a.title) + '</div>' +
             '<div class="bd">' + rich(a.brief) + '</div>' +
             '<div class="tl-actions">' +
             '<button class="tl-toggle" type="button">摘要 ▾</button>' +
             '<button class="dos-open" type="button" data-dos="awe" data-key="' + esc(a.code) + '">完整报告 ▸</button>' +
             '</div>' +
             '<div class="xt"><div class="inner">' + richLines(a.detail) + '</div></div>' +
             '</div>';
    }).join(''));
  }

  /* ------------------------------------------------------- 09 人员 */

  function renderCast() {
    setHTML('#cast-grid', (D.cast || []).map(function (c) {
      var st = c.status || 'live';
      var stTxt = { live: '在职', dead: '已殉职', unknown: '下落不明', hiss: '已感染' }[st] || st;
      return '<div class="cast">' +
             '<span class="status ' + esc(st) + '">' + esc(stTxt) + '</span>' +
             '<span class="init">' + esc(c.init) + '</span>' +
             '<span class="nm">' + esc(c.name) + '</span>' +
             '<span class="role">' + esc(c.role) + '</span>' +
             '<span class="bio">' + rich(c.bio) + '</span>' +
             (c.quote ? '<span class="quote">' + rich(c.quote) + '</span>' : '') +
             '<button class="dos-open" type="button" data-dos="cast" data-key="' + esc(c.name) + '">完整人事档案 ▸</button>' +
             '</div>';
    }).join(''));
  }

  /* ------------------------------------------------------- 10 文件 */

  function renderDocs() {
    setHTML('#doc-grid', (D.docs || []).map(function (d) {
      var meta = (d.meta || []).map(function (r) {
        return '<span class="f"><b>' + esc(r[0]) + '</b>' + esc(r[1]) + '</span>';
      }).join('');
      return '<article class="doc-card" style="margin-bottom:1.6rem">' +
             (d.stamp ? '<div class="stamp">' + esc(d.stamp) + '</div>' : '') +
             '<div class="doc-head"><span class="t">' + esc(d.title) + '</span>' + meta + '</div>' +
             richLines(d.body) +
             '</article>';
    }).join(''));
  }

  /* ------------------------------------------------------- 11 词典 */

  function renderGloss(q) {
    q = (q || '').trim().toLowerCase();
    var all = allGloss();
    var hit = all.filter(function (g) {
      if (!q) return true;
      return (g.term + g.en + g.cat + g.desc).toLowerCase().indexOf(q) > -1;
    });

    setHTML('#gloss-count', hit.length + ' / ' + all.length);

    if (!hit.length) {
      setHTML('#gloss-grid', '<div class="gloss-empty">未找到匹配词条 · 请更换检索词或咨询你的部门主管</div>');
      return;
    }

    var bag = w.FBC_DOSSIER_GLOSS || {};
    setHTML('#gloss-grid', hit.map(function (g) {
      var has = !!bag[g.term];
      return '<div class="gloss-item' + (has ? ' is-deep' : '') + '" data-key="' + esc(g.term) + '">' +
             '<div class="t"><b>' + esc(g.term) + '</b><span>' + esc(g.cat) + '</span></div>' +
             '<p class="mono tiny faint" style="margin-bottom:.3rem">' + esc(g.en) + '</p>' +
             '<p>' + rich(markHits(g.desc, q)) + '</p>' +
             (has ? '<button class="dos-open gloss-open" type="button" data-dos="gloss" data-key="' +
               esc(g.term) + '">词条档案 ▸</button>' : '') +
             '</div>';
    }).join(''));
  }

  /* ------------------------------------------------------- 15 幕后 */

  function renderTrivia() {
    setHTML('#trivia-grid', (D.trivia || []).map(function (t) {
      return '<article class="triv">' +
             '<div class="src">' + esc(t.src) + '</div>' +
             '<h3>' + esc(t.h) + '</h3>' +
             richLines(t.p) +
             '</article>';
    }).join(''));
  }

  /* ------------------------------------------------------- 12 年表 */

  var tlState = { kind: 'ALL' };

  var TL_KIND = {
    bureau: '机构',
    awe:    '事件',
    item:   '物品',
    person: '人事',
    event:  '其他',
    hiss:   '嘶鸣'
  };

  function timelineData() {
    return (w.FBC_TIMELINE || []).slice().sort(function (a, b) {
      return (a.year - b.year) || String(a.md || '').localeCompare(String(b.md || ''));
    });
  }

  function renderTimeline() {
    var host = $('#tl-list');
    if (!host) return;
    var all = timelineData();
    if (!all.length) {
      host.innerHTML = '<div class="gloss-empty">编年数据未加载 · 请联系档案部。</div>';
      return;
    }

    /* 图例兼筛选 */
    setHTML('#tl-legend',
      '<button class="chip" type="button" data-k="ALL" aria-pressed="' + (tlState.kind === 'ALL') + '">全部</button>' +
      Object.keys(TL_KIND).map(function (k) {
        return '<button class="chip tl-k tl-k-' + k + '" type="button" data-k="' + k +
          '" aria-pressed="' + (tlState.kind === k) + '">' + esc(TL_KIND[k]) + '</button>';
      }).join(''));

    var list = all.filter(function (e) { return tlState.kind === 'ALL' || e.kind === tlState.kind; });
    setHTML('#tl-count', list.length + ' / ' + all.length + ' 条');

    /* 顶部刻度：按十年分格，有点的才可跳 */
    var ticks = [];
    for (var yy = 1940; yy < 2030; yy += 10) ticks.push(yy);
    setHTML('#tl-rail', ticks.map(function (d) {
      var has = list.some(function (e) { return e.year >= d && e.year < d + 10; });
      return '<button class="tl-tick' + (has ? '' : ' is-empty') + '" type="button" data-y="' + d +
        '"' + (has ? '' : ' disabled') + ' aria-label="跳到 ' + d + ' 年代">' +
        '<b>' + d + '</b><i></i></button>';
    }).join(''));

    /* 纵向条目：按年份分组 */
    var groups = [], cur = null;
    list.forEach(function (e) {
      if (!cur || cur.year !== e.year) { cur = { year: e.year, items: [] }; groups.push(cur); }
      cur.items.push(e);
    });

    host.innerHTML = groups.map(function (g) {
      return '<div class="tl-group" data-year="' + g.year + '">' +
        '<div class="tl-y"><b>' + g.year + '</b></div>' +
        '<div class="tl-ev">' + g.items.map(function (e) {
          var link = e.link
            ? '<button class="dos-open tl-link" type="button" data-dos="floor" data-key="' +
              esc(e.link) + '">' + esc(e.link) + ' ▸</button>'
            : '';
          return '<article class="tl-e tl-e-' + esc(e.kind || 'event') + '">' +
            '<div class="tl-e-hd">' +
              '<span class="tl-e-k">' + esc(TL_KIND[e.kind] || TL_KIND.event) + '</span>' +
              '<b>' + esc(e.t) + '</b>' +
              (e.md && e.md !== '00-00' ? '<span class="tl-e-d mono">' + esc(e.md) + '</span>' : '') +
            '</div>' +
            '<p>' + rich(e.p) + '</p>' + link +
            '</article>';
        }).join('') + '</div></div>';
    }).join('');

    if (!list.length) host.innerHTML = '<div class="gloss-empty">该类型下暂无条目。</div>';
  }

  /* ------------------------------------------------------- 13 案卷 */

  var caseState = { kind: 'ALL' };

  var CASE_KIND = {
    AWE:      '异世界事件',
    AI:       '异化物',
    OOP:      '力量之物',
    INTERNAL: '内部事故',
    INFIL:    '渗透'
  };

  function caseData() {
    return (w.FBC_CASES || []).slice().sort(function (a, b) {
      return String(a.date || '').localeCompare(String(b.date || ''));
    });
  }

  function renderCases() {
    var host = $('#cases-grid');
    if (!host) return;
    var all = caseData();
    if (!all.length) {
      host.innerHTML = '<div class="gloss-empty">案卷未加载 · 调查扇区未响应。</div>';
      return;
    }

    setHTML('#cases-bar',
      '<button class="chip" type="button" data-k="ALL" aria-pressed="' + (caseState.kind === 'ALL') +
        '">全部 ' + all.length + '</button>' +
      Object.keys(CASE_KIND).map(function (k) {
        var n = all.filter(function (c) { return c.kind === k; }).length;
        if (!n) return '';
        return '<button class="chip" type="button" data-k="' + k + '" aria-pressed="' +
          (caseState.kind === k) + '">' + esc(CASE_KIND[k]) + ' ' + n + '</button>';
      }).join(''));

    var list = all.filter(function (c) { return caseState.kind === 'ALL' || c.kind === caseState.kind; });
    host.innerHTML = list.map(function (c) {
      return '<article class="case-card' + (c.kind === 'INFIL' ? ' is-infil' : '') + '">' +
        '<div class="case-top">' +
          '<span class="case-id mono">' + esc(c.id) + '</span>' +
          '<span class="case-date mono">' + esc(c.date) + '</span>' +
          '<span class="case-k">' + esc(CASE_KIND[c.kind] || c.kind) + '</span>' +
        '</div>' +
        '<h3>' + esc(c.title) + '</h3>' +
        '<div class="case-loc mono">' + esc(c.loc) + '</div>' +
        '<p>' + rich(c.summary) + '</p>' +
        '<div class="case-foot">' +
          '<span class="case-threat">威胁 ' + esc(c.threat) + '</span>' +
          '<span class="case-status">' + esc(c.status) + '</span>' +
          '<button class="dos-open" type="button" data-dos="case" data-key="' + esc(c.id) + '">卷宗 ▸</button>' +
        '</div>' +
        '</article>';
    }).join('');
  }

  /* ------------------------------------------------------- 14 通讯 */

  var COMMS_KIND = {
    radio:     { t: '电台',   i: '◉' },
    memo:      { t: '备忘录', i: '▤' },
    notice:    { t: '公告',   i: '!' },
    letter:    { t: '信件',   i: '✉' },
    broadcast: { t: '广播',   i: '⌁' }
  };

  function commsData() {
    return (w.FBC_COMMS || []).slice().sort(function (a, b) {
      return String(b.date || '').localeCompare(String(a.date || ''));
    });
  }

  function renderComms() {
    var host = $('#comms-stream');
    if (!host) return;
    var all = commsData();
    if (!all.length) {
      host.innerHTML = '<div class="gloss-empty">内部通讯未加载 · 信道静默。</div>';
      return;
    }
    host.innerHTML = all.map(function (c) {
      var K = COMMS_KIND[c.kind] || COMMS_KIND.memo;
      return '<article class="comm comm-' + esc(c.kind) + '">' +
        '<div class="comm-hd">' +
          '<span class="comm-ic" aria-hidden="true">' + K.i + '</span>' +
          '<span class="comm-k">' + esc(K.t) + '</span>' +
          (c.id ? '<span class="comm-id mono">' + esc(c.id) + '</span>' : '') +
          '<span class="comm-date mono">' + esc(c.date) + '</span>' +
        '</div>' +
        '<h3>' + esc(c.t) + '</h3>' +
        ((c.from || c.to) ? '<div class="comm-route mono">' +
          (c.from ? '<span>' + esc(c.from) + '</span>' : '') +
          (c.to ? '<i>→</i><span>' + esc(c.to) + '</span>' : '') + '</div>' : '') +
        (c.lead ? '<p class="comm-lead">' + rich(c.lead) + '</p>' : '') +
        '<div class="comm-body">' +
          (c.body || []).map(function (p) { return '<p>' + rich(p) + '</p>'; }).join('') + '</div>' +
        (c.note ? '<p class="comm-note">' + rich(c.note) + '</p>' : '') +
        '</article>';
    }).join('');
  }

  function setTlKind(k) {
    tlState.kind = k || 'ALL';
    renderTimeline();
  }

  function setCaseKind(k) {
    caseState.kind = k || 'ALL';
    renderCases();
  }

  /* ------------------------------------------------------- 导航 */

  function renderNav() {
    var list = D.toc || [];
    var nav = list.map(function (t, i) {
      return '<a href="#' + t.id + '"><span class="n">' + String(i).padStart(2, '0') + '</span>' + esc(t.t) + '</a>';
    }).join('');
    setHTML('#hud-nav', nav);
    setHTML('#rail', list.map(function (t) {
      return '<a href="#' + t.id + '" data-target="' + t.id + '"><span>' + esc(t.t) + '</span></a>';
    }).join(''));
  }

  /* ==================================================================
     档案浮层 —— 二级（条目档案）/ 三级（附件全文）
     ================================================================== */

  var VOL = {
    dept: { label: '编制',     name: '部门档案' },
    item: { label: '藏品',     name: '收容档案' },
    awe:  { label: '编年',     name: '事件调查报告' },
    cast: { label: '人事',     name: '人事档案' },
    floor:{ label: '最古老屋', name: '扇区登记' },
    gloss:{ label: '词典',     name: '词条档案' },
    case: { label: '案卷',     name: '调查卷宗' },
    area: { label: '地点',     name: '地点档案' }
  };

  /* 部门档案分两批加载：基础名册（D-01…D-21）+ 扩充名册（D-22…），合并后统一查询 */
  function deptDossiers() {
    var base = w.FBC_DOSSIER_DEPT || {};
    var extra = w.FBC_DOSSIER_DEPT_EXTRA || {};
    var out = {}, k;
    for (k in base) { if (Object.prototype.hasOwnProperty.call(base, k)) out[k] = base[k]; }
    for (k in extra) { if (Object.prototype.hasOwnProperty.call(extra, k)) out[k] = extra[k]; }
    return out;
  }

  var DOS_SRC = {
    dept: deptDossiers,
    item: function () { return w.FBC_DOSSIER_ITEM || {}; },
    awe:  function () { return w.FBC_DOSSIER_AWE  || {}; },
    cast: function () { return w.FBC_DOSSIER_CAST || {}; },
    floor:function () { return w.FBC_DOSSIER_FLOOR|| {}; },
    gloss:function () { return w.FBC_DOSSIER_GLOSS|| {}; },
    area: function () { return w.FBC_DOSSIER_AREA || {}; }
  };

  /* 条目主键：不同卷用不同字段 */
  function recKey(kind, rec) {
    if (kind === 'awe') return rec.code;
    if (kind === 'cast') return rec.name;
    if (kind === 'floor') return rec.name;
    if (kind === 'gloss') return rec.term;
    if (kind === 'case') return rec.id;
    if (kind === 'area') return rec.cn;
    return rec.no;
  }

  /* 没有专属档案时，用条目自身的字段拼一份，保证任何条目都点得开 */
  function fallbackDossier(kind, rec) {
    var secs = [], files = [];

    /* 案卷本身就是档案格式：正文、结论、签发、附件都自带 */
    if (kind === 'case') {
      secs = (rec.sections || []).slice();
      if (rec.result) secs.push({ h: '结论', p: [rec.result] });
      if (rec.signed) secs.push({ h: '签发', p: [rec.signed] });
      return { sections: secs, files: rec.files || [], lead: rec.summary || '' };
    }

    /* 地点档案：从地图数据里取名字与所属扇区 */
    if (kind === 'area') {
      secs.push({ h: '登记', p: ['所属扇区：<b>' + (rec.sect || '未登记') + '</b>。英文登记名：<b>' + (rec.en || '—') + '</b>。'] });
      return { sections: secs, files: [] };
    }

    /* 词典词条没有外部档案时，把释义与英文名拼成一份 */
    if (kind === 'gloss') {
      secs.push({ h: '释义', p: [rec.desc || ''] });
      if (rec.en) secs.push({ h: '对应术语', p: ['<b>' + rec.en + '</b>'] });
      return { sections: secs, files: [] };
    }

    if (kind === 'dept') {
      secs.push({ h: '职能概述', p: [rec.detail || rec.summary || ''] });
      if (rec.head) secs.push({ h: '主管', p: ['现任主管：<b>' + rec.head + '</b>。'] });
      if (rec.kv && rec.kv.length) {
        secs.push({ h: '在编情况', p: rec.kv.map(function (r) { return '<b>' + r[0] + '</b>：' + r[1]; }) });
      }
    } else if (kind === 'item') {
      secs.push({ h: '描述', p: [rec.detail || ''] });
      if (rec.date) secs.push({ h: '取得记录', p: ['取得日期：<b>' + rec.date + '</b>。'] });
    } else if (kind === 'awe') {
      secs.push({ h: '事件摘要', p: [rec.brief || ''] });
      if (rec.detail) secs.push({ h: '调查结论', p: [rec.detail] });
    } else if (kind === 'cast') {
      secs.push({ h: '履历', p: [rec.bio || ''] });
      if (rec.quote) secs.push({ h: '存档言论', p: ['“' + rec.quote + '”'] });
    } else {
      secs.push({ h: '登记信息', p: [rec.detail || rec.note || ''] });
    }
    return { sections: secs, files: files };
  }

  function dossierFor(kind, rec) {
    var key = recKey(kind, rec);
    var bag = DOS_SRC[kind] ? DOS_SRC[kind]() : {};
    var d = bag && bag[key];
    return { key: key, data: d || fallbackDossier(kind, rec), authored: !!d };
  }

  function dosMeta(kind, rec, d) {
    var rows = [], seen = {};
    function add(k, v) {
      if (!v || seen[k]) return;
      seen[k] = 1;
      rows.push('<dt>' + esc(k) + '</dt><dd>' + v + '</dd>');
    }
    add('档案编号', '<span class="mono">' + rich(recKey(kind, rec) || '—') + '</span>');
    add('分类', d.klass ? rich(d.klass) : null);
    if (kind === 'case') {
      add('案卷日期', rich(rec.date));
      add('发生地', rich(rec.loc));
      add('类型', esc(CASE_KIND[rec.kind] || rec.kind || ''));
      add('承办', rich(rec.assign));
      add('外勤', rich((rec.officers || []).join(' · ')));
      add('威胁等级', rich(rec.threat));
      add('状态', rich(rec.status));
      return '<dl>' + rows.join('') + '</dl>';
    }
    if (kind === 'gloss') {
      add('英文', '<span class="mono">' + esc(rec.en || '') + '</span>');
      add('词条分类', esc(rec.cat || ''));
      return '<dl>' + rows.join('') + '</dl>';
    }
    if (kind === 'area') {
      add('英文登记名', '<span class="mono">' + esc(rec.en || '') + '</span>');
      add('所属扇区', esc(rec.sect || '未登记'));
      return '<dl>' + rows.join('') + '</dl>';
    }
    if (kind === 'dept' && rec.head) add('现任主管', rich(rec.head));
    if (kind === 'cast' && rec.role) add('职务', rich(rec.role));
    if (kind === 'item' && rec.date) add('取得日期', rich(rec.date));
    if (kind === 'awe' && rec.year) add('发生年份', rich(rec.year));
    add('发生 / 收容地', d.site ? rich(d.site) : null);
    add('威胁等级', d.threat ? rich(d.threat) : null);
    add('状态', d.status ? rich(d.status) : (rec.status ? rich(rec.status) : null));
    if (rec.kv && rec.kv.length) {
      rec.kv.forEach(function (r) { add(r[0], rich(r[1])); });
    }
    return '<dl>' + rows.join('') + '</dl>';
  }

  function dosTags(kind, rec) {
    var tags = [];
    if (rec.tags && rec.tags.length) tags = tags.concat(rec.tags);
    if (kind === 'cast' && rec.status) tags.push(rec.status);
    if (kind === 'item' && rec.kind) tags.push(rec.kind);
    if (!tags.length) return '';
    /* tags 既可能是字符串，也可能是 { t, red, yellow } 对象（data.js / depts-extra.js），
       直接 rich() 对象会渲染成 [object Object]。 */
    return '<div class="taglist">' + tags.map(function (t) {
      var label = t, cls = 'tag';
      if (t && typeof t === 'object') {
        label = t.t || '';
        if (t.red) cls += ' is-red';
        if (t.yellow || t.y) cls += ' is-yellow';
      }
      if (!label) return '';
      return '<span class="' + cls + '">' + rich(label) + '</span>';
    }).join('') + '</div>';
  }

  function dosFiles(d) {
    if (!d.files || !d.files.length) return '';
    return '<div class="dos-files"><h3>附件 · ' + d.files.length + ' 件</h3>' +
      d.files.map(function (f, i) {
        return '<div class="dos-file" data-file="' + i + '">' +
          '<button type="button" aria-expanded="false">' +
            '<span class="ft">' + rich(f.t || ('附件 ' + (i + 1))) + '</span>' +
            (f.m ? '<span class="fm">' + esc(f.m) + '</span>' : '') +
            '<span class="fx" aria-hidden="true">+</span>' +
          '</button>' +
          '<div class="fb"><div class="fb-in">' +
            (f.body || []).map(function (t) { return '<p>' + rich(t) + '</p>'; }).join('') +
          '</div></div>' +
        '</div>';
      }).join('') + '</div>';
  }

  var dosReturnFocus = null;

  function openDossier(kind, rec) {
    if (!rec) return;
    var box = $('#dossier'), host = $('#dos-scroll'), crumb = $('#dos-crumb');
    if (!box || !host || !crumb) return;

    var got = dossierFor(kind, rec);
    var d = got.data;
    var vol = VOL[kind] || VOL.item;
    var title = rec.name || rec.title || recKey(kind, rec) || '未命名档案';
    var sub = rec.en || rec.init || rec.code || rec.id || '';

    crumb.innerHTML =
      '<span>档案终端</span><i>/</i><b>' + esc(vol.label) + '</b><i>/</i>' +
      '<span>' + esc(vol.name) + '</span><i>/</i>' +
      '<span style="color:inherit">' + esc(recKey(kind, rec) || '') + '</span>';

    var secs = (d.sections || []).map(function (s) {
      return '<section class="dos-sec"><h3>' + esc(s.h) + '</h3>' +
        (s.p || []).map(function (t) { return '<p>' + rich(t) + '</p>'; }).join('') +
        '</section>';
    }).join('');

    host.innerHTML =
      '<div class="dos-grid">' +
        '<aside class="dos-meta">' + dosMeta(kind, rec, d) + dosTags(kind, rec) +
          (kind === 'area'
            ? '<button class="dos-map-btn" type="button" data-locate="' + esc(recKey('area', rec)) +
              '">在地图上定位 ▸</button>'
            : '') +
        '</aside>' +
        '<div class="dos-main">' +
          '<div class="dos-kicker">' + esc(vol.label) + ' · ' + esc(vol.name) +
            (got.authored ? '' : ' · 摘要级') + '</div>' +
          '<h2 class="dos-title" id="dos-title">' + rich(title) + '</h2>' +
          (sub ? '<div class="dos-en">' + esc(sub) + '</div>' : '') +
          (d.merged ? '<div class="dos-merged">' + esc(d.merged) + '</div>' : '') +
          (d.lead ? '<p class="dos-lead">' + rich(d.lead) + '</p>' : '') +
          secs + dosFiles(d) +
        '</div>' +
      '</div>';

    dosReturnFocus = document.activeElement;
    box.classList.add('is-open');
    box.setAttribute('aria-hidden', 'false');
    host.scrollTop = 0;

    /* 锁背景滚动并补偿滚动条宽度，避免页面横向跳动 */
    var sbw = w.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (sbw > 0) document.body.style.paddingRight = sbw + 'px';

    var btn = $('#dos-close');
    if (btn) btn.focus();
    bindDossierTrap();

    /* 深链接：把当前档案写进地址栏，可分享、可刷新恢复 */
    if (w.FBCApp && w.FBCApp.setHash) w.FBCApp.setHash(kind, recKey(kind, rec));
  }

  /* 浮层焦点陷阱：aria-modal 打开时 Tab 不应逃到背景页面 */
  var dosTrapBound = false;
  function bindDossierTrap() {
    if (dosTrapBound) return;
    var box = $('#dossier');
    if (!box) return;
    dosTrapBound = true;
    box.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = box.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    });
  }

  function closeDossier() {
    var box = $('#dossier');
    if (!box || !box.classList.contains('is-open')) return false;
    box.classList.remove('is-open');
    box.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    if (dosReturnFocus && dosReturnFocus.focus) {
      try { dosReturnFocus.focus(); } catch (e) { /* noop */ }
    }
    if (w.FBCApp && w.FBCApp.clearHash) w.FBCApp.clearHash();
    return true;
  }

  function isDossierOpen() {
    var box = $('#dossier');
    return !!box && box.classList.contains('is-open');
  }

  /* ------------------------------------------------------- 总入口 */

  function renderAll() {
    renderNav();
    renderBriefStats();
    renderBureau();
    renderHouse();
    renderPoiMap();
    renderHiss();
    renderBoard();
    renderDepts();
    renderItems();
    renderAwe();
    renderCast();
    renderDocs();
    renderGloss('');
    renderTimeline();
    renderCases();
    renderComms();
    renderTrivia();
  }

  w.FBCRender = {
    renderAll: renderAll,
    renderGloss: renderGloss,
    renderItems: renderItems,
    floorInfo: floorInfo,
    allDepts: allDepts,
    renderPoiMap: renderPoiMap,
    poiToggleCat: poiToggleCat,
    poiAll: poiAll,
    poiZoomAt: poiZoomAt,
    poiPan: poiPan,
    poiReset: poiReset,
    poiZoom: poiZoom,
    renderTimeline: renderTimeline,
    renderCases: renderCases,
    renderComms: renderComms,
    setTlKind: setTlKind,
    setCaseKind: setCaseKind,
    timelineData: timelineData,
    caseData: caseData,
    commsData: commsData,
    allGloss: allGloss,
    allItems: allItems,
    areaRecs: areaRecs,
    locateOnMap: locateOnMap,
    rich: rich,
    esc: esc,
    $: $,
    $$: $$,
    setHTML: setHTML,
    setItemFilter: function (k) { itemFilter = k; },
    getItemFilter: function () { return itemFilter; },
    openDossier: openDossier,
    closeDossier: closeDossier,
    isDossierOpen: isDossierOpen,
    recKey: recKey,
    closeDossier: closeDossier,
    isDossierOpen: isDossierOpen,
    recKey: recKey
  };
})(window);
