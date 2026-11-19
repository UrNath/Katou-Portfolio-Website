"""Generates the Works wireframe boards (standalone html + canvas .dc.html source)."""
import json, os, sys

CSS = """
.wf{font-family:Inter,Arial,Helvetica,sans-serif;color:#1a1a1a;background:#fff;box-sizing:border-box;position:relative;font-size:15px;line-height:1.35}
.wf *{box-sizing:border-box}
.wf.d{width:1440px}.wf.m{width:390px}
.wf button,.wf input{font:inherit;color:inherit}
.wf h1,.wf h2,.wf p{margin:0}
.wf :focus-visible{outline:3px solid #1a1a1a;outline-offset:2px}
.wf .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.wf .nav{height:56px;border-bottom:2px solid #1a1a1a;display:flex;align-items:center;justify-content:space-between;padding:0 80px;background:#f0f0f0}
.wf.m .nav{padding:0 16px}
.wf .logo{font-weight:800;font-size:18px;border:2px dashed #777;padding:5px 12px}
.wf .links{display:flex;gap:6px}
.wf .links span{min-height:44px;display:flex;align-items:center;padding:0 14px;font-weight:600}
.wf .links .on{border-bottom:3px solid #1a1a1a}
.wf .menu{min-height:44px;min-width:44px;border:2px solid #1a1a1a;background:#fff;font-weight:700;padding:0 12px;border-radius:6px}
.wf .page{padding:28px 80px 56px}
.wf.m .page{padding:20px 16px 40px}
.wf .a{position:relative}
.wf .pin.in{position:static;display:inline-flex;margin-left:8px;vertical-align:middle;border:0;flex:none}
.wf .pin{position:absolute;top:-12px;left:-12px;width:24px;height:24px;border-radius:50%;background:#1a1a1a;color:#fff;font-size:12px;font-weight:700;font-style:normal;display:flex;align-items:center;justify-content:center;z-index:6;border:2px solid #fff}
.wf .eyebrow{font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#555}
.wf h1{font-size:44px;line-height:1.05;font-weight:800;margin:4px 0 6px}
.wf.m h1{font-size:34px}
.wf .count{color:#444;font-size:15px}
.wf .head{display:flex;justify-content:space-between;align-items:flex-end;gap:24px}
.wf.m .head{display:block}
.wf .tools{display:flex;gap:12px;align-items:center}
.wf.m .tools{margin-top:14px}
.wf .srch{display:flex;align-items:center;gap:8px;min-height:44px;border:2px solid #1a1a1a;border-radius:8px;padding:0 12px;background:#fff;width:320px;color:#555}
.wf.m .srch{flex:1;width:auto;min-width:0}
.wf .srch input{border:0;outline:0;background:transparent;width:100%;min-width:0;font-size:15px}
.wf .srch input::placeholder{color:#555}
.wf .srch:focus-within{outline:3px solid #1a1a1a;outline-offset:2px}
.wf .sort{min-height:44px;border:2px solid #1a1a1a;border-radius:8px;background:#fff;font-weight:700;padding:0 14px;white-space:nowrap;display:flex;align-items:center;gap:6px}
.wf .jump{display:flex;gap:4px;margin-top:20px;border-bottom:2px solid #bbb}
.wf .jump a{min-height:44px;display:flex;align-items:center;gap:6px;padding:0 14px;color:#1a1a1a;font-weight:700;text-decoration:none;font-size:15px}
.wf.m .jump{margin-top:14px;gap:0}
.wf.m .jump a{padding:0 8px;font-size:13.5px;flex:1;justify-content:center}
.wf .lbl{font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#555}
.wf .chiprow{margin-top:20px;display:flex;align-items:center;gap:14px}
.wf.m .chiprow{margin-top:14px;display:block}
.wf.m .chiprow .lbl{display:block;margin-bottom:6px}
.wf .chips{display:flex;flex-wrap:nowrap;gap:8px;min-width:0}
.wf .chipwrap{min-width:0}
.wf.m .chips{flex-wrap:nowrap;overflow-x:auto;scroll-snap-type:x mandatory;padding:2px 2px 6px;-webkit-mask-image:linear-gradient(to right,#000 88%,transparent);mask-image:linear-gradient(to right,#000 88%,transparent)}
.wf .chip{min-height:44px;border:2px solid #1a1a1a;border-radius:999px;background:#fff;font-weight:700;padding:0 16px 0 8px;display:inline-flex;align-items:center;gap:8px;white-space:nowrap;flex:none;scroll-snap-align:start}
.wf .chip.on{background:#1a1a1a;color:#fff}
.wf .chip.all{padding-left:14px}
.wf .av{width:26px;height:26px;border-radius:50%;background:#c4c4c4;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#1a1a1a}
.wf .chip.on .av{background:#fff}
.wf .sec{margin-top:36px}
.wf.m .sec{margin-top:28px}
.wf .sh{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.wf .sh h2{font-size:24px;font-weight:800}
.wf.m .sh h2{font-size:20px}
.wf .num{border:2px solid #1a1a1a;border-radius:999px;padding:1px 10px;font-weight:700;font-size:13px;background:#e4e4e4}
.wf .stabs{display:flex;gap:6px;margin-left:12px;flex-wrap:wrap}
.wf.m .stabs{margin-left:0;width:100%;overflow-x:auto}
.wf .stab{min-height:44px;border:2px solid #1a1a1a;border-radius:8px;background:#fff;font-weight:700;padding:0 14px;white-space:nowrap}
.wf .stab.on{background:#1a1a1a;color:#fff}
.wf .grid{display:grid;gap:16px}
.wf.m .grid{gap:12px 8px}
.wf .c6{grid-template-columns:repeat(6,1fr)}.wf .c4{grid-template-columns:repeat(4,1fr)}.wf .c3{grid-template-columns:repeat(3,1fr)}.wf .c2{grid-template-columns:repeat(2,1fr)}.wf .c1{grid-template-columns:1fr}
.wf .card{min-width:0}
.wf .pw{position:relative}
.wf .poster{display:block;width:100%;position:relative;padding:0;border:2px solid #777;border-radius:6px;background:#e4e4e4;cursor:pointer;overflow:hidden}
.wf .ps{aspect-ratio:9/16}.wf .pl{aspect-ratio:16/9}
.wf .x{position:absolute;inset:0;background:linear-gradient(to top right,transparent calc(50% - 1px),#9a9a9a calc(50% - 1px),#9a9a9a calc(50% + 1px),transparent calc(50% + 1px)),linear-gradient(to top left,transparent calc(50% - 1px),#9a9a9a calc(50% - 1px),#9a9a9a calc(50% + 1px),transparent calc(50% + 1px)),#e4e4e4}
.wf .dur{position:absolute;right:6px;top:6px;background:#1a1a1a;color:#fff;font-size:12px;font-weight:700;padding:2px 6px;border-radius:4px;z-index:1}
.wf .sel .poster{border:4px solid #1a1a1a}
.wf .ov{position:absolute;left:4px;right:4px;bottom:4px;background:rgba(26,26,26,.88);color:#fff;border-radius:4px;padding:8px;display:flex;flex-direction:column;gap:6px;pointer-events:none;font-size:13px}
.wf .ov .tag{font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
.wf .ov .ttl{font-weight:700}
.wf .bar{display:block;height:4px;background:#777;border-radius:2px}
.wf .bar i{display:block;height:4px;background:#fff;border-radius:2px}
.wf .ovt{position:absolute;left:4px;right:4px;bottom:6px;display:flex;flex-direction:column;gap:6px;align-items:center}
.wf .ovt .bar{width:100%}
.wf .open{min-height:44px;min-width:72px;border:2px solid #1a1a1a;background:#fff;font-weight:800;border-radius:8px;padding:0 12px}
.wf .cap{margin-top:8px;display:flex;flex-direction:column;gap:2px;font-size:13px}
.wf .cap b{font-size:14px}
.wf .cap span{color:#444}
.wf .more{margin-top:16px;min-height:44px;border:2px dashed #777;background:#fff;border-radius:8px;font-weight:700;padding:0 18px;color:#444}
.wf.m .more{width:100%}
.wf .back{margin-bottom:14px}
.wf .backbtn{min-height:44px;border:2px solid #1a1a1a;border-radius:8px;background:#fff;font-weight:700;padding:0 16px 0 12px;display:inline-flex;align-items:center;gap:8px}
.wf .prof{display:flex;gap:32px;align-items:center}
.wf.m .prof{display:block}
.wf .avatar{border-radius:50%;background:#cfcfcf;border:3px solid #777;display:flex;align-items:center;justify-content:center;font-weight:800;color:#444;flex:none}
.wf .pinfo{flex:1;min-width:0}
.wf .handle{color:#444;font-weight:600;margin-top:2px}
.wf .bio{margin-top:10px;max-width:640px;color:#333}
.wf .bio i{font-style:normal;border:1px dashed #888;padding:0 4px}
.wf .stats{margin-top:10px;font-weight:700;display:inline-block}
.wf .cta{min-height:48px;display:inline-flex;align-items:center;justify-content:center;padding:0 28px;background:#1a1a1a;color:#fff;font-weight:800;border-radius:8px;text-decoration:none;font-size:16px;border:2px solid #1a1a1a}
.wf.m .cta{width:100%;margin-top:14px}
.wf .pmob{display:flex;gap:14px;align-items:center}
.wf .trow{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;border-bottom:2px solid #1a1a1a;margin-top:28px}
.wf.m .trow{display:block;margin-top:18px;border-bottom:0}
.wf .tabs{display:flex;gap:4px}
.wf.m .tabs{border-bottom:2px solid #1a1a1a}
.wf.m .tabs .tab{flex:1;padding:4px;font-size:14px;min-height:56px;display:flex;flex-direction:column;justify-content:center;align-items:center;line-height:1.15}
.wf.m .tabs .tab .n{margin:2px 0 0;font-size:13px}
.wf.m .cta{margin-bottom:20px}
.wf .tab{min-height:48px;border:0;border-bottom:5px solid transparent;background:transparent;font-weight:700;padding:0 18px;font-size:16px}
.wf .tab.on{border-bottom-color:#1a1a1a;font-weight:800}
.wf .tab .n{color:#444;font-weight:600;margin-left:4px}
.wf .trow .tools{padding-bottom:6px}
.wf.m .trow .tools{margin-top:12px}
.wf .gridwrap{margin-top:22px}
.wf.m .gridwrap{margin-top:14px}
.wf .empty{margin-top:22px;border:2px dashed #777;border-radius:12px;padding:56px 24px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;background:#fafafa}
.wf.m .empty{padding:36px 16px;margin-top:14px}
.wf .empty h2{font-size:22px;font-weight:800}
.wf .empty p{color:#444;max-width:460px}
.wf .ico{width:72px;height:72px;border-radius:12px;border:2px solid #9a9a9a;background:#e4e4e4}
.wf .acts{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:6px}
.wf.m .acts{flex-direction:column;width:100%}
.wf .btn2{min-height:48px;border:2px solid #1a1a1a;border-radius:8px;background:#fff;font-weight:800;padding:0 22px}
.wf .foot{margin-top:48px;border-top:2px solid #bbb;padding-top:16px;color:#555;font-size:13px}
.wf.cmp .back{margin-bottom:8px}
.wf.cmp .bio{margin-top:4px}
.wf.cmp .stats{margin-top:6px}
.wf.cmp .cta{margin-top:10px;margin-bottom:12px}
.wf.cmp .tabs{margin-top:0}
.wf.cmp .trow{margin-top:10px}
.wf .lane{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-top:20px;border-bottom:2px solid #bbb}
.wf.m .lane{display:block;margin-top:14px}
.wf .lane .jump{margin-top:0;border-bottom:0}
.wf.m .lane .jump{border-bottom:2px solid #bbb}
.wf .cf{display:flex;align-items:center;gap:8px;padding-bottom:6px}
.wf.m .cf{margin-top:12px;padding-bottom:0}
.wf.m .chips{overflow:visible;-webkit-mask-image:none;mask-image:none;flex-wrap:nowrap;padding:0}
.wf .carr{width:44px;height:44px;border:2px solid #1a1a1a;border-radius:50%;background:#fff;display:inline-flex;align-items:center;justify-content:center;flex:none}
.wf .mbar{padding:8px 16px;border-bottom:1px solid #ccc;background:#fff}
.wf .mbar .srch{width:100%}
.wf .mbar .pin{top:-6px;left:4px}
.wf .pager{display:flex;gap:8px;margin-left:auto}
.wf.m .pager{display:none}
.wf .strip .pin{top:8px;left:8px}
.wf .prow{display:flex;justify-content:flex-end;margin-top:14px}
.wf .strip{--gap:16px;display:grid;grid-auto-flow:column;grid-auto-columns:calc((100% - (var(--n) - 1) * var(--gap)) / var(--n));gap:16px var(--gap);overflow:hidden;padding:6px 4px;margin:-6px -4px}
.wf.m .strip{--gap:8px;gap:12px 8px}
.wf .prog{height:4px;background:#ccc;border-radius:2px;margin-top:12px}
.wf .prog i{display:block;height:4px;background:#1a1a1a;border-radius:2px}
.wf .sticky{font-size:12px;font-weight:700;color:#555;margin-top:4px}
.wf .spec{padding:56px 80px 72px;font-size:15px}
.wf .spec h1{font-size:36px;margin-bottom:6px}
.wf .sg{display:grid;grid-template-columns:repeat(3,1fr);gap:40px;margin-top:28px}
.wf .sg h2{font-size:20px;margin-bottom:10px;border-bottom:2px solid #1a1a1a;padding-bottom:6px}
.wf .sg ol,.wf .sg ul{margin:0;padding-left:0;list-style:none;display:flex;flex-direction:column;gap:8px}
.wf .sg li{display:flex;gap:10px;align-items:flex-start;line-height:1.4}
.wf .sg li .pin{position:static;flex:none;margin-top:1px}
.wf .sg ul li:before{content:"\\2022";font-weight:800}
.wf .sg code{background:#eee;padding:1px 5px;border-radius:4px;font-size:13px}
"""

# ---------- icons ----------
def svg(path, size=18, extra=''):
    return f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" {extra}>{path}</svg>'
I_SEARCH = svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>')
I_CHECK = svg('<path d="M5 12l5 5 9-10"/>', 16)
I_BACK = svg('<path d="M15 5l-7 7 7 7"/>')
I_NEXT = svg('<path d="M9 5l7 7-7 7"/>')
I_PREV = svg('<path d="M15 5l-7 7 7 7"/>')
I_DOWN = svg('<path d="M6 9l6 6 6-6"/>', 14)

def pin(n, inline=False):
    n = n - 1 if n > 4 else n
    return f'<i class="pin{" in" if inline else ""}">{n}</i>'

# ---------- parts ----------
def nav(m, n1=True):
    p = pin(1, True) if n1 else ''
    if m:
        return f'<div class="nav a"><span class="logo">NassuKatou</span>{p}<button type="button" class="menu" aria-label="Open menu">Menu</button></div>'
    return f'<div class="nav a"><span style="display:flex;align-items:center"><span class="logo">NassuKatou</span>{p}</span><div class="links"><span>Home</span><span class="on">Works</span><span>Clients</span><span>Pricing</span><span>Terms</span><span>Contact</span></div></div>'

def search(pn=None):
    p = pin(pn) if pn else ''
    return f'<label class="srch a">{p}<span class="sr">Search works</span>{I_SEARCH}<input type="search" placeholder="Search titles or clients"></label>'

def sortbtn(pn=None, m=False):
    p = pin(pn) if pn else ''
    t = 'Sort' if m else 'Sort: Newest'
    return f'<button type="button" class="sort a" aria-label="Sort works, currently Newest first">{p}{t} {I_DOWN}</button>'

def chips(m=False, pn=5):
    names = [('All', ''), ('Pidge', 'P'), ('Miuoni', 'M'), ('chiseyi', 'C'), ('Lomi', 'L')]
    if m:
        names = names[:3]
    out = []
    for name, ini in names:
        on = name == 'All'
        cls = 'chip' + (' on' if on else '') + (' all' if name == 'All' else '')
        inner = (I_CHECK + name) if name == 'All' else f'<span class="av" aria-hidden="true">{ini}</span>{name}'
        out.append(f'<button type="button" class="{cls}" aria-pressed="{"true" if on else "false"}">{inner}</button>')
    arrow = f'<button type="button" class="carr" aria-label="Show more creators">{I_NEXT}</button>' if m else ''
    return f'<div class="cf a">{pin(pn)}<div class="chips" role="group" aria-label="Filter by creator">{"".join(out)}</div>{arrow}</div>'

def card(kind, state=None, cap=True, pn=None, name='Work title placeholder'):
    asp = 'ps' if kind == 's' else 'pl'
    dur = '<span class="dur">0:00</span>' if kind in ('s', 'l') else ''
    ov = ''
    if state == 'hov':
        ov = '<span class="ov"><span class="tag">Preview playing</span><span class="ttl">Title placeholder</span><span class="bar"><i style="width:40%"></i></span></span>'
    elif state == 'tap':
        ov = '<span class="ovt"><span class="bar"><i style="width:40%"></i></span><button type="button" class="open" aria-label="Open full video">Open</button></span>'
    c = ''
    if cap:
        credit = '<span>Edit for @[handle]</span>' if kind in ('s', 'l') else ''
        c = f'<div class="cap"><b>Title placeholder</b>{credit}</div>'
    p = pin(pn) if pn else ''
    sel = ' sel' if state else ''
    return f'<div class="card{sel}"><div class="pw a">{p}<button type="button" class="poster {asp}" aria-label="{name}, preview"><span class="x"></span>{dur}</button>{ov}</div>{c}</div>'

def grid(cols, cards):
    return f'<div class="grid c{cols}">{"".join(cards)}</div>'

def strip(n, rows, cards, m, pct):
    gap = 8 if m else 16
    return (f'<div class="sbox"><div class="strip" style="--n:{n};--gap:{gap}px;grid-template-rows:repeat({rows},auto)">{"".join(cards)}</div>'
            f'<div class="prog" aria-hidden="true"><i style="width:{pct}%"></i></div></div>')

def pager(label):
    return (f'<div class="pager"><button type="button" class="carr" aria-label="Previous {label}">{I_PREV}</button>'
            f'<button type="button" class="carr" aria-label="Next {label}">{I_NEXT}</button></div>')

def section(title, count, body, subtabs=False, pn=None):
    pg = pager(title.lower())
    st = ''
    if subtabs:
        st = '<div class="stabs" role="tablist" aria-label="Long-form group"><button type="button" role="tab" aria-selected="true" class="stab on">Vlogs</button><button type="button" role="tab" aria-selected="false" class="stab">MVs</button><button type="button" role="tab" aria-selected="false" class="stab">Normal Videos</button></div>'
    p = pin(pn, True) if pn else ''
    return f'<section class="sec"><div class="sh"><h2>{title}</h2><span class="num">{count}</span>{p}{st}{pg}</div>{body}</section>'

def jump(m):
    lab = ('Short-form', 'Long-form', 'Thumbnails') if m else ('Short-form videos', 'Long-form videos', 'Thumbnails')
    return f'<nav class="jump" aria-label="Jump to section">' + ''.join(f'<a href="#">{l}' + ('' if m else ' <span class="num">[N]</span>') + '</a>' for l in lab) + '</nav>'

def tabs(active, m, pn=13):
    labs = [('short', 'Short-form', '[Y]'), ('long', 'Long-form', '[Y]'), ('thumb', 'Thumbnails', '[Z]')]
    out = []
    for key, lab, n in labs:
        on = key == active
        nn = '0' if (active == 'long' and key == 'long') else n
        out.append(f'<button type="button" role="tab" aria-selected="{"true" if on else "false"}" class="tab{" on" if on else ""}">{lab}<span class="n">({nn})</span></button>')
    return f'<div class="tabs a" role="tablist" aria-label="Works by format">{pin(pn)}{"".join(out)}</div>'

def profile(m, compact=False):
    back = f'<div class="back a">{pin(9)}<button type="button" class="backbtn">{I_BACK} Back to all works</button></div>'
    if m:
        size = 56 if compact else 72
        bio = '<p class="bio" style="margin-top:8px;font-size:14px"><i>[Bio placeholder, 2 lines max]</i></p>'
        return (back + f'<div class="pmob"><div class="avatar a" style="width:{size}px;height:{size}px;font-size:{size//3}px">{pin(10)}C</div>'
                f'<div><h1 style="font-size:{28 if compact else 30}px;margin:0">chiseyi</h1><p class="handle">@[handle placeholder]</p></div></div>'
                + bio + f'<p class="stats">X shorts · Y long-form · Z thumbnails{pin(11, True)}{pin(17, True) if compact else ""}</p>'
                + f'<a class="cta a" href="#">{pin(12)}Start a project</a>')
    return (back + f'<div class="prof"><div class="avatar a" style="width:136px;height:136px;font-size:44px">{pin(10)}C</div>'
            f'<div class="pinfo"><h1 style="margin:0">chiseyi</h1><p class="handle">@[handle placeholder]</p>'
            f'<p class="bio"><i>[Bio placeholder: 1–2 sentences, text to be supplied]</i></p>'
            f'<p class="stats">X shorts · Y long-form · Z thumbnails{pin(11, True)}</p></div>'
            f'<a class="cta a" href="#">{pin(12)}Start a project</a></div>')

def toolbar(pns=(3, 4), m=False):
    return f'<div class="tools">{search(pns[0])}</div>'

def mbar(pn=3):
    return f'<div class="mbar a">{pin(pn)}{search()}</div>'

FOOT = '<div class="foot">Footer placeholder (unchanged from the site)</div>'

def wrap(m, inner, cls=''):
    return f'<div class="wf {"m" if m else "d"}{cls}">{inner}</div>'

# ---------- boards ----------
def default_board(m):
    title = f'<div><p class="eyebrow">Portfolio</p><h1>Works</h1><p class="count">[N] video edits · [M] thumbnails{pin(2, True)}</p></div>'
    if m:
        top = mbar() + '<div class="page">' + f'<div class="head">{title}</div>' + f'<div class="lane">{jump(True)}{chips(True)}</div>'
        body = (top
            + section('Short-form videos', '[N]', strip(3, 1, [card('s', cap=False, pn=7 if i == 0 else None) for i in range(3)], True, 25), pn=6)
            + section('Long-form videos', '[N]', strip(1, 1, [card('l')], True, 17), subtabs=True)
            + section('Thumbnails', '[M]', strip(2, 1, [card('t') for _ in range(2)], True, 25)) + FOOT + '</div>')
        return wrap(m, nav(m) + body)
    head = f'<div class="head">{title}<div class="tools">{search(3)}</div></div>'
    body = (head + f'<div class="lane">{jump(False)}{chips(False)}</div>'
        + section('Short-form videos', '[N]', strip(6, 1, [card('s', pn=7 if i == 0 else None) for i in range(6)], False, 50), pn=6)
        + section('Long-form videos', '[N]', strip(3, 1, [card('l') for _ in range(3)], False, 50), subtabs=True)
        + section('Thumbnails', '[M]', strip(4, 1, [card('t') for _ in range(4)], False, 50)) + FOOT)
    return wrap(m, nav(m) + f'<div class="page">{body}</div>')

def creator_board(m, compact=False):
    if m:
        cards = [card('s', state='tap' if i == 1 else None, cap=False, pn=15 if i == 1 else None) for i in range(6)]
        body = (profile(True, compact) + tabs('short', True)
                + f'<div class="gridwrap a">{pin(14)}{strip(3, 2, cards, True, 33)}</div>')
        return wrap(m, nav(m) + mbar() + f'<div class="page">{body}</div>', ' cmp' if compact else '')
    cards = [card('s', state='hov' if i == 2 else None, pn=8 if i == 2 else None) for i in range(12)]
    body = (profile(False) + f'<div class="trow">{tabs("short", False)}<div class="tools">{search(3)}</div></div>'
            + '<p class="sticky">Tabs row sticks under the nav while the grid scrolls</p>'
            + f'<div class="prow">{pager("short-form")}</div>'
            + f'<div class="gridwrap a" style="margin-top:12px">{pin(14)}{strip(6, 2, cards, False, 33)}</div>' + FOOT)
    return wrap(m, nav(m) + f'<div class="page">{body}</div>')

def empty_board(m):
    emp = ('<div class="empty a">' + pin(16) + '<div class="ico" aria-hidden="true"></div><h2>No long-form videos for chiseyi yet</h2>'
           '<p>[Placeholder copy: nothing has been added to this tab yet.]</p>'
           '<div class="acts"><button type="button" class="btn2">See short-form (X)</button><button type="button" class="btn2">Back to all works</button></div></div>')
    if m:
        return wrap(m, nav(m) + mbar() + '<div class="page">' + profile(True) + tabs('long', True) + emp + '</div>')
    body = profile(False) + f'<div class="trow">{tabs("long", False)}<div class="tools">{search(3)}</div></div>' + emp + FOOT
    return wrap(m, nav(m) + f'<div class="page">{body}</div>')

NOTES = [
 (1, 'Site nav unchanged (existing SiteBar).'),
 (2, 'Title and live count of items that match the current filters (existing).'),
 (3, 'Search by title or client (existing), stored as <code>q</code> in the URL. Desktop: top right, easing down into the tabs row in creator state. Mobile: a bar under the nav that stays fixed at the top while scrolling. It sits above the content in the page flow, never over it, and is in the same place in both states.'),
 (5, 'Creator chips in the same lane as the content-type links, pushed to the right, same order. Mobile: the lane drops below the links. Only whole chips are shown; a › arrow appears when more creators exist (and ‹ after moving on). Active = filled + check, not colour. <code>aria-pressed</code>, 44px tall. Choosing one starts the profile transition.'),
 (6, 'Section header with live count. Desktop adds ‹ › buttons that move the row one screen; mobile swipes, with the bar showing position. Long-form keeps Vlogs / MVs / Normal Videos tabs; a group with no items loses its tab (existing).'),
 (7, 'Card: 9:16 short-form, 16:9 long-form and thumbnails. Fixed-ratio box so nothing shifts. Duration badge and “Edit for @…” credit kept; thumbnails have no credit line (existing).'),
 (8, 'Desktop hover or keyboard focus plays a muted 5s MP4 preview. Title is also in the accessible name and the viewer: nothing is hover-only.'),
 (9, 'Back to all works. Returns to the default state; focus goes back to the chiseyi chip.'),
 (10, 'Profile header: neutral grey avatar with initial, name, handle and bio placeholders. No external links unless verified.'),
 (11, 'Stats: counts computed from portfolio items only. No followers, likes or views.'),
 (12, 'Primary CTA “Start a project” links to Contact. No Follow button.'),
 (13, 'Tabs: Short-form / Long-form / Thumbnails with counts. Search stays available. Arrow keys move between tabs.'),
 (14, 'Rows scroll sideways with snapping, so cards stop on whole-card edges and nothing is cut off. Desktop shows 6 columns and mobile 3 (16:9 tabs: 4 and 2). Creator state has 2 rows. Move with swipe (mobile), ‹ › (desktop) or the keyboard; the bar shows position. No Load more.'),
 (15, 'Touch: first tap plays the preview in the card; the Open button (44px) opens the full video. Second tap on the card stops it.'),
 (16, 'Empty tab: message plus two exits. Count shows 0.'),
 (17, 'Short screen (667px tall): at 667px or less of height the header tightens (smaller avatar and gaps). Measured here: header, tabs, search/sort and the first full grid row end at 648px, so they fit in the first view.'),
]

def spec_board():
    ol = ''.join(f'<li>{pin(n)}<span>{t}</span></li>' for n, t in NOTES)
    inter = [
     'URL: <code>/works</code> is All. Creator: <code>/works?creator=chiseyi&amp;tab=short&amp;sort=newest&amp;q=</code>. Each filter change updates the URL (pushState); browser Back and Forward restore the state; a direct link renders the creator state on first paint.',
     'Unknown creator id falls back to All.',
     '“Back to all works” goes to <code>/works</code> and keeps <code>q</code> and <code>sort</code>.',
     'Transition All → creator, about 1.5s, in this order: (1) the chip morphs into the profile avatar (pill → circle, label fades to the initial) while the other chips, the title and the old sections fade and slide out to the left; (2) the search bar eases down into the tabs row; (3) the profile details fade up, then the creator’s videos fade-slide up with an ease-out stagger. Back reverses it, and the old sections slide in from the right.',
     'With <code>prefers-reduced-motion: reduce</code>: no morph or slides, an instant swap, no autoplaying previews. Only opacity and transform are animated except the morphing avatar; clicks are ignored while a transition runs.',
     'Working version: the interactive prototype page (it uses <code>#creator-chiseyi</code> in the address because the preview frame only allows a hash).',
     'Focus: on entering creator state focus moves to the name heading; on Back it returns to the chip. A polite live region announces “Showing chiseyi’s works”.',
     'Scrolling rows use scroll-snap and one-screen paging; ‹ › disable at the ends. The page itself never scrolls sideways. Focus rings have room inside each row, so they are not clipped.',
     'Media: posters (WebP, fixed ratio) load first; first row eager, the rest lazy. MP4 previews are not requested until hover, focus or tap; one preview at a time; stopped on leave, blur or tab change.',
    ]
    a11y = [
     'Touch targets 44px or more: chips, tabs, back, sort, search, CTA, Open.',
     'Visible 3px focus outline on every control.',
     'Search, sort and each icon-only control have labels; chip row is a labelled group; tabs use the tab pattern.',
     'Active states use fill plus check or underline, not colour alone.',
     'Info is never hover-only: title and credit are in captions (desktop), the accessible name and the viewer.',
     'Text 12px or larger; grayscale text passes 4.5:1.',
     'No sideways page scroll; only the mobile chip row scrolls inside its own box.',
    ]
    assume = [
     'Latest approved direction is Poster C (OC palette), per the project doc dated 2026-11-15. This wireframe is grayscale; styling follows later.',
     'Works becomes a grid page; the current paged sideways strips go away. Existing <code>data-*</code> hooks and filter scripts are kept in the build.',
     'Creator labels follow your brief. The repo has Pidge, Chi and Miu, and no Lomi.',
     'Stats come from <code>clips.json</code> and <code>thumbnails.json</code> at build time.',
     '16:9 tabs use 2 columns on mobile (3 columns would be about 115×65px). Confirm.',
     'The creator chip row is hidden in creator state; switching creators goes through Back.',
     'Desktop: creator chips share one lane with the content-type links. Mobile cannot fit both, so they are two rows.',
     'Placeholders everywhere for bios, handles, stats, links and descriptions.',
    ]
    qs = [
     'PROJECT_HANDOFF.md is not in the repo or the project docs. Is Poster C still the approved direction?',
     'Do creator bios, handles and avatars exist, and may they be shown?',
     'Lomi has no items today: show the chip with the empty state, or hide until there are items?',
     'Rename ids chi → chiseyi and miu → miuoni, or keep the ids and change labels only (old shared links)?',
     'Keep the Content filter row (All types / Short / Long / Thumbnails)? Here the section links and tabs replace it, and <code>type=</code> would still work in URLs.',
     'Own URL per creator (<code>/works/chiseyi</code>) or the query string?',
     'Should “Start a project” carry the creator into the contact form? Not assumed.',
    ]
    ul = lambda xs: '<ul>' + ''.join(f'<li><span>{x}</span></li>' for x in xs) + '</ul>'
    inner = (f'<div class="spec"><p class="eyebrow">Works redesign wireframe</p><h1>Annotations, assumptions, open questions</h1>'
             f'<p class="count">Numbers match the pins on the boards. Grayscale, low fidelity, placeholders only.</p>'
             f'<div class="sg"><div><h2>Annotations</h2><ol>{ol}</ol></div>'
             f'<div><h2>Interaction and URL</h2>{ul(inter)}<h2 style="margin-top:28px">Accessibility</h2>{ul(a11y)}</div>'
             f'<div><h2>Assumptions</h2>{ul(assume)}<h2 style="margin-top:28px">Open questions</h2>{ul(qs)}</div></div></div>')
    return wrap(False, inner)

BOARDS = {
    'D1-default-1440': ('Desktop 1440: default (All)', 1440, lambda: default_board(False)),
    'D2-creator-1440': ('Desktop 1440: creator (chiseyi)', 1440, lambda: creator_board(False)),
    'D3-empty-1440': ('Desktop 1440: empty tab', 1440, lambda: empty_board(False)),
    'M1-default-390': ('Mobile 390: default (All)', 390, lambda: default_board(True)),
    'M2-creator-390': ('Mobile 390: creator (chiseyi)', 390, lambda: creator_board(True)),
    'M3-empty-390': ('Mobile 390: empty tab', 390, lambda: empty_board(True)),
    'M4-short-390x667': ('Mobile 390×667: short screen', 390, lambda: creator_board(True, compact=True)),
    'S1-spec': ('Annotations and open questions', 1440, spec_board),
}

if __name__ == '__main__':
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    for k, (title, w, fn) in BOARDS.items():
        html = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
                f'<title>{title}</title><style>body{{margin:0;background:#fff}}{CSS}</style></head><body>{fn()}</body></html>')
        open(os.path.join(out, k + '.html'), 'w').write(html)
    print('ok')
