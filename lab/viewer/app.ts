// Viewer: replays a bot run hour by hour, tick by tick. Development tool for the lab.
import { playRun, type Run, type FightEntry } from '../src/run/run.ts';
import { makeBots } from '../src/run/bots.ts';
import { ROOMS, GUILDS, ALLOYS } from '../src/content.ts';
import { TIER_NAMES } from '../src/engine/combat.ts';
import { BASE_FLOORS, type Tower } from '../src/engine/tower.ts';
import type { CombatEvent } from '../src/engine/combat.ts';

// Every element id used here exists in index.html; `any` keeps this DOM glue short.
const $ = (id: string): any => document.getElementById(id);
const TICK_MS = 600;
const params = new URLSearchParams(location.search);
let seed = Number(params.get('seed')) || Math.floor(Math.random() * 1e6);
let run: Run;
let fightIdx = 0;
let frame = 0;
let timer: ReturnType<typeof setInterval> | null = null;
let speed = 1;

function newRun() {
  run = playRun(seed, makeBots()['tüftler'](), { record: true });
  history.replaceState(null, '', `?seed=${seed}`);
  const guilds = run.guilds.map((g) => GUILDS[g].name).join(', ');
  $('meta').innerHTML = `Seed ${seed}<br>${run.midnight ? 'Mitternacht erreicht' : `Stunde ${run.hour}, ${run.wins} Siege`} · ${guilds}`;
  renderHours();
  selectFight(firstFight());
}
const firstFight = () => Math.max(0, run.fights.findIndex((f) => !f.skipped));

function renderHours() {
  $('hours').innerHTML = '';
  for (let h = 1; h <= 12; h++) {
    const i = run.fights.findIndex((f) => f.hour === h);
    const f = run.fights[i];
    const b = document.createElement('button');
    b.textContent = String(h);
    b.disabled = !f;
    if (f) b.className = f.skipped ? 's' : f.won ? 'w' : 'l';
    if (i === fightIdx) b.classList.add('on');
    b.onclick = () => selectFight(i);
    $('hours').append(b);
  }
}

function selectFight(i: number) {
  stop();
  fightIdx = i;
  frame = 0;
  renderHours();
  const f = run.fights[i];
  $('summary').innerHTML = '';
  if (f.skipped) {
    $('sideA').innerHTML = '';
    $('sideB').innerHTML = '';
    $('tick').textContent = `Stunde ${f.hour}: Wandernder Händler, kein Kampf.`;
    return;
  }
  buildSide('a', f.tower!, 'Dein Turm', f.hp!);
  buildSide('b', f.oppTower!, f.opponent!, f.oppHp!);
  draw();
}

function buildSide(side: 'a' | 'b', tower: Tower, title: string, hp: number) {
  const el = side === 'a' ? $('sideA') : $('sideB');
  const used = tower.rooms.reduce((s, r) => s + ROOMS[r.id].height, 0);
  el.innerHTML = `<h2>${title}</h2>
    <div class="bar"><i></i><em></em><span></span></div>
    <div class="status"></div>
    <div class="tower"></div>`;
  const t = el.querySelector('.tower');
  tower.rooms.forEach((r, idx) => {
    const def = ROOMS[r.id];
    const d = document.createElement('div');
    d.className = 'room';
    d.style.setProperty('--h', String(def.height));
    d.style.setProperty('--c', GUILDS[def.guild].color);
    d.innerHTML = `<div class="n">${def.name}</div><div class="t">${TIER_NAMES[r.tier ?? 0]}${r.alloy ? ' · ' + ALLOYS[r.alloy].name : ''}</div>`;
    d.dataset.idx = String(idx);
    d.onclick = () => openSheet(r);
    t.append(d);
  });
  if (used < BASE_FLOORS) {
    const e = document.createElement('div');
    e.className = 'empty';
    e.style.setProperty('--h', String(BASE_FLOORS - used));
    t.append(e);
  }
  el.dataset.hp = hp;
}

const POP = { dmg: ['var(--loss)', '-'], shield: ['var(--shield)', '+'], heal: ['var(--win)', '+'], burn: ['var(--burn)', '🔥'], poison: ['var(--poison)', '☠'] };

function draw() {
  const f = run.fights[fightIdx];
  const frames = f.frames ?? [];
  const fr = frames[frame];
  for (const side of ['a', 'b']) {
    const el = side === 'a' ? $('sideA') : $('sideB');
    const s = fr[side];
    const max = Number(el.dataset.hp);
    el.querySelector('.bar > i').style.width = `${Math.max(0, (100 * s.hp) / max)}%`;
    el.querySelector('.bar > em').style.width = `${Math.min(100, (100 * s.shield) / max)}%`;
    el.querySelector('.bar span').textContent = `${Math.max(0, s.hp)} / ${max}${s.shield ? `  🛡${s.shield}` : ''}`;
    const st: string[] = [];
    if (s.burn) st.push(`<b style="color:var(--burn)">Brand ${s.burn}</b>`);
    if (s.poison) st.push(`<b style="color:var(--poison)">Gift ${s.poison}</b>`);
    if (s.oil) st.push(`Öl ${s.oil}`);
    if (s.rust) st.push(`Rost ${s.rust}`);
    el.querySelector('.status').innerHTML = st.join(' ');
    const rooms = el.querySelectorAll('.room');
    rooms.forEach((d, i) => {
      d.classList.toggle('spark', s.sparks.includes(i));
      d.classList.toggle('broken', s.rooms[i]?.broken);
      d.classList.remove('fire');
    });
    for (const ev of fr.events.filter((e) => e.side === side)) {
      const d = rooms[ev.idx];
      if (!d) continue;
      if (ev.type === 'fire' || ev.type === 'strike') d.classList.add('fire');
      if (POP[ev.type] && ev.n) {
        const p = document.createElement('span');
        p.className = 'pop';
        p.style.color = POP[ev.type][0];
        p.textContent = `${POP[ev.type][1]}${ev.n}`;
        p.style.right = `${6 + 44 * d.querySelectorAll('.pop').length}px`;
        d.append(p);
        setTimeout(() => p.remove(), 700);
      }
    }
  }
  $('tick').textContent = `Stunde ${f.hour} · Takt ${fr.tick} / ${frames.length - 1}${fr.tick > 30 ? ' · Zeitzerfall' : ''}`;
  if (frame === frames.length - 1) showSummary(f);
}

function showSummary(f: FightEntry) {
  stop();
  const rows = (f.roomStats ?? [])
    .map((s) => ({ name: ROOMS[s.id].name, v: s.dmg + s.burn * 2.5 + s.poison * 8 + s.shield * 0.6 + s.heal * 0.6, s }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 5)
    .map((r) => `<div><span>${r.name}</span><span>${r.s.dmg ? `${r.s.dmg} Schaden ` : ''}${r.s.burn ? `${r.s.burn} Brand ` : ''}${r.s.poison ? `${r.s.poison} Gift ` : ''}${r.s.shield ? `${r.s.shield} Schild ` : ''}${r.s.heal ? `${r.s.heal} Heilung` : ''}${!r.v ? `${r.s.activations}× ausgelöst` : ''}</span></div>`)
    .join('');
  $('summary').innerHTML = `<div class="summary"><h3>${f.won ? 'Sieg' : 'Niederlage'}${f.alloy ? ` · Beute: Legierung ${ALLOYS[f.alloy].name}` : ''}</h3>${rows}</div>`;
}

function step() {
  const f = run.fights[fightIdx];
  if (frame < (f.frames ?? []).length - 1) {
    frame++;
    draw();
  } else stop();
}
function play() {
  const f = run.fights[fightIdx];
  if (f.skipped) return;
  if (frame >= (f.frames ?? []).length - 1) frame = 0;
  $('summary').innerHTML = '';
  stop();
  timer = setInterval(step, TICK_MS / speed);
  $('play').textContent = '❚❚';
}
function stop() {
  if (timer) clearInterval(timer);
  timer = null;
  $('play').textContent = '▶';
}

function openSheet(r: Tower['rooms'][number]) {
  const def = ROOMS[r.id];
  $('sheet').innerHTML = `<h3>${def.name}</h3>
    <p>${GUILDS[def.guild].name} · ${def.height} Etage${def.height > 1 ? 'n' : ''} · ${TIER_NAMES[r.tier ?? 0]}${def.fusion ? ' · Verschmelzung' : ''}</p>
    <p style="color:var(--text)">${def.text}</p>
    ${r.alloy ? `<p>Legierung ${ALLOYS[r.alloy].name}: ${ALLOYS[r.alloy].text}</p>` : ''}`;
  $('sheet').classList.add('open');
}
$('sheet').onclick = () => $('sheet').classList.remove('open');
$('play').onclick = () => (timer ? stop() : play());
$('restart').onclick = () => { frame = 0; $('summary').innerHTML = ''; draw(); play(); };
$('speed').onclick = () => {
  speed = speed === 1 ? 2 : speed === 2 ? 4 : 1;
  $('speed').textContent = `${speed}×`;
  if (timer) play();
};
$('reroll').onclick = () => { seed = Math.floor(Math.random() * 1e6); newRun(); };

newRun();
