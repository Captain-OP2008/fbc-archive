/* ==========================================================================
   FEDERAL BUREAU OF CONTROL — INTERNAL ARCHIVE
   app.js  ·  准入序列 / 交互控制 / 嘶鸣污染 / 音效 / 权限系统
   ========================================================================== */
(function (w, d) {
  'use strict';

  var R = w.FBCRender;
  var D = w.FBC || {};
  var $ = R.$, $$ = R.$$;

  var state = {
    clearance: 3,
    hiss: false,
    sound: false,
    booted: false,
    floorIdx: -1,
    syncing: false,
    pendingHash: false
  };

  /* =====================================================================
     音效引擎（WebAudio 合成，无外部资源）
     ===================================================================== */
  var Audio_ = {
    ctx: null,
    drone: null,
    droneGain: null,

    init: function () {
      if (this.ctx) return this.ctx;
      var AC = w.AudioContext || w.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      return this.ctx;
    },

    resume: function () {
      var c = this.init();
      if (c && c.state === 'suspended') c.resume();
    },

    /* 短促点击 */
    click: function (freq, dur, type, vol) {
      if (!state.sound) return;
      var c = this.init(); if (!c) return;
      var o = c.createOscillator(), g = c.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq || 420, c.currentTime);
      o.frequency.exponentialRampToValueAtTime((freq || 420) * .55, c.currentTime + (dur || .05));
      g.gain.setValueAtTime(vol == null ? .045 : vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + (dur || .05));
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + (dur || .05) + .01);
    },

    /* 打字机键击 */
    key: function () { this.click(1250 + Math.random() * 260, .022, 'square', .022); },

    /* 确认 / 否定音 */
    ok: function () { this.click(660, .09, 'triangle', .05); setTimeout(function () { Audio_.click(990, .11, 'triangle', .04); }, 70); },
    deny: function () { this.click(180, .16, 'sawtooth', .055); },

    /* 低频底噪（音效开关时启动） */
    startDrone: function () {
      if (!state.sound) return;
      var c = this.init(); if (!c || this.drone) return;
      var o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.value = 46;
      o2.type = 'sine'; o2.frequency.value = 69.3;
      g.gain.value = .0;
      g.gain.linearRampToValueAtTime(.028, c.currentTime + 1.6);
      o.connect(g); o2.connect(g); g.connect(c.destination);
      o.start(); o2.start();
      this.drone = [o, o2]; this.droneGain = g;
    },
    stopDrone: function () {
      if (!this.drone) return;
      var c = this.ctx, g = this.droneGain, nodes = this.drone;
      try {
        g.gain.linearRampToValueAtTime(.0001, c.currentTime + .5);
        nodes.forEach(function (n) { n.stop(c.currentTime + .6); });
      } catch (e) { /* noop */ }
      this.drone = null; this.droneGain = null;
    },

    /* 共振同步脉冲 */
    sweep: function () {
      if (!state.sound) return;
      var c = this.init(); if (!c) return;
      var o = c.createOscillator(), g = c.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(90, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(1400, c.currentTime + 1.1);
      g.gain.setValueAtTime(.0001, c.currentTime);
      g.gain.linearRampToValueAtTime(.05, c.currentTime + .12);
      g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + 1.2);
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + 1.25);
    },

    /* 嘶鸣共振音场：低通噪声 + 次低频锯齿 */
    hissNodes: null,
    hissGains: null,
    hissOn: function () {
      if (!state.sound) return;
      var c = this.init(); if (!c || this.hissNodes) return;
      var len = Math.floor(c.sampleRate * 2);
      var buf = c.createBuffer(1, len, c.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * .28;
      var src = c.createBufferSource();
      src.buffer = buf; src.loop = true;
      var lp = c.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 340;
      var g = c.createGain(); g.gain.value = .0001;
      g.gain.linearRampToValueAtTime(.055, c.currentTime + 1.3);
      src.connect(lp); lp.connect(g); g.connect(c.destination);
      src.start();

      var o = c.createOscillator(), og = c.createGain();
      o.type = 'sawtooth'; o.frequency.value = 41.2;
      og.gain.value = .0001;
      og.gain.linearRampToValueAtTime(.024, c.currentTime + 1.6);
      o.connect(og); og.connect(c.destination);
      o.start();

      this.hissNodes = [src, o]; this.hissGains = [g, og];
    },
    hissOff: function () {
      if (!this.hissNodes) return;
      var c = this.ctx, nodes = this.hissNodes, gains = this.hissGains;
      try {
        gains.forEach(function (g) { g.gain.linearRampToValueAtTime(.0001, c.currentTime + .7); });
        nodes.forEach(function (n) { n.stop(c.currentTime + .95); });
      } catch (e) { /* noop */ }
      this.hissNodes = null; this.hissGains = null;
    }
  };

  /* =====================================================================
     Toast
     ===================================================================== */
  var toastTimer = null;
  function toast(msg, ms) {
    var t = $('#toast');
    t.innerHTML = msg;
    t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-on'); }, ms || 3400);
  }

  /* =====================================================================
     打字机
     ===================================================================== */
  function typewrite(node, text, speed, onChar, done) {
    if (!node) return;
    node.textContent = '';
    node.classList.add('type-caret');
    var i = 0;
    var step = function () {
      if (i >= text.length) {
        node.classList.remove('type-caret');
        if (done) done();
        return;
      }
      var ch = text[i++];
      node.textContent += ch;
      if (ch.trim()) { if (onChar) onChar(); }
      var delay = speed || 24;
      if (/[。！？，、；：]/.test(ch)) delay = (speed || 24) * 6;
      else if (ch === '\n') delay = (speed || 24) * 3;
      setTimeout(step, delay);
    };
    step();
  }

  /* =====================================================================
     权限系统
     ===================================================================== */
  var CLR_NAMES = ['公开摘要', '一级 · 见习', '二级 · 研究员', '三级 · 部门主管', '局长权限'];

  function applyClearance(lv, silent) {
    state.clearance = lv;
    d.documentElement.style.setProperty('--clearance', lv);
    var n = 0;
    $$('.redact').forEach(function (el) {
      var need = parseInt(el.getAttribute('data-lv'), 10) || 1;
      var open = lv >= need;
      el.classList.toggle('is-open', open);
      if (open) n++;
    });
    $$('.clr-btn').forEach(function (b) {
      b.setAttribute('aria-pressed', String(parseInt(b.dataset.clr, 10) === lv));
    });
    var lbl = $('#clr-label');
    if (lbl) lbl.textContent = CLR_NAMES[lv] || lv;
    if (!silent) {
      Audio_.click(lv > 3 ? 880 : 520, .07, 'triangle', .04);
      toast('密级许可已调整 → <b style="color:var(--red)">' + (CLR_NAMES[lv] || lv) + '</b> · 已解译 ' + n + ' 处密文');
    }
  }

  /* =====================================================================
     嘶鸣污染
     ===================================================================== */
  function setHiss(on) {
    state.hiss = on;
    d.body.classList.toggle('is-hiss', on);
    d.documentElement.style.setProperty('--hiss', on ? 1 : 0);
    var btn = $('#btn-hiss');
    if (btn) btn.setAttribute('aria-pressed', String(on));
    var title = $('#hiss-title');
    if (title) {
      title.classList.add('is-glitching');
      setTimeout(function () { title.classList.remove('is-glitching'); }, 1100);
    }
    if (on) {
      Audio_.sweep();
      Audio_.hissOn();
      updateMeter();
      toast('⚠ 检测到 <b style="color:#ff5b4d">嘶鸣共振</b> · 建议立即停止阅读并前往最近的解除污染室');
      startChant(true);
    } else {
      Audio_.click(300, .1, 'sine', .04);
      Audio_.hissOff();
      updateMeter();
      toast('共振已衰减 · 恢复正常协议');
      startChant(false);
    }
  }

  /* 共振指数仪表 */
  function updateMeter() {
    var m = $('#hud-meter');
    if (!m) return;
    var v = state.hiss
      ? 78 + Math.round(Math.random() * 17)
      : 6 + Math.round(Math.random() * 11);
    m.querySelector('.val').textContent = v + '%';
    m.querySelector('b').style.width = v + '%';
    m.classList.toggle('is-hot', state.hiss);
  }

  /* 逐行点亮咒语 */
  var chantTimer = null;
  function startChant(auto) {
    var lines = $$('#chant li');
    if (!lines.length) return;
    clearInterval(chantTimer);
    if (!auto && !d.body.classList.contains('is-hiss')) {
      lines.forEach(function (l) { l.classList.add('is-on'); });
      return;
    }
    lines.forEach(function (l) { l.classList.remove('is-on'); });
    var i = 0;
    chantTimer = setInterval(function () {
      if (i >= lines.length) { clearInterval(chantTimer); return; }
      lines[i++].classList.add('is-on');
      if (state.sound && i % 2 === 0) Audio_.click(90 + Math.random() * 40, .05, 'sine', .03);
    }, 420);
  }

  /* =====================================================================
     董事会同步
     ===================================================================== */
  function boardSync() {
    if (state.syncing) return;
    var lines = (D.board && D.board.lines) || [];
    if (!lines.length) return;
    state.syncing = true;
    var wrap = $('#pyramid-wrap'), feed = $('#board-feed'), btn = $('#btn-sync');
    wrap.classList.add('is-sync');
    btn.textContent = '同步中…';
    Audio_.sweep();

    /* 随机取 3 句，逐句打字 */
    var pick = lines.slice().sort(function () { return Math.random() - .5; }).slice(0, 3);
    var buf = '';
    var li = 0;

    function nextLine() {
      if (li >= pick.length) {
        wrap.classList.remove('is-sync');
        btn.textContent = '再次发起同步';
        state.syncing = false;
        Audio_.ok();
        return;
      }
      var txt = pick[li++];
      var head = '<span style="color:#3d43a8">[董事会]</span> ';
      feed.innerHTML = head;
      var i = 0;
      var t = setInterval(function () {
        if (i >= txt.length) {
          clearInterval(t);
          feed.innerHTML += '<br><br>';
          setTimeout(nextLine, 620);
          return;
        }
        feed.innerHTML = head + R.esc(txt.slice(0, ++i)) + '<span class="cursor"></span>';
        if (state.sound && i % 3 === 0) Audio_.click(1400 + Math.random() * 400, .014, 'square', .015);
      }, 34);
    }
    nextLine();
  }

  /* =====================================================================
     最古老屋 · 楼层交互
     ===================================================================== */
  /* 02 卷现在按「扇区分组 + 区域行」渲染（renderHouse），不再有 .floor 按钮。
     高亮改为匹配 .area-row；第 7 组「海景汽车旅馆」是楼外地点，同属登记项。 */
  function highlightAreaRow(name) {
    $$('#tower .area-row').forEach(function (r) {
      var b = r.querySelector('b');
      var on = !!name && !!b && b.textContent.trim() === name;
      r.classList.toggle('is-active', on);
      r.style.background = on ? 'rgba(207,42,30,.14)' : '';
      r.style.borderLeftColor = on ? 'var(--red)' : '';
      if (on) r.setAttribute('aria-current', 'true');
      else r.removeAttribute('aria-current');
    });
  }

  function selectFloor(i, force) {
    var floors = (D.house && D.house.floors) || [];
    if (!floors[i]) return;
    if (!force && i === state.floorIdx) return;
    state.floorIdx = i;
    highlightAreaRow(floors[i].name);
    var info = $('#floor-info'), body = $('#floor-body'), ghost = $('#floor-ghost');
    if (!info || !body) return;
    info.classList.add('is-swap');
    Audio_.click(560, .03, 'square', .02);
    setTimeout(function () {
      body.innerHTML = R.floorInfo(i);
      if (ghost) ghost.textContent = floors[i].lv;
      info.classList.remove('is-swap');
      applyClearance(state.clearance, true);
    }, 180);
  }

  /* 点击 #tower 的区域行：有独立登记 → 复用 selectFloor；
     只有地图登记名（span 行）→ 在右侧显示「仅登记名」占位。 */
  function selectArea(name, row) {
    var floors = (D.house && D.house.floors) || [];
    var idx = -1;
    for (var i = 0; i < floors.length; i++) if (floors[i].name === name) { idx = i; break; }
    if (idx > -1) { selectFloor(idx, true); return; }

    highlightAreaRow('');
    if (row) {
      row.classList.add('is-active');
      row.style.background = 'rgba(207,42,30,.14)';
      row.style.borderLeftColor = 'var(--red)';
      row.setAttribute('aria-current', 'true');
    }
    var info = $('#floor-info'), body = $('#floor-body'), ghost = $('#floor-ghost');
    if (!info || !body) return;
    var group = row && row.closest ? row.closest('.fgroup') : null;
    var head = group && group.querySelector('.fgroup-hd b');
    var sector = head ? head.textContent.trim() : '未编入扇区';
    info.classList.add('is-swap');
    Audio_.click(480, .03, 'square', .02);
    setTimeout(function () {
      if (ghost) ghost.textContent = '—';
      body.innerHTML = '<div class="sub">扇区内部区域 · ' + R.esc(sector) + '</div>' +
        '<h3>' + R.esc(name) + '</h3>' +
        '<p>此处只在地图登记中出现过，没有独立的编号档案。所属扇区：<b>' + R.esc(sector) + '</b>。' +
        '带数字的区域可点开完整登记，其余为地图标注名。</p>';
      info.classList.remove('is-swap');
    }, 180);
  }

  /* =====================================================================
     环境音乐（assets/audio/ambience.wav · 由 tools/make_ambience.py 生成）
     ===================================================================== */
  var bgmEl = null, bgmFade = null;

  function setMusicBtn(on) {
    var b = $('#btn-music');
    if (b) b.setAttribute('aria-pressed', String(!!on));
  }

  function musicFade(target, ms, done) {
    if (!bgmEl) return;
    clearInterval(bgmFade);
    var from = bgmEl.volume;
    var steps = Math.max(1, Math.round(ms / 50)), k = 0;
    bgmFade = setInterval(function () {
      k++;
      var v = from + (target - from) * (k / steps);
      bgmEl.volume = Math.max(0, Math.min(1, v));
      if (k >= steps) {
        clearInterval(bgmFade);
        bgmEl.volume = Math.max(0, Math.min(1, target));
        if (done) done();
      }
    }, 50);
  }

  function musicToggle(on) {
    if (!bgmEl) bgmEl = $('#bgm');
    if (!bgmEl) { toast('音频文件缺失 · 请先运行 tools/make_ambience.py'); return; }
    if (on == null) on = bgmEl.paused;
    if (on) {
      bgmEl.volume = 0;
      var p = bgmEl.play();
      if (p && p.catch) {
        p.catch(function () {
          setMusicBtn(false);
          toast('浏览器拦截了自动播放 · 请再次点击「环境音乐」或按 <b>M</b>');
        });
      }
      musicFade(0.5, 1600);
      toast('环境音乐已启用 · <b>最古老屋 · 环境录音 07/19</b> · 72 秒无缝循环');
    } else {
      musicFade(0, 600, function () { bgmEl.pause(); });
      toast('环境音乐已关闭');
    }
    setMusicBtn(on);
  }

  /* =====================================================================
     引导序列
     ===================================================================== */
  var BOOT_LINES = [
    ['建立安全链路 · · · · · · · · · · · · ', 'OK', 'ok'],
    ['校验终端证书 FBC-CERT-<b class="num">7.13</b> · · · · ', 'OK', 'ok'],
    ['挂载档案卷 <b class="num">FBC-ARCHIVE-07/19</b> · · · ', 'OK', 'ok'],
    ['同步董事会频段 · · · · · · · · · · ', '漂移', 'warn'],
    ['扫描环境共振 · · · · · · · · · · · ', '异常', 'warn'],
    ['定位异常源 · · · · · · · · · · · · ', '行政部 · 三层', 'bad'],
    ['身份核验 · · · · · · · · · · · · · ', '见习研究员（临时）', 'ok'],
    ['加载公开档案 · · · · · · · · · · · ', '12 卷', 'ok'],
    ['安全提示 · · · · · · · · · · · · · ', '请勿独自搭乘电梯', 'warn']
  ];

  function bootSequence() {
    var log = $('#boot-log');
    var i = 0;
    (function next() {
      if (i >= BOOT_LINES.length) {
        var btn = $('#btn-enter');
        btn.style.opacity = '1';
        return;
      }
      var L = BOOT_LINES[i++];
      var div = d.createElement('div');
      div.innerHTML = '&gt; ' + L[0] + '<span class="' + L[2] + '">' + L[1] + '</span>';
      div.style.opacity = '0';
      log.appendChild(div);
      requestAnimationFrame(function () { div.style.transition = 'opacity .3s'; div.style.opacity = '1'; });
      Audio_.key();
      setTimeout(next, 130 + Math.random() * 190);
    })();
  }

  function enterArchive() {
    if (state.booted) return;
    state.booted = true;
    Audio_.resume();
    Audio_.ok();
    $('#boot-flash').classList.add('is-fire');
    $('#boot').classList.add('is-gone');
    d.body.classList.remove('is-locked');
    setTimeout(function () { d.body.classList.add('is-live'); }, 220);

    /* 简报打字机 */
    setTimeout(function () {
      typewrite($('#briefing-type'), D.briefing || '', 17, function () {
        if (state.sound) Audio_.key();
      }, function () {
        toast('档案已解锁 · 使用顶部导航或左侧侧轨浏览各卷 · 按 <b>H</b> 可模拟嘶鸣污染');
      });
    }, 900);

    /* 初始渲染已就绪 → 应用权限 */
    applyClearance(state.clearance, true);

    /* 深链接：只有在用户已经进站后才打开，准入页阶段不抢焦点 */
    if (state.pendingHash || /^#\/dos\//.test(w.location.hash || '')) {
      state.pendingHash = false;
      setTimeout(openFromHash, 420);
    }
  }

  /* =====================================================================
     滚动 / 导航
     ===================================================================== */
  function initScroll() {
    var prog = $('#progress');
    var onScroll = function () {
      var h = d.documentElement.scrollHeight - w.innerHeight;
      prog.style.width = (h > 0 ? (w.scrollY / h) * 100 : 0) + '%';
    };
    w.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* 章节高亮 */
    var secs = $$('main .sec');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) e.target.classList.add('is-in');
      });
    }, { rootMargin: '-8% 0px -60% 0px' });
    secs.forEach(function (s) { io.observe(s); });

    var navIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var id = e.target.id;
        var nav = $('#hud-nav'), cur = null;
        $$('#hud-nav a').forEach(function (a) {
          var on = a.getAttribute('href') === '#' + id;
          a.classList.toggle('is-active', on);
          if (on) cur = a;
        });
        $$('#rail a').forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('data-target') === id);
        });
        /* 13 个卷宽于导航条时它会横向溢出：把当前卷滚进视野，否则可能一直看不见 */
        if (cur && nav) {
          var lb = cur.getBoundingClientRect(), nb = nav.getBoundingClientRect();
          if (lb.left < nb.left + 6 || lb.right > nb.right - 6) {
            nav.scrollTo({
              left: cur.offsetLeft - (nav.clientWidth - cur.clientWidth) / 2,
              behavior: 'smooth'
            });
          }
        }
      });
    }, { rootMargin: '-30% 0px -55% 0px' });
    secs.forEach(function (s) { navIo.observe(s); });

    /* 浮现 */
    var revIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); revIo.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });
    $$('.reveal').forEach(function (n) { revIo.observe(n); });

    /* 咒语：进入嘶鸣章节时自动逐行点亮 */
    var hissSec = $('#s-hiss');
    if (hissSec) {
      var hissIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { startChant(true); hissIo.disconnect(); }
        });
      }, { threshold: .25 });
      hissIo.observe(hissSec);
    }
  }

  /* =====================================================================
     鼠标
     ===================================================================== */
  function initPointer() {
    var cur = $('#cursor');
    var glow = $('#fx-glow');
    var x = 0, y = 0, cx = 0, cy = 0;

    /* 仅在指针精确的设备上接管光标：隐藏系统光标，避免双光标并存。
       JS 未执行时不会加这个类，系统光标保持原样。 */
    var fine = w.matchMedia && w.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (fine) d.documentElement.classList.add('has-cursor');

    /* 一帧最多更新一次。
       ⚠ 不要往 :root 写 --mx/--my：自定义属性在根节点上变化会让整份文档样式失效，
       实测鼠标移动时帧率从 144 掉到 29（关掉所有特效层也只有 34）。现在光晕直接用
       transform 位移（合成器处理，不重绘），封面视差也只改自身 transform。 */
    var mxPending = false;
    var bootArt = d.querySelector('.boot-art svg');
    var GLOW_R = 320;

    w.addEventListener('mousemove', function (e) {
      x = e.clientX; y = e.clientY;
      if (fine && cur) cur.style.opacity = '1';
      if (mxPending) return;
      mxPending = true;
      requestAnimationFrame(function () {
        mxPending = false;
        if (glow) {
          glow.style.transform = 'translate3d(' + (x - GLOW_R) + 'px,' + (y - GLOW_R) + 'px,0)';
        }
        /* 准入页的封面视差：只在仍处于锁定页时更新，进站后完全停止 */
        if (bootArt && d.body.classList.contains('is-locked')) {
          var sc = -.016;
          bootArt.style.transform = 'translate(' +
            ((x - w.innerWidth * .5) * sc).toFixed(2) + 'px,' +
            ((y - w.innerHeight * .5) * sc).toFixed(2) + 'px)';
        }
      });
    });

    /* 初始把光晕放在视口中心，避免键盘进站时看不到光晕 */
    if (glow) {
      glow.style.transform = 'translate3d(' +
        (w.innerWidth * .5 - GLOW_R) + 'px,' + (w.innerHeight * .5 - GLOW_R) + 'px,0)';
    }

    /* 指针离开窗口时收起，避免停在边缘 */
    d.addEventListener('mouseleave', function () { if (cur) cur.style.opacity = '0'; });
    d.addEventListener('mouseenter', function () { if (fine && cur) cur.style.opacity = '1'; });

    /* 光标跟随：必须跟手。
       原先用 `cx += (x - cx) * .18` 缓动，时间常数约 90ms，要 0.3–0.4 秒才追上鼠标；
       而底下的光晕读 --mx/--my 是逐帧直更的，于是看起来"光芒跟着鼠标、十字跟着光芒"。
       这里改为直接对齐，只在位置真的变了才写样式（静止时零开销）。 */
    (function loop() {
      requestAnimationFrame(loop);
      if (!cur) return;
      if (x === cx && y === cy) return;
      cx = x; cy = y;
      cur.style.setProperty('--cx', (cx - 13) + 'px');
      cur.style.setProperty('--cy', (cy - 13) + 'px');
    })();

    d.addEventListener('mouseover', function (e) {
      var t = e.target;
      if (!t || typeof t.closest !== 'function') return;
      var hot = t.closest('button, a, .dept, .floor, .tl-item, .redact, .cast, tr, .chip, .floor, input');
      cur.classList.toggle('is-hot', !!hot);
      var textish = t.closest('input, textarea, [contenteditable]');
      cur.classList.toggle('is-text', !!textish);
    });
  }

  /* 封面标题：乱码解码显现 */
  function decodeTitle() {
    var LAT = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var CJK = '控察局档异密共振嘶鸣收容阈界钉理';
    R.$$('.boot-title [data-decode]').forEach(function (el, idx) {
      var final = el.getAttribute('data-decode') || el.textContent;
      var isCJK = /[\u4e00-\u9fa5]/.test(final);
      var pool = isCJK ? CJK : LAT;
      var start = performance.now() + 240 + idx * 210;
      var dur = 560 + final.length * 30;
      function frame(now) {
        var p = (now - start) / dur;
        if (p < 0) { requestAnimationFrame(frame); return; }
        if (p >= 1) { el.textContent = final; el.removeAttribute('data-decode'); return; }
        var settled = Math.floor(p * final.length);
        var out = '';
        for (var i = 0; i < final.length; i++) {
          var ch = final.charAt(i);
          out += (i < settled || ch === ' ' || ch === '·')
            ? ch
            : pool.charAt(Math.floor(Math.random() * pool.length));
        }
        el.textContent = out;
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  }

  /* =====================================================================
     事件绑定
     ===================================================================== */
  /* 按编号 / 姓名在数据层里找回原记录 */
  function lookupRec(kind, key) {
    var bag = ({
      dept: R.allDepts(),
      item: R.allItems(),
      awe: D.awe,
      cast: D.cast,
      floor: D.house && D.house.floors,
      gloss: R.allGloss(),
      case: R.caseData(),
      area: R.areaRecs()
    })[kind] || [];
    for (var i = 0; i < bag.length; i++) {
      if (String(R.recKey(kind, bag[i])) === String(key)) return bag[i];
    }
    return null;
  }

  /* 档案浮层：捕获阶段拦截，避免触发条目自身的就地展开 */
  function onDossierClick(e) {
    var t = e.target;
    if (!t || typeof t.closest !== 'function') return;

    var opener = t.closest('[data-dos]');
    if (opener) {
      e.preventDefault(); e.stopPropagation();
      var rec = lookupRec(opener.getAttribute('data-dos'), opener.getAttribute('data-key'));
      if (rec) {
        R.openDossier(opener.getAttribute('data-dos'), rec);
        if (state.sound) Audio_.click(520, .06, 'sine', .03);
      }
      return;
    }

    var locBtn = t.closest('[data-locate]');
    if (locBtn) {
      e.preventDefault(); e.stopPropagation();
      var key = locBtn.getAttribute('data-locate');
      R.closeDossier();
      setTimeout(function () {
        var sec = document.getElementById('s-map');
        if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(function () {
          if (R.locateOnMap && R.locateOnMap(key)) {
            toast('已定位到 <b style="color:var(--red)">' + key + '</b>');
          }
        }, 700);
      }, 180);
      if (state.sound) Audio_.click(660, .07, 'sine', .03);
      return;
    }

    var fb = t.closest('.dos-file > button');
    if (fb) {
      var open = fb.parentNode.classList.toggle('is-open');
      fb.setAttribute('aria-expanded', String(open));
      if (state.sound) Audio_.key();
      return;
    }

    if (t.closest('[data-dos-close]') || t.closest('#dos-close')) R.closeDossier();
  }

  /* =====================================================================
     全站检索（Ctrl / Cmd + K）
     索引在一次打开面板时构建，之后复用；数据是静态的，不会失效。
     ===================================================================== */
  var pal = { idx: null, hit: [], on: 0, open: false, returnTo: null };

  function palIndex() {
    if (pal.idx) return pal.idx;
    var out = [];
    function low() { return Array.prototype.join.call(arguments, ' ').toLowerCase(); }

    (D.toc || []).forEach(function (t) {
      out.push({ k: '卷', t: t.t, s: t.id, act: 'scroll', key: t.id, blob: low(t.t, t.id) });
    });
    R.allDepts().forEach(function (d) {
      out.push({ k: '部门', t: d.name, s: d.no + ' · ' + (d.en || ''), act: 'dos', dkind: 'dept', rec: d,
        blob: low(d.name, d.en, d.no, d.summary, d.detail) });
    });
    R.allItems().forEach(function (it) {
      out.push({ k: '藏品', t: it.name, s: it.no + ' · ' + (it.en || ''), act: 'dos', dkind: 'item', rec: it,
        blob: low(it.name, it.en, it.no, it.effect, (it.detail || []).join(' ')) });
    });
    (D.awe || []).forEach(function (a) {
      out.push({ k: '编年', t: a.title, s: a.year + ' · ' + a.code, act: 'dos', dkind: 'awe', rec: a,
        blob: low(a.title, a.code, a.year, a.brief, a.detail) });
    });
    (D.cast || []).forEach(function (c) {
      out.push({ k: '人事', t: c.name, s: c.role || '', act: 'dos', dkind: 'cast', rec: c,
        blob: low(c.name, c.init, c.role, c.bio) });
    });
    R.allGloss().forEach(function (g) {
      out.push({ k: '词条', t: g.term, s: g.cat + ' · ' + (g.en || ''), act: 'dos', dkind: 'gloss', rec: g,
        blob: low(g.term, g.en, g.cat, g.desc) });
    });
    R.caseData().forEach(function (c) {
      out.push({ k: '案卷', t: c.title, s: c.id + ' · ' + c.date, act: 'dos', dkind: 'case', rec: c,
        blob: low(c.title, c.id, c.loc, c.summary, c.assign, (c.officers || []).join(' ')) });
    });
    /* 地图上的 87 个地点 */
    if (R.areaRecs) R.areaRecs().forEach(function (a) {
      out.push({ k: '地点', t: a.cn, s: (a.sect || '') + ' · ' + (a.en || ''), act: 'dos', dkind: 'area', rec: a,
        blob: low(a.cn, a.en, a.sect) });
    });
    /* 15 条扇区登记 */
    ((D.house && D.house.floors) || []).forEach(function (f) {
      out.push({ k: '扇区', t: f.name, s: (f.lv || '') + ' · ' + (f.en || ''), act: 'dos', dkind: 'floor', rec: f,
        blob: low(f.name, f.en, f.lv, f.desc || '', f.note || '') });
    });
    R.commsData().forEach(function (c) {
      out.push({ k: '通讯', t: c.t, s: c.date, act: 'scroll', key: 's-comms',
        blob: low(c.t, c.from, c.to, c.lead, (c.body || []).join(' ')) });
    });
    R.timelineData().forEach(function (e) {
      out.push({ k: '年表', t: e.year + ' · ' + e.t, s: e.md && e.md !== '00-00' ? e.md : '',
        act: 'scroll', key: 's-timeline', blob: low(e.t, e.year, e.p) });
    });

    pal.idx = out;
    return out;
  }

  function palRender(q) {
    var idx = palIndex();
    q = (q || '').trim().toLowerCase();
    var hit = [];
    if (!q) {
      hit = idx.slice(0, 40);
    } else {
      for (var i = 0; i < idx.length; i++) {
        var p = idx[i].blob.indexOf(q);
        if (p > -1) hit.push({ o: idx[i], p: p });
      }
      hit.sort(function (a, b) {
        if (a.p !== b.p) return a.p - b.p;
        /* 同分时，能直接打开档案的排在前面 —— 否则搜「董事会」
           第一项会是同名的那一卷，Enter 只会滚动而不是打开档案 */
        return (a.o.act === 'dos' ? 0 : 1) - (b.o.act === 'dos' ? 0 : 1);
      });
      hit = hit.slice(0, 40).map(function (x) { return x.o; });
    }
    pal.hit = hit;
    pal.on = hit.length ? 0 : -1;

    var cnt = $('#pal-cnt');
    if (cnt) cnt.textContent = hit.length + ' / ' + idx.length;
    var host = $('#pal-list');
    if (!host) return;

    if (!hit.length) {
      host.innerHTML = '<div class="pal-empty">没有匹配的档案。<br>试试「嘶鸣」「办公室」「AWE」「黑岩」——或者换一个更短的字。</div>';
      return;
    }

    var re = null;
    if (q) {
      re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    }
    host.innerHTML = hit.map(function (o, i) {
      var tt = R.esc(o.t);
      if (re) tt = tt.replace(re, '<mark>$1</mark>');
      return '<div class="pal-item' + (i === 0 ? ' is-on' : '') + '" data-i="' + i + '" role="option">' +
        '<span class="pal-k">' + R.esc(o.k) + '</span>' +
        '<span class="pal-t">' + tt + '</span>' +
        (o.s ? '<span class="pal-s">' + R.esc(o.s) + '</span>' : '') +
        '</div>';
    }).join('');
    host.scrollTop = 0;
  }

  function palOpen() {
    var box = $('#palette');
    if (!box) return;
    pal.returnTo = d.activeElement;        /* 关闭时把焦点还给它 */
    pal.open = true;
    box.classList.add('is-open');
    box.setAttribute('aria-hidden', 'false');
    var inp = $('#pal-input');
    if (inp) { inp.value = ''; inp.focus(); }
    palRender('');
    if (state.sound) Audio_.click(560, .05, 'square', .02);
  }

  function palClose() {
    var box = $('#palette');
    if (!box) return;
    var wasOpen = pal.open;
    pal.open = false;
    box.classList.remove('is-open');
    box.setAttribute('aria-hidden', 'true');
    /* 焦点归还触发按钮（点击遮罩 / ESC / 再按 Ctrl+K 关闭时都适用） */
    var back = pal.returnTo;
    pal.returnTo = null;
    if (wasOpen && back && back.focus) {
      try { back.focus(); } catch (e) { /* 元素可能已被重渲染 */ }
    }
  }

  function palMove(d) {
    if (!pal.hit.length) return;
    pal.on = Math.max(0, Math.min(pal.hit.length - 1, pal.on + d));
    var items = $$('#pal-list .pal-item');
    for (var i = 0; i < items.length; i++) items[i].classList.toggle('is-on', i === pal.on);
    if (items[pal.on] && items[pal.on].scrollIntoView) {
      items[pal.on].scrollIntoView({ block: 'nearest' });
    }
  }

  function palGo() {
    var o = pal.hit[pal.on];
    if (!o) return;
    palClose();
    if (o.act === 'dos') {
      R.openDossier(o.dkind, o.rec);
    } else {
      var el = document.getElementById(o.key);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
    if (state.sound) Audio_.click(700, .05, 'square', .025);
  }

  /* =====================================================================
     深链接：每份档案都有一个可分享、可刷新恢复的地址
     ===================================================================== */
  var LINK_ON = true;

  function setHash(kind, key) {
    if (!LINK_ON) return;
    try {
      history.replaceState(null, '', '#/dos/' + encodeURIComponent(kind) + '/' + encodeURIComponent(key || ''));
    } catch (e) { /* file:// 下可能受限，忽略 */ }
  }

  function clearHash() {
    if (!LINK_ON) return;
    try {
      history.replaceState(null, '', w.location.pathname + w.location.search);
    } catch (e) { /* noop */ }
  }

  function openFromHash() {
    var m = /^#\/dos\/([^/]+)\/(.+)$/.exec(w.location.hash || '');
    if (!m) return false;
    /* 准入页阶段不弹浮层、不抢焦点：记下来，等 enterArchive 之后再打开 */
    if (!state.booted) { state.pendingHash = true; return false; }
    var kind, key;
    try {
      kind = decodeURIComponent(m[1]);
      key = decodeURIComponent(m[2]);
    } catch (e) { return false; }
    var idx = palIndex();
    for (var i = 0; i < idx.length; i++) {
      var o = idx[i];
      if (o.act === 'dos' && o.dkind === kind && R.recKey(kind, o.rec) === key) {
        LINK_ON = false;
        R.openDossier(kind, o.rec);
        LINK_ON = true;
        return true;
      }
    }
    return false;
  }

  /* 运行时改 hash（地址栏回车 / 分享链接 / 站内跳转）也能恢复对应档案。
     首屏只处理一次的老做法已改为：hashchange 监听 + 进站后补一次。 */
  function initHashRoute() {
    w.addEventListener('hashchange', function () {
      if (!state.booted) { state.pendingHash = true; return; }
      openFromHash();
    });
  }

  /* =====================================================================
     03 互动地图 · 缩放 / 平移 / 筛选 / 图钉
     ===================================================================== */
  function bindPoi() {
    var canvas = $('#poi-canvas');
    if (!canvas) return;

    var pan = { on: false, moved: 0, lx: 0, ly: 0, pid: null, downEl: null };

    canvas.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      /* 瓦片是 <img>，不拦的话浏览器会启动原生"拖拽图片" */
      e.preventDefault();
      pan.on = true; pan.moved = 0; pan.lx = e.clientX; pan.ly = e.clientY;
      /* SVG 元素上 closest 可用，但直接判断更稳 */
      var el = e.target;
      var tag = el && el.tagName;
      var pinEl = ((tag === 'path' || tag === 'text') && el.closest) ? el.closest('.poi-pin') : null;
      pan.downEl = pinEl ||
        ((tag === 'text' && el.classList && el.classList.contains('poi-label')) ? el : null);
      canvas.classList.add('is-panning');
      /* 拖拽期间才提示浏览器提升为合成层，松手立刻撤销，不常驻显存 */
      var stg = document.querySelector('#poi-stage');
      if (stg) stg.style.willChange = 'transform';
      try { canvas.setPointerCapture(e.pointerId); pan.pid = e.pointerId; } catch (err) { pan.pid = null; }
    });

    function endPan() {
      var stg = document.querySelector('#poi-stage');
      if (stg) stg.style.willChange = '';
    }

    canvas.addEventListener('pointermove', function (e) {
      if (!pan.on) return;
      var dx = e.clientX - pan.lx, dy = e.clientY - pan.ly;
      pan.lx = e.clientX; pan.ly = e.clientY;
      pan.moved += Math.abs(dx) + Math.abs(dy);
      if (pan.moved > 5) R.poiPan(dx, dy);
    });

    canvas.addEventListener('pointerup', function () {
      var dragged = pan.moved > 5;
      endPan();
      pan.on = false;
      canvas.classList.remove('is-panning');
      if (pan.pid !== null) { try { canvas.releasePointerCapture(pan.pid); } catch (err) {} pan.pid = null; }
      if (dragged || !pan.downEl) { pan.downEl = null; return; }

      var d = pan.downEl;

      /* 房间名本身就是一条档案入口 */
      if (d && d.classList.contains('poi-label')) {
        var cn = d.getAttribute('data-cn');
        var hit = (R.areaRecs ? R.areaRecs() : []).filter(function (a) { return a.cn === cn; })[0];
        if (hit) {
          R.openDossier('area', hit);
          if (state.sound) Audio_.click(520, .06, 'sine', .03);
          return;
        }
      }

      var on = canvas.querySelectorAll('.poi-d.is-on');
      for (var i = 0; i < on.length; i++) on[i].classList.remove('is-on');
      d.classList.add('is-on');

      var tip = $('#poi-tip');
      if (tip) {
        var t = d.getAttribute('data-t') || '未登记';
        var c = d.getAttribute('data-c') || '';
        var r = d.getAttribute('data-r') || '';
        tip.innerHTML = '<b>' + R.esc(t) + '</b>' +
          (c ? '<span>' + R.esc(c) + '</span>' : '') +
          (r ? '<i>' + R.esc(r) + '</i>' : '');
        tip.classList.add('is-on');
      }
      if (state.sound) Audio_.click(680, .04, 'square', .022);
      pan.downEl = null;
    });

    canvas.addEventListener('pointercancel', function () {
      endPan();
      pan.on = false; pan.downEl = null; canvas.classList.remove('is-panning');
    });

    /* 双保险：任何 dragstart 都不允许 */
    canvas.addEventListener('dragstart', function (e) { e.preventDefault(); });

    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      R.poiZoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY);
    }, { passive: false });

    canvas.addEventListener('dblclick', function (e) {
      e.preventDefault();
      R.poiReset();
      var tip = $('#poi-tip');
      if (tip) tip.classList.remove('is-on');
    });

    canvas.addEventListener('keydown', function (e) {
      var stp = e.shiftKey ? 60 : 20;
      if (e.key === 'ArrowLeft') R.poiPan(-stp, 0);
      else if (e.key === 'ArrowRight') R.poiPan(stp, 0);
      else if (e.key === 'ArrowUp') R.poiPan(0, -stp);
      else if (e.key === 'ArrowDown') R.poiPan(0, stp);
      else if (e.key === '+' || e.key === '=') R.poiZoomAt(1.2);
      else if (e.key === '-') R.poiZoomAt(1 / 1.2);
      else if (e.key === '0') R.poiReset();
      else return;
      e.preventDefault();
    });

    /* 类别筛选 */
    var filters = $('#poi-filters');
    if (filters) filters.addEventListener('change', function (e) {
      var cb = e.target;
      if (!cb || cb.type !== 'checkbox') return;
      var f = cb.closest('.poi-f');
      if (!f) return;
      R.poiToggleCat(f.getAttribute('data-cat'), cb.checked);
      if (state.sound) Audio_.click(cb.checked ? 560 : 380, .03, 'square', .02);
    });

    var pAll = $('#poi-all'), pNone = $('#poi-none');
    if (pAll) pAll.addEventListener('click', function () { R.poiAll(true); if (state.sound) Audio_.click(600, .04, 'square', .022); });
    if (pNone) pNone.addEventListener('click', function () { R.poiAll(false); if (state.sound) Audio_.click(360, .04, 'square', .022); });

    var zi = $('#poi-zoom-in'), zo = $('#poi-zoom-out'), zr = $('#poi-zoom-reset');
    if (zi) zi.addEventListener('click', function () { R.poiZoomAt(1.3); if (state.sound) Audio_.click(560, .03, 'square', .018); });
    if (zo) zo.addEventListener('click', function () { R.poiZoomAt(1 / 1.3); if (state.sound) Audio_.click(420, .03, 'square', .018); });
    if (zr) zr.addEventListener('click', function () { R.poiReset(); if (state.sound) Audio_.key(); });
  }

  /* 把一段绑定包起来：出错只记日志，不中断后续绑定 */
  function safe(label, fn) {
    try { fn(); } catch (e) { console.warn('[bind] ' + label + ' failed:', e && e.message); }
  }

  /* =====================================================================
     缺失的交互绑定
     全部走事件委托：条目（藏品行 / AWE 条目 / 年表 / 案卷）重渲染后依然有效
     ===================================================================== */
  function bindMissing() {
    /* ---- 07 藏品类型筛选 ---- */
    var itemFilters = $('#item-filters');
    if (itemFilters) {
      itemFilters.addEventListener('click', function (e) {
        var chip = e.target.closest && e.target.closest('.chip[data-kind]');
        if (!chip) return;
        var k = chip.getAttribute('data-kind');
        if (k === R.getItemFilter()) return;
        R.setItemFilter(k);
        R.renderItems();
        var n = $$('#item-rows tr[data-i]').length;
        var now = $('#item-filters .chip[data-kind="' + k + '"]') || chip;
        toast('藏品筛选 → <b style="color:var(--red)">' + R.esc(now.textContent.trim()) +
          '</b> · ' + n + ' 件');
        if (state.sound) Audio_.click(600, .04, 'square', .02);
      });
    }

    /* ---- 07 点击主行展开收容记录（紧邻的 tr.detail-row 由 CSS 负责动画） ---- */
    var itemRows = $('#item-rows');
    if (itemRows) {
      itemRows.addEventListener('click', function (e) {
        if (e.target.closest && e.target.closest('.dos-open')) return; /* 「完整案卷」走档案浮层 */
        var tr = e.target.closest && e.target.closest('tr[data-i]');
        if (!tr) return;
        var det = tr.nextElementSibling;
        if (!det || !det.classList.contains('detail-row')) return;
        var open = det.classList.toggle('is-open');
        tr.classList.toggle('is-open', open);
        tr.setAttribute('aria-expanded', String(open));
        if (state.sound) Audio_.key();
      });
    }

    /* ---- 08 AWE「摘要 ▾」 ---- */
    var aweList = $('#awe-list');
    if (aweList) {
      aweList.addEventListener('click', function (e) {
        var btn = e.target.closest && e.target.closest('button.tl-toggle');
        if (!btn) return;
        var item = btn.closest('.tl-item');
        if (!item) return;
        var open = item.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', String(open));
        btn.textContent = open ? '收起 ▴' : '摘要 ▾';
        if (state.sound) Audio_.key();
      });
    }

    /* ---- 11 词典检索：输入即过滤，计数由 renderGloss 同步 ---- */
    var glossInp = $('#gloss-input');
    if (glossInp) {
      var runGloss = function () { R.renderGloss(glossInp.value); };
      glossInp.addEventListener('input', runGloss);
      glossInp.addEventListener('search', runGloss); /* 点搜索框原生 × 时 input 不一定触发 */
      glossInp.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { this.value = ''; R.renderGloss(''); }
      });
    }

    /* ---- 12 年表：图例筛选 ---- */
    var tlLegend = $('#tl-legend');
    if (tlLegend) {
      tlLegend.addEventListener('click', function (e) {
        var chip = e.target.closest && e.target.closest('.chip[data-k]');
        if (!chip) return;
        R.setTlKind(chip.getAttribute('data-k'));
        var cnt = $('#tl-count');
        toast('年表筛选 → <b style="color:var(--red)">' + R.esc(chip.textContent.trim()) + '</b>' +
          (cnt ? ' · ' + R.esc(cnt.textContent) : ''));
        if (state.sound) Audio_.click(580, .04, 'square', .02);
      });
    }

    /* ---- 12 年表：十年刻度跳转 ---- */
    var tlRail = $('#tl-rail');
    if (tlRail) {
      tlRail.addEventListener('click', function (e) {
        var tick = e.target.closest && e.target.closest('.tl-tick');
        if (!tick || tick.disabled) return;
        var dec = parseInt(tick.getAttribute('data-y'), 10) || 0;
        var groups = $$('#tl-list .tl-group');
        var target = null;
        for (var i = 0; i < groups.length; i++) {
          if ((parseInt(groups[i].getAttribute('data-year'), 10) || 0) >= dec) { target = groups[i]; break; }
        }
        if (!target) return;
        $$('#tl-rail .tl-tick').forEach(function (t) { t.classList.toggle('is-active', t === tick); });
        tick.setAttribute('aria-pressed', 'true');
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        toast('跳转到 <b style="color:var(--red)">' + dec + '</b> 年代 · 首条 ' +
          target.getAttribute('data-year') + ' 年');
        if (state.sound) Audio_.click(500, .04, 'square', .02);
      });
    }

    /* ---- 13 案卷筛选 ---- */
    var casesBar = $('#cases-bar');
    if (casesBar) {
      casesBar.addEventListener('click', function (e) {
        var chip = e.target.closest && e.target.closest('.chip[data-k]');
        if (!chip) return;
        R.setCaseKind(chip.getAttribute('data-k'));
        var n = $$('#cases-grid .case-card').length;
        toast('案卷筛选 → <b style="color:var(--red)">' + R.esc(chip.textContent.trim()) +
          '</b> · ' + n + ' 卷');
        if (state.sound) Audio_.click(620, .04, 'square', .02);
      });
    }

    /* ---- 05 董事会：同步按钮（boardSync 此前从未被调用） ---- */
    var syncBtn = $('#btn-sync');
    if (syncBtn) syncBtn.addEventListener('click', function () { boardSync(); });

    /* ---- 02 扇区/楼层：分组折叠 + 区域行高亮 / 右侧登记详情 ---- */
    var tower = $('#tower');
    if (tower) {
      tower.addEventListener('click', function (e) {
        var t = e.target;
        if (!t || !t.closest) return;
        var hd = t.closest('.fgroup-hd');
        if (hd && !t.closest('.area-row')) {
          var group = hd.parentNode;
          var list = group.querySelector('.area-list');
          var collapsed = group.classList.toggle('is-collapsed');
          if (list) list.style.display = collapsed ? 'none' : '';
          hd.setAttribute('aria-expanded', String(!collapsed));
          if (state.sound) Audio_.key();
          return;
        }
        var row = t.closest('.area-row');
        if (!row) return;
        var b = row.querySelector('b');
        selectArea(b ? b.textContent.trim() : '', row);
      });
      /* 键盘可达：分组头与区域行都补上 role/tabindex（DOM 由 render.js 生成） */
      $$('#tower .fgroup-hd').forEach(function (hd) {
        hd.setAttribute('role', 'button');
        hd.setAttribute('tabindex', '0');
        hd.setAttribute('aria-expanded', 'true');
        hd.style.cursor = 'pointer';
      });
      $$('#tower .area-row').forEach(function (r) {
        r.setAttribute('role', 'button');
        r.setAttribute('tabindex', '0');
      });
      tower.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        var t = e.target;
        if (!t || !t.classList) return;
        if (!t.classList.contains('fgroup-hd') && !t.classList.contains('area-row')) return;
        e.preventDefault();
        t.click();
      });
    }

    /* ---- 检索面板：document 级 ESC 关闭 + Tab 焦点陷阱 + 关闭按钮 ---- */
    d.addEventListener('keydown', function (e) {
      if (!pal.open) return;
      if (e.key === 'Escape') {
        if (R.isDossierOpen()) return;   /* 档案浮层优先消费 ESC */
        e.preventDefault();
        palClose();
        if (state.sound) Audio_.click(420, .05, 'sine', .03);
        return;
      }
      if (e.key !== 'Tab') return;
      var box = $('#palette');
      if (!box) return;
      var f = $$('#palette a[href], #palette button:not([disabled]), ' +
               '#palette input:not([disabled]), #palette [tabindex]:not([tabindex="-1"])')
        .filter(function (el) { return el.offsetParent !== null || el === d.activeElement; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey) {
        if (d.activeElement === first || !box.contains(d.activeElement)) { e.preventDefault(); last.focus(); }
      } else {
        if (d.activeElement === last || !box.contains(d.activeElement)) { e.preventDefault(); first.focus(); }
      }
    });
    var palCloseBtn = $('#pal-close');
    if (palCloseBtn) palCloseBtn.addEventListener('click', function () { palClose(); });
  }

  function bind() {
    /* 进入 */
    $('#btn-enter').addEventListener('click', enterArchive);

    /* 档案浮层 */
    d.addEventListener('click', onDossierClick, true);
    d.addEventListener('keydown', function (e) {
      if (!R.isDossierOpen()) return;
      var k = e.key;
      if (k === 'Escape') {
        e.preventDefault();
        R.closeDossier();
        Audio_.click(420, .05, 'sine', .03);
      } else if (k >= '0' && k <= '4') {
        e.preventDefault();
        applyClearance(parseInt(k, 10));   /* 浮层内部同样可以提权解译 */
      }
      e.stopPropagation();                 /* 浮层打开时独占键盘 */
    }, true);

    d.addEventListener('keydown', function (e) {
      if (R.isDossierOpen()) return;
      if (!state.booted && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); enterArchive(); }
    });

    /* HUD 控制 */
    $('#btn-hiss').addEventListener('click', function () { setHiss(!state.hiss); });
    $('#btn-sound').addEventListener('click', function () {
      state.sound = !state.sound;
      this.setAttribute('aria-pressed', String(state.sound));
      Audio_.resume();
      if (state.sound) {
        Audio_.ok(); Audio_.startDrone();
        if (state.hiss) Audio_.hissOn();
        toast('终端音效已启用 · 建议佩戴耳机');
      } else {
        Audio_.stopDrone(); Audio_.hissOff();
        toast('终端音效已关闭');
      }
    });

    /* 环境音乐 */
    var mb = $('#btn-music');
    if (mb) mb.addEventListener('click', function () { musicToggle(); });

    /* 06 编制：卡片展开时才把详情从 template 注入，避免 51 份长文一开始就参与布局 */
    var dg = $('#dept-grid');
    if (dg) {
      dg.addEventListener('click', function (e) {
        if (e.target.closest('.dos-open')) return;   /* 档案按钮有自己的处理 */
        var card = e.target.closest('.dept');
        if (!card) return;
        var more = card.querySelector('.more');
        var tpl = card.querySelector('.more-tpl');
        if (more && tpl && !more.childElementCount) {
          more.appendChild(tpl.content.cloneNode(true));
        }
        var open = card.classList.toggle('is-open');
        card.setAttribute('aria-expanded', String(open));
        if (state.sound) Audio_.key();
      });
      /* 键盘可达 */
      dg.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        var card = e.target.closest('.dept');
        if (!card) return;
        e.preventDefault();
        card.click();
      });
    }

    /* 密级许可拨盘 */
    $$('.clr-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        applyClearance(parseInt(b.getAttribute('data-clr'), 10));
      });
    });

    /* 03 互动地图 */
    bindPoi();

    /* =====================================================================
       全站检索：按钮 / Ctrl+K / ⌘K / 斜杠
       ===================================================================== */
    var sb = $('#btn-search');
    if (sb) sb.addEventListener('click', function () { palOpen(); });

    var palInp = $('#pal-input');
    if (palInp) {
      palInp.addEventListener('input', function () { palRender(this.value); });
      palInp.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); palMove(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); palMove(-1); }
        else if (e.key === 'Enter') { e.preventDefault(); palGo(); }
        else if (e.key === 'Escape') { e.preventDefault(); palClose(); }
      });
    }
    var palScrim = $('#palette .pal-scrim');
    if (palScrim) palScrim.addEventListener('click', function () { palClose(); });

    /* 捕获阶段监听，确保在任何输入框判断之前先处理 */
    d.addEventListener('keydown', function (e) {
      var k = e.key;

      if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'k') {
        e.preventDefault();
        if (pal.open) palClose(); else palOpen();
        return;
      }

      if (k === '/' && !pal.open) {
        if (R.isDossierOpen()) return;
        var t = e.target;
        if (t && typeof t.matches === 'function' &&
            t.matches('input, textarea, select, [contenteditable]')) return;
        e.preventDefault();
        palOpen();
      }
    }, true);

    /* 快捷键 */
    var buf = '';
    d.addEventListener('keydown', function (e) {
      if (R.isDossierOpen()) return;
      var t = e.target;
      if (t && typeof t.matches === 'function' && t.matches('input, textarea, select, [contenteditable]')) {
        if (e.key === 'Escape') t.blur();
        return;
      }
      var k = e.key.toLowerCase();
      if (k === 'h') { setHiss(!state.hiss); }
      else if (k === 's') { $('#btn-sound').click(); }
      else if (k === 'm') { musicToggle(); }
      else if (k === 'g') {
        e.preventDefault();
        var gsec = $('#s-glossary');
        if (gsec) gsec.scrollIntoView();
        var gi = $('#gloss-input');          /* 此前这里引用了未声明的 gi → ReferenceError */
        if (gi) setTimeout(function () { try { gi.focus(); } catch (err) { /* noop */ } }, 620);
      }
      else if (k >= '0' && k <= '4') { applyClearance(parseInt(k, 10)); }

      /* 彩蛋：输入 polaris */
      if (/^[a-z]$/.test(k)) {
        buf = (buf + k).slice(-7);
        if (buf === 'polaris') { buf = ''; polaris(); }
      }
    });

    /* 时钟：纽约时间（最古老屋当地时间）
       后缀不能硬编码 EST：3–11 月纽约实行夏令时，缩写应为 EDT。
       用 timeZoneName:'short' 让 Intl 自己给出当时的真实缩写。 */
    (function clock() {
      var el = $('#clock');
      if (!el) return;
      var fmt = null;
      try {
        fmt = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/New_York',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
          hour12: false, timeZoneName: 'short'
        });
      } catch (err) { fmt = null; }

      function tick() {
        var txt = null;
        if (fmt && fmt.formatToParts) {
          try {
            var parts = fmt.formatToParts(new Date()), hm = {}, tz = '';
            for (var i = 0; i < parts.length; i++) {
              var p = parts[i];
              if (p.type === 'timeZoneName') tz = p.value;
              else if (p.type === 'hour' || p.type === 'minute' || p.type === 'second') hm[p.type] = p.value;
            }
            if (hm.hour && hm.minute && hm.second) {
              txt = hm.hour + ':' + hm.minute + ':' + hm.second + (tz ? ' ' + tz : '');
            }
          } catch (e2) { txt = null; }
        }
        if (!txt) {
          var n = new Date(), pad = function (v) { return String(v).padStart(2, '0'); };
          txt = pad(n.getHours()) + ':' + pad(n.getMinutes()) + ':' + pad(n.getSeconds());
        }
        el.textContent = txt;
      }
      tick();
      setTimeout(clock, 1000);
    })();

    /* 补齐 9 处缺失的控件绑定 + 检索面板焦点管理 */
    bindMissing();
  }

  /* 彩蛋：北极星净化 */
  function polaris() {
    var wasHiss = state.hiss;
    if (wasHiss) setHissSilent(false);
    $('#boot-flash').classList.add('is-fire');
    setTimeout(function () { $('#boot-flash').classList.remove('is-fire'); }, 600);
    Audio_.ok();
    toast('<b style="color:#6d74ff">Polaris</b> · 共振已净化。' +
          (wasHiss ? '嘶鸣污染已解除。' : '这里没有需要清理的东西。'));
  }

  function setHissSilent(on) {
    state.hiss = on;
    d.body.classList.toggle('is-hiss', on);
    d.documentElement.style.setProperty('--hiss', on ? 1 : 0);
    var btn = $('#btn-hiss');
    if (btn) btn.setAttribute('aria-pressed', String(on));
    if (on) Audio_.hissOn(); else Audio_.hissOff();
    updateMeter();
  }

  /* =====================================================================
     启动
     ===================================================================== */
  function main() {
    R.renderAll();
    applyClearance(3, true);
    bind();
    initScroll();
    initPointer();
    decodeTitle();
    bootSequence();
    /* 深链接：首屏 hash 与后续 hashchange 都走同一入口；
       准入页阶段只记录 pending，进站后再打开（见 enterArchive） */
    initHashRoute();
    openFromHash();
    /* 楼层默认选中 */
    setTimeout(function () { selectFloor(0); }, 120);
    /* 共振指数背景波动 */
    setInterval(updateMeter, 2600);
    updateMeter();
  }

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', main);
  else main();

  w.FBCApp = {
    setHiss: setHiss,
    applyClearance: applyClearance,
    toast: toast,
    state: state,
    setHash: setHash,
    clearHash: clearHash
  };
})(window, document);
