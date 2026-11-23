#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
make_ambience.py —— 《Control》(Remedy, 2019) 中文粉丝站 · 氛围背景音乐生成器
==============================================================================

用途
----
为粉丝网站的「可选播放」背景音生成一条 72 秒、单声道、16-bit PCM 的 WAV：

    python tools/make_ambience.py

输出 <repo>/assets/audio/ambience.wav（脚本自己建目录），可直接交给网页
<audio loop> 播放，无需任何外部音频库。

风格意图（对齐 Control 的听觉标志，而不是一段无聊的正弦长音）
--------------------------------------------------------------
* 低频 drone —— 联邦控制局大楼的空调轰鸣：三个 55 Hz 附近的正弦互相拍频，
  差频 0.125 / 0.250 Hz，形成 8 秒与 4 秒一周期的缓慢起伏。
* 缓慢演进的不谐和音簇 —— 最古老之屋 / HRA 的共振嗡鸣：以 A 小调为骨架的
  5 段和声簇，段间 10 秒升余弦交叉淡化，刻意植入小二度（E–F、B–C、D–E♭）
  与三全音（D–G♯、C–F♯）制造不安。
* 金属质感泛音 —— 混凝土、钢梁、荧光灯管：六个彼此非谐的高频正弦
  （1.5–3.8 kHz），各自被极慢的 LFO（0.056–0.125 Hz）极轻地调制。
* 隐约的电流噪声 —— 带通白噪声（850–3400 Hz，一阶 IIR 自己写差分方程）
  加 140 个稀疏的静电噼啪。
* 极缓慢的呼吸 —— 周期 36 秒的全局起伏，幅度 0.55–1.0。

循环设计（无缝可循环的地基）
----------------------------
采样率 44100 Hz，N = 72 × 44100 = 3 175 200 个采样，时长恰为 72.000 秒。

1) 所有振荡器频率一律吸附到「整数个周期 / 72 秒」，即 f = n / 72（n 为整数）。
   正弦相位一律写成 φ(i) = 2π·n·i / N，于是 i = N 与 i = 0 的相位差恰好是
   2π·n，首尾样本天然同相 —— 循环点零爆音、零音量凹陷。吸附误差 ≤ 1/144 Hz
   ≈ 0.007 Hz，人耳不可辨。

   哪些层是 72 秒的整数倍周期（n = f × 72，全部为整数）：
     · 低频 drone 层：55.000 Hz(n=3960) / 55.125 Hz(n=3969) / 55.250 Hz(n=3978)，
       连同二次谐波 110.000 / 110.250 / 110.500 Hz(n=7920/7938/7956)。
       差频 0.125 Hz 与 0.250 Hz 本身就是 9/72 与 18/72，整组周期严格 72 秒。
     · 中频和声层：全部音符 110.00–220.00 Hz 及其二次谐波（n = 7920…15840），
       且 5 段交叉淡化的增益曲线定义在**环**上（段 4 → 段 0 的接缝 = 环回点），
       在 t=0 与 t=72 处取值相同。
     · 金属泛音层：1568.0 / 1876.7 / 2110.3 / 2793.8 / 3175.6 / 3718.4 Hz
       （n = 112896 … 267725）；调制 LFO 取 k/72 Hz（k = 4…9 → 0.056…0.125 Hz）。
     · 全局呼吸包络：cos(2π·2·t/72)，周期 36 秒，两个整周期铺满全曲。
     · 噪声起伏 LFO：3/72 Hz，周期 24 秒，三个整周期。

2) 白噪声本质不可周期化，故用**环形交叉淡化**：先滤波 N + 2 秒 的噪声，再把
   「越过末尾的那 2 秒」按升余弦权重叠回开头，末尾样本于是自然接上开头样本。
   滤波器从零状态启动的瞬态正好落在被淡出的那一段，成品首端是纯稳态噪声。

3) 静电噼啪事件只落在 t ∈ [1, 71] 秒，主动避开循环接缝。

4) 最后乘一个**首尾归零的升余弦循环窗口**（各 1.2 秒），把接缝两端振幅压到 0，
   双保险杜绝爆音。该窗口的谷底与 36 秒呼吸的最低点重合，听感上就是一次深呼吸，
   察觉不到是淡入淡出；同时也让自检「首尾采样接近」稳过。

依赖与回退策略
--------------
* numpy 可用 → 全程向量化（合成 1 秒级）。
* numpy 不可用 → **自动回退纯标准库**（math + wave + array + random），同一套
  上层逻辑经由一层极薄的向量原语（_ramp/_sin/_mul/...）驱动，两条路径产出同一
  设计、同一听感的音频（噪声随机源不同，无碍）。不联网、不 pip install。
* 设 CONTROL_AMBIENCE_FORCE_STDLIB=1 可强制走回退路径做回归测试。

电平
----
峰值归一化到 -3 dBFS（0.707），转 int16 前再做饱和钳位，绝不溢出。
"""

from __future__ import annotations

import math
import os
import random
import sys
import time
import wave
from array import array

# ============================================================================
# 0. 依赖探测：numpy 可用就走向量化路径，否则回退纯标准库
# ============================================================================

_FORCE_STDLIB = os.environ.get('CONTROL_AMBIENCE_FORCE_STDLIB', '') not in ('', '0', 'false', 'False')

if _FORCE_STDLIB:
    _np = None
    HAVE_NUMPY = False
    _BACKEND_NOTE = 'pure stdlib wave+math+array+random (forced via env)'
else:
    try:
        import numpy as _np  # type: ignore
        HAVE_NUMPY = True
        _BACKEND_NOTE = 'numpy %s (vectorized path)' % _np.__version__
    except Exception:                          # ImportError 及任何导入期异常
        _np = None
        HAVE_NUMPY = False
        _BACKEND_NOTE = 'pure stdlib wave+math+array+random (fallback path)'


# ============================================================================
# 1. 全局常量
# ============================================================================

SAMPLE_RATE = 44100
DURATION = 72.0                                     # 秒
N = int(round(SAMPLE_RATE * DURATION))              # 3 175 200 个采样
TAU = 2.0 * math.pi

TARGET_PEAK = 0.707                                 # -3.01 dBFS
LOOP_FADE = 1.2                                     # 首尾归零窗口长度（秒）
BREATH_CYCLES = 2                                   # 全局呼吸 2 个整周期 / 72 秒 → 周期 36 秒
BREATH_LOW, BREATH_HIGH = 0.55, 1.00                # 呼吸幅度区间（要求 0.55–1.0）

NOISE_SEED = 20190827                               # 《Control》发售日，固定种子保证可复现
CRACKLE_SEED = NOISE_SEED + 1
CRACKLE_COUNT = 140                                 # 稀疏静电噼啪事件数

OUT_PATH = os.path.normpath(os.path.join(
    os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'audio', 'ambience.wav'))


def cycles_of(freq):
    """把频率吸附成「整数个周期 / DURATION 秒」的周期数 n —— 无缝循环的地基。"""
    return max(1, int(round(freq * DURATION)))


# ============================================================================
# 2. 极薄的向量原语层：同一套上层逻辑驱动 numpy 与纯标准库两条路径
# ============================================================================

if HAVE_NUMPY:
    def _ramp(n, step, offset=0.0):
        """返回 [offset + step*i for i in range(n)] 的向量。"""
        return offset + step * _np.arange(n, dtype=_np.float64)

    def _zero(n):
        return _np.zeros(n, dtype=_np.float64)

    def _sin(x):
        return _np.sin(x)

    def _cos(x):
        return _np.cos(x)

    def _clamp01(x):
        return _np.clip(x, 0.0, 1.0)

    def _mul(a, b):
        return a * b

    def _adds(a, s):
        return a + s

    def _scale(a, s):
        return a * s

    def _imul(a, b):
        a *= b
        return a

    def _imul_scalar(a, s):
        a *= s
        return a

    def _addto(dst, start, vals):
        dst[start:start + len(vals)] += vals

    def _sumsq(vals):
        return float(_np.dot(vals, vals))

    def _peak(buf):
        return float(_np.max(_np.abs(buf))) if len(buf) else 0.0

    def _to_pcm16(buf, gain):
        """浮点缓冲 → little-endian int16，带饱和钳位（绝不溢出）。"""
        return _np.clip(_np.rint(buf * gain), -32768.0, 32767.0).astype('<i2')

else:
    def _ramp(n, step, offset=0.0):
        return [offset + step * i for i in range(n)]

    def _zero(n):
        return [0.0] * n

    def _sin(x):
        return [math.sin(v) for v in x]

    def _cos(x):
        return [math.cos(v) for v in x]

    def _clamp01(x):
        return [0.0 if v < 0.0 else (1.0 if v > 1.0 else v) for v in x]

    def _mul(a, b):
        return [u * v for u, v in zip(a, b)]

    def _adds(a, s):
        return [u + s for u in a]

    def _scale(a, s):
        return [u * s for u in a]

    def _imul(a, b):
        for i in range(len(a)):
            a[i] *= b[i]
        return a

    def _imul_scalar(a, s):
        for i in range(len(a)):
            a[i] *= s
        return a

    def _addto(dst, start, vals):
        for i, v in enumerate(vals):
            dst[start + i] += v

    def _sumsq(vals):
        return sum(v * v for v in vals)

    def _peak(buf):
        return max(max(buf), -min(buf)) if len(buf) else 0.0

    def _to_pcm16(buf, gain):
        out = array('h')
        ap = out.append
        for v in buf:
            w = v * gain
            iv = int(w + 0.5) if w >= 0.0 else int(w - 0.5)
            if iv > 32767:
                iv = 32767
            elif iv < -32768:
                iv = -32768
            ap(iv)
        return out


def _emit(buf, start, vals, stats, layer):
    """把一层的一段贡献累加进主缓冲；stats 非空时顺带统计该层能量（--stats）。"""
    _addto(buf, start, vals)
    if stats is not None:
        acc = stats.setdefault(layer, [0.0, 0])
        acc[0] += _sumsq(vals)
        acc[1] += len(vals)


# ============================================================================
# 3. 各个音层
# ============================================================================

# ---- 3.1 低频 drone 层：FBC 大楼的空调轰鸣 ----------------------------------
# 三个彼此差 0.125 / 0.250 Hz 的 55 Hz 正弦（A1 = 55 Hz，正好是中频层 A 小调
# 根音的低八度）。差频落在要求的 0.1–0.3 Hz 区间，拍频周期 8 秒 / 4 秒。
DRONE_LAYERS = (
    # (基频 Hz, 相对幅度, 相位 rad)
    (55.000, 1.00, 0.0),
    (55.125, 0.80, 1.7),
    (55.250, 0.62, 3.9),
)
DRONE_GAIN = 0.22

# ---- 3.2 中频和声层：HRA 的共振嗡鸣 ----------------------------------------
# 5 段铺满 72 秒（每段 14.4 秒），相邻段之间 10 秒升余弦交叉淡化（要求 8–12 秒）。
# 淡化增益定义在**环**上，段 4 → 段 0 的接缝与 t=0/t=72 完全连续。
# 骨架 A 小调；刻意放入的谐和与不谐和音程：
CHORDS = (
    # 0 —— A 空五度 + 小二度阴影（E–F 小二度）
    ((110.00, 0.52, 0.0), (164.81, 0.34, 1.1), (174.61, 0.30, 2.3)),
    # 1 —— 三全音悬置（D–G♯ 三全音），漂向 A
    ((146.83, 0.46, 0.4), (207.65, 0.32, 1.6), (220.00, 0.28, 2.9)),
    # 2 —— 小二度簇（B–C 小二度）+ F♯
    ((123.47, 0.44, 0.7), (130.81, 0.34, 2.0), (185.00, 0.30, 3.2)),
    # 3 —— C 小三 + 三全音（C–F♯）
    ((130.81, 0.44, 1.0), (155.56, 0.33, 2.2), (185.00, 0.29, 3.5)),
    # 4 —— 回到 A 的悬置（D–E♭ 小二度）
    ((110.00, 0.48, 1.3), (146.83, 0.32, 2.5), (155.56, 0.28, 3.8)),
)
HARMONY_GAIN = 0.30
HARMONY_XFADE = 10.0                                # 交叉淡化时长（秒）
HARMONY_H2 = 0.16                                   # 二次谐波比例（给持续音一点管风琴厚度）

# ---- 3.3 金属泛音层：远处管道 / 钢梁的非谐振铃 ------------------------------
# 六个彼此非谐的高频正弦，各被一个极慢 LFO（k/72 Hz，k = 4…9）极轻地调制。
METAL_LAYERS = (
    # (频率 Hz, 幅度, LFO 周期数 / 72 秒, LFO 相位 rad)
    (1568.0, 0.026, 4, 0.0),
    (1876.7, 0.020, 5, 1.2),
    (2110.3, 0.017, 6, 2.4),
    (2793.8, 0.014, 7, 3.6),
    (3175.6, 0.011, 8, 4.8),
    (3718.4, 0.009, 9, 5.9),
)
METAL_LFO_FLOOR = 0.25                              # 调制下限：0.25 → 1.0

# ---- 3.4 噪声纹理层：电流嘶嘶 ----------------------------------------------
NOISE_GAIN = 0.100
NOISE_FADE = 2.0                                    # 环形交叉淡化长度（秒）
NOISE_LP_HZ = 3400.0                                # 一阶低通截止
NOISE_HP_HZ = 850.0                                 # 一阶高通截止
NOISE_LFO_CYCLES = 3                                # 3/72 Hz → 周期 24 秒（要求 12–24 秒）

# ---- 3.5 静电噼啪 ----------------------------------------------------------
CRACKLE_HP_HZ = 1500.0                              # 一阶高通，让噼啪偏「静电」而非「低频噗」


def _crossfade_gain(u):
    """段内归一化位置 u ∈ [0,1) → 升余弦交叉淡化增益 g ∈ [0,1]（在环上连续）。

    淡化窗口在段内居中：u < A 时 g = 0，u > B 时 g = 1，中间 10 秒平滑过渡。
    g 只是 u 的函数，而 u 在环上是周期的，故段 4 → 段 0 的接缝自动连续。
    """
    segs = len(CHORDS)
    seg_sec = DURATION / segs
    a_u = (seg_sec - HARMONY_XFADE) * 0.5 / seg_sec
    b_u = a_u + HARMONY_XFADE / seg_sec
    t = _clamp01(_scale(_adds(u, -a_u), 1.0 / (b_u - a_u)))
    return _adds(_scale(_cos(_scale(t, math.pi)), -0.5), 0.5)      # 0.5 - 0.5·cos(πt)


def add_drone(buf, stats=None):
    """低频层：3 个 55 Hz 附近的正弦 + 弱二次谐波，形成缓慢拍频轰鸣。"""
    for freq, amp, phase in DRONE_LAYERS:
        n = cycles_of(freq)
        wave = _sin(_ramp(N, TAU * n / N, phase))
        _emit(buf, 0, _imul_scalar(wave, amp * DRONE_GAIN), stats, 'drone')
        n2 = 2 * n                                             # 2f 仍是 1/72 Hz 的整数倍
        h2 = _sin(_ramp(N, TAU * n2 / N, phase * 1.7))
        _emit(buf, 0, _imul_scalar(h2, amp * DRONE_GAIN * 0.12), stats, 'drone')


def add_harmony(buf, stats=None):
    """中频层：5 段环形交叉淡化的和声簇（含小二度、三全音）。"""
    segs = len(CHORDS)
    seg_len = N // segs
    assert seg_len * segs == N, 'N 必须能被和声段数整除'

    for i in range(segs):
        start = i * seg_len
        u = _ramp(seg_len, 1.0 / seg_len, 0.0)
        g = _crossfade_gain(u)                                 # 下一段的淡入权重
        fade_out = _adds(_scale(g, -1.0), 1.0)                 # 本段的淡出权重 = 1 - g

        for notes, curve in ((CHORDS[i], fade_out),
                             (CHORDS[(i + 1) % segs], g)):
            for freq, amp, phase in notes:
                # 相位沿全局样本轴计算，保证环回处严格同相
                n = cycles_of(freq)
                base = _sin(_ramp(seg_len, TAU * n / N, TAU * n * start / N + phase))
                _emit(buf, start, _mul(_scale(base, amp * HARMONY_GAIN), curve),
                      stats, 'harmony')
                n2 = 2 * n
                h2 = _sin(_ramp(seg_len, TAU * n2 / N, TAU * n2 * start / N + phase * 1.7))
                _emit(buf, start,
                      _mul(_scale(h2, amp * HARMONY_GAIN * HARMONY_H2), curve),
                      stats, 'harmony')


def add_metal(buf, stats=None):
    """金属泛音层：非谐高频正弦 × 极慢 LFO（0.056–0.125 Hz），音量很低。"""
    floor_ = METAL_LFO_FLOOR
    for freq, amp, lfo_cycles, lfo_phase in METAL_LAYERS:
        n = cycles_of(freq)
        mod = _sin(_ramp(N, TAU * lfo_cycles / N, lfo_phase))   # -1 … 1
        # mod → floor + (1-floor)·(0.5 + 0.5·x)  =  A + B·x
        a_const = floor_ + (1.0 - floor_) * 0.5
        b_const = (1.0 - floor_) * 0.5
        mod = _adds(_scale(mod, b_const), a_const)
        carrier = _sin(_ramp(N, TAU * n / N, 0.0))
        _imul(carrier, mod)
        del mod
        _emit(buf, 0, _imul_scalar(carrier, amp), stats, 'metal')


def add_noise(buf, stats=None):
    """噪声纹理层：带通白噪声 + 周期 24 秒的起伏 LFO；环形交叉淡化保证可循环。"""
    fade_len = int(NOISE_FADE * SAMPLE_RATE)
    total = N + fade_len

    # --- 白噪声（统一用 Python list，便于下面的 IIR 逐样本递推）---
    if HAVE_NUMPY:
        white = _np.random.default_rng(NOISE_SEED).uniform(-1.0, 1.0, total).tolist()
    else:
        rnd = random.Random(NOISE_SEED)
        white = [rnd.uniform(-1.0, 1.0) for _ in range(total)]

    # --- 一阶 IIR 带通：自己写差分方程（IIR 有反馈，只能逐样本递推）---
    #     低通 y[n] = y[n-1] + a·(x[n] - y[n-1]),  a = 2π·fc·dt / (1 + 2π·fc·dt)
    #     高通 y[n] = b·(y[n-1] + x[n] - x[n-1]),  b = 1 / (1 + 2π·fc·dt)
    dt = 1.0 / SAMPLE_RATE
    lp_a = TAU * NOISE_LP_HZ * dt
    lp_a = lp_a / (1.0 + lp_a)
    hp_b = 1.0 / (1.0 + TAU * NOISE_HP_HZ * dt)

    band = array('d', bytes(8 * total))
    y1 = 0.0
    y2 = 0.0
    px = 0.0
    for i in range(total):
        x = white[i]
        y1 += lp_a * (x - y1)                                  # 一阶低通
        y2 = hp_b * (y2 + y1 - px)                             # 一阶高通
        px = y1
        band[i] = y2
    del white

    # --- 环形交叉淡化：把末尾 2 秒按升余弦权重叠回开头 ---
    #     out[i] = band[N+i]·(1-w_i) + band[i]·w_i,  w: 0 → 1
    #     i=0 时 out[0] = band[N]（滤波器已稳态），紧随 out[N-1] = band[N-1] → 无缝
    step_lfo = TAU * NOISE_LFO_CYCLES / N
    w_lin = _adds(_scale(_cos(_ramp(fade_len, math.pi / fade_len, 0.0)), -0.5), 0.5)
    lfo_head = _adds(_scale(_sin(_ramp(fade_len, step_lfo, 0.0)), 0.5), 0.5)
    head = [(band[N + i] * (1.0 - w_lin[i]) + band[i] * w_lin[i]) * lfo_head[i] * NOISE_GAIN
            for i in range(fade_len)]
    _emit(buf, 0, head, stats, 'noise')

    tail_len = N - fade_len
    tail = band[fade_len:N]
    lfo_tail = _adds(_scale(_sin(_ramp(tail_len, step_lfo, step_lfo * fade_len)), 0.5), 0.5)
    if HAVE_NUMPY:
        tail = tail * lfo_tail * NOISE_GAIN
    else:
        tail = [tail[i] * lfo_tail[i] * NOISE_GAIN for i in range(tail_len)]
    _emit(buf, fade_len, tail, stats, 'noise')


def add_crackle(buf, stats=None):
    """稀疏静电噼啪：带高通的一阶噪声爆发，只落在 t ∈ [1, 71] 秒，避开循环接缝。"""
    rnd = random.Random(CRACKLE_SEED)
    dt = 1.0 / SAMPLE_RATE
    hp_b = 1.0 / (1.0 + TAU * CRACKLE_HP_HZ * dt)

    for _ in range(CRACKLE_COUNT):
        start = int(rnd.uniform(1.0, DURATION - 1.0) * SAMPLE_RATE)
        ln = int(rnd.uniform(0.006, 0.040) * SAMPLE_RATE)
        if start + ln >= N:
            continue
        amp = rnd.uniform(0.012, 0.045)
        decay = rnd.uniform(35.0, 110.0)
        y = 0.0
        px = 0.0
        seg = [0.0] * ln
        for k in range(ln):
            x = rnd.uniform(-1.0, 1.0)
            y = hp_b * (y + x - px)
            px = x
            seg[k] = amp * math.exp(-decay * k * dt) * y
        _emit(buf, start, seg, stats, 'crackle')


# ============================================================================
# 4. 全局包络：极慢呼吸 × 首尾归零窗口
# ============================================================================

def apply_master_envelope(buf):
    """乘上 极慢呼吸（周期 36 秒，幅度 0.55–1.0）× 首尾归零的升余弦循环窗口。"""
    wf = int(LOOP_FADE * SAMPLE_RATE)
    span = BREATH_HIGH - BREATH_LOW
    mid = BREATH_LOW + span * 0.5

    if HAVE_NUMPY:
        i = _np.arange(N, dtype=_np.float64)
        env = mid - (span * 0.5) * _np.cos(TAU * BREATH_CYCLES * i / N)
        k = _np.arange(wf, dtype=_np.float64)
        rise = 0.5 - 0.5 * _np.cos(_np.pi * k / wf)
        env[:wf] *= rise
        env[N - wf:] *= rise[::-1]
        buf *= env
        return buf

    env = [mid - (span * 0.5) * math.cos(TAU * BREATH_CYCLES * i / N) for i in range(N)]
    for k in range(wf):
        r = 0.5 - 0.5 * math.cos(math.pi * k / wf)
        env[k] *= r
        env[N - 1 - k] *= r
    return _imul(buf, env)


# ============================================================================
# 5. 主流程
# ============================================================================

def build(stats=None):
    """合成整条 72 秒音轨，返回 (pcm16, 各阶段耗时元组)。"""
    t0 = time.perf_counter()
    buf = _zero(N)
    add_drone(buf, stats)
    t1 = time.perf_counter()
    add_harmony(buf, stats)
    t2 = time.perf_counter()
    add_metal(buf, stats)
    add_noise(buf, stats)
    add_crackle(buf, stats)
    t3 = time.perf_counter()

    apply_master_envelope(buf)

    peak = _peak(buf)
    if peak <= 0.0:
        raise RuntimeError('合成结果为空，无法归一化')
    pcm = _to_pcm16(buf, (TARGET_PEAK / peak) * 32767.0)
    t4 = time.perf_counter()
    return pcm, (t1 - t0, t2 - t1, t3 - t2, t4 - t3)


def write_wav(pcm):
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with wave.open(OUT_PATH, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(pcm.tobytes())


def report(stats, detail, elapsed):
    """读回成品做自检并打印运行报告。"""
    size = os.path.getsize(OUT_PATH)
    with wave.open(OUT_PATH, 'rb') as w:
        nch, fr, sw, nframes = w.getnchannels(), w.getframerate(), w.getsampwidth(), w.getnframes()
        raw = w.readframes(nframes)
    samples = array('h')
    samples.frombytes(raw)
    peak_i = max(max(samples), -min(samples))
    peak_f = peak_i / 32767.0
    seam = abs(samples[1000] - samples[N - 1000]) / 32767.0

    print('=== Control (2019) fan-site ambience ===')
    print('backend  : %s' % _BACKEND_NOTE)
    print('format   : %d Hz / %s / %d-bit PCM' % (
        fr, 'mono' if nch == 1 else '%d-ch' % nch, sw * 8))
    print('duration : %.2f s  (%d frames)' % (nframes / fr, nframes))
    print('peak     : %.5f  (%.2f dBFS)   int16 max|sample| = %d' % (
        peak_f, 20.0 * math.log10(peak_f), peak_i))
    print('seam     : |x[1000] - x[N-1000]| = %.5f   (need < 0.15)' % seam)
    print('file     : %s' % OUT_PATH)
    print('size     : %d bytes  (%.2f MiB)' % (size, size / 1048576.0))
    print('elapsed  : %.2f s   [drone %.2f | harmony %.2f | metal+noise+crackle %.2f | encode %.2f]'
          % ((elapsed,) + detail))
    if stats:
        total_e = sum(a[0] for a in stats.values()) or 1.0
        print('layers   : (RMS across the whole 72 s; partials treated as orthogonal)')
        for name in ('drone', 'harmony', 'metal', 'noise', 'crackle'):
            acc = stats.get(name)
            if acc and acc[0] > 0.0:
                print('   %-8s RMS %.5f    %5.1f%% of total energy' % (
                    name, math.sqrt(acc[0] / N), 100.0 * acc[0] / total_e))
    return peak_f, seam, size


def main():
    try:
        sys.stdout.reconfigure(errors='replace')
    except Exception:
        pass

    want_stats = any(a in ('-s', '--stats') for a in sys.argv[1:])
    t0 = time.perf_counter()
    stats = {} if want_stats else None
    pcm, detail = build(stats)
    write_wav(pcm)
    report(stats, detail, time.perf_counter() - t0)


if __name__ == '__main__':
    main()
