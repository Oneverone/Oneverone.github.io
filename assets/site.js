const q = (selector, root = document) => root.querySelector(selector);
const qa = (selector, root = document) => [...root.querySelectorAll(selector)];

const memories = [
  { title: '雨夜，晚风和你', text: '那天我们在江边聊了很久的话，留了好多未来的计划。<br>晚风很温柔，你也很温柔。', image: 'memory-1.png', scene: 'home-memory-photo-clean.png' },
  { title: '望远镜和远方', text: '我们把看见的星光收进心里，像给未来寄出一封很慢的信。', image: 'memory-2.png', scene: 'hero-memory.png' },
  { title: '星线计划', text: '每一条线都连向一个日子，也连向我们还没有走到的地方。', image: 'memory-3.png', scene: 'home-memory-photo-clean.png' },
  { title: '夜行片段', text: '车窗外的灯一盏一盏退后，身边的人却一直在同一个位置。', image: 'memory-4.png', scene: 'hero-memory.png' },
  { title: '黑胶回声', text: '生活被轻轻放上唱针，普通的晚上也开始有了回声。', image: 'memory-5.png', scene: 'home-memory-photo-clean.png' }
];

const milestones = [
  { name:'相识日', date:'2016.09.01', photo:'milestone-license-photo.png', place:'⌖ 记录地：第一次相遇的街角', description:'从第一次相识开始，平凡的日子也慢慢有了彼此的名字。', letter:'我们把最初的那句“你好”，<br>写成了很长很长的以后。', index:'第 01 首' },
  { name:'恋爱日', date:'2019.02.02', photo:'milestone-license-photo.png', place:'⌖ 记录地：那间常去的小店', description:'从正式在一起开始，未来不再只是一个人的计划。', letter:'谢谢你来到我的身边，<br>让每一次心跳都有了回应。', index:'第 02 首' },
  { name:'领证日', date:'2024.05.24', photo:'milestone-license-photo.png', place:'⌖ 记录地：成都市 · 武侯区民政局', description:'那天阳光很好，我们手牵着手，走进了人生的新篇章。从此，所有的未来都有了名字，叫“我们”。', letter:'我们在一起的每一天，<br>都是生命里最温柔的时光。<br><br>感谢你，让我的世界<br>变得闪闪发亮。<cite>— 小陈 & 小高 ♡</cite>', index:'第 03 首' },
  { name:'婚礼日', date:'2026.03.31', photo:'milestone-license-photo.png', place:'⌖ 记录地：将被认真记住的那一天', description:'把承诺说给亲友听，也把余生写进一张共同的唱片。', letter:'这一天不是故事的终点，<br>而是我们一起翻开的新一页。', index:'第 04 首' },
  { name:'小高生日', date:'1998.01.20', photo:'milestone-license-photo.png', place:'⌖ 记录地：小高的生日餐桌', description:'愿每个新年纪都闪闪发光，愿你一直被温柔和热爱围绕。', letter:'今天的主角永远是你，<br>愿你所有的愿望都被认真听见。', index:'第 05 首' },
  { name:'小陈生日', date:'1999.03.01', photo:'milestone-license-photo.png', place:'⌖ 记录地：小陈的生日晚餐', description:'愿你继续自在地奔向热爱，也一直有我在身边。', letter:'愿你的新一岁，<br>有更辽阔的世界和永远的陪伴。', index:'第 06 首' }
];

const archiveEvents = [
  { date:'2026-06-21', time:'09:30', title:'整理首页想法', type:'设计', text:'把日历、动态、旅行和重要日子这些模块先放进同一个清爽的首页。', image:'travel-detail-hangzhou-1.png' },
  { date:'2026-06-21', time:'16:45', title:'重新整理视觉方向', type:'设计', text:'少一点用力过猛，多一点纸感、留白和照片感。', image:'travel-detail-hangzhou-2.png' },
  { date:'2026-06-13', time:'19:10', title:'傍晚散步', type:'生活', text:'在小路上聊到很晚，晚风把一天慢慢收好。', image:'memory-4.png' },
  { date:'2026-06-03', time:'20:30', title:'把星光收进相册', type:'回忆', text:'给一张照片写下当时的心情，像留住一段声音。', image:'memory-3.png' }
];

const comments = [
  { name:'张宁', date:'2024.06.20', text:'见证你们的幸福时刻，愿往后的每一天都有爱与笑声相伴。', duration:'00:26', avatar:'avatar-zhang.png' },
  { name:'李思思', date:'2024.06.21', text:'你们在一起的样子真好看，祝永远幸福！', duration:'00:18', avatar:'avatar-lisi.png' },
  { name:'王叔叔', date:'2024.06.21', text:'相识是缘，相守是福。愿你们携手走过四季，平淡岁月也温暖如初。<br>愿你们的故事比星光更长久，比音乐更动人。', duration:'00:45', avatar:'avatar-wang.png', featured:true },
  { name:'陈可可', date:'2024.06.22', text:'从今天起要一直开心，一起看更多的风景呀～', duration:'00:21', avatar:'avatar-chen.png' },
  { name:'刘航', date:'2024.06.22', text:'第一次见到如此般配的你们，百年好合，早生贵子（开玩笑啦～）', duration:'00:17', avatar:'avatar-liu.png' }
];

let memoryIndex = 0;
let archiveDate = new Date(2026, 5, 21);

function formatElapsed(dateText) {
  const start = new Date(`${dateText.replaceAll('.', '-')}T00:00:00`);
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();
  if (days < 0) { months--; days += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
  if (months < 0) { years--; months += 12; }
  return `${years}年${months}月${days}天`;
}

function makeWave(root, bars = 74) {
  root.innerHTML = Array.from({length:bars}, (_,i) => `<i style="height:${5 + Math.round(Math.abs(Math.sin(i*.43))*20)}px"></i>`).join('');
}

function renderMemories(index = memoryIndex) {
  memoryIndex = (index + memories.length) % memories.length;
  const data = memories[memoryIndex];
  q('#memoryTitle').textContent = data.title;
  q('#memoryText').innerHTML = data.text;
  q('#railTrack').textContent = data.title;
  q('#heroPhoto').style.backgroundImage = `linear-gradient(90deg, rgba(3,10,17,.92) 0%, rgba(3,10,17,.64) 39%, transparent 76%), linear-gradient(0deg, rgba(2,8,13,.76), transparent 46%), url("assets/${data.scene}")`;
  q('#memoryThumbs').innerHTML = memories.map((item, i) => `<button type="button" class="${i === memoryIndex ? 'is-active':''}" data-memory="${i}" aria-label="切换到${item.title}"><img src="assets/${item.image}" alt="${item.title}"></button>`).join('');
  q('#memoryDots').innerHTML = memories.map((item,i)=>`<button class="${i===memoryIndex?'is-active':''}" type="button" data-memory="${i}" aria-label="第${i+1}段回忆"></button>`).join('');
  makeWave(q('#heroWave'));
  qa('[data-memory]').forEach(button=>button.addEventListener('click',()=>renderMemories(Number(button.dataset.memory))));
}

function renderMilestones(active = 2) {
  q('#milestoneTimeline').innerHTML = milestones.map((item,index)=>`<button class="milestone-node ${index===active?'is-active':''}" type="button" data-milestone="${index}"><span>${String(index+1).padStart(2,'0')}</span><b>${item.name}</b><strong>${item.date}</strong><small>已过去 ${formatElapsed(item.date)}</small></button>`).join('');
  const item = milestones[active];
  q('#milestoneIndex').textContent = item.index;
  q('#milestoneName').innerHTML = `${item.name} <i>♥</i>`;
  q('#milestoneDate').textContent = item.date;
  q('#milestoneDescription').textContent = item.description;
  q('#milestonePlace').textContent = item.place;
  q('#milestoneLetter').innerHTML = item.letter;
  q('#milestonePhoto').style.backgroundImage = `url("assets/${item.photo}")`;
  qa('[data-milestone]').forEach(button=>button.addEventListener('click',()=>renderMilestones(Number(button.dataset.milestone))));
}

function renderArchive() {
  const year = archiveDate.getFullYear(); const month = archiveDate.getMonth();
  q('#archiveYear').textContent = year; q('#archiveMonth').textContent = `${month + 1}月`;
  const first = new Date(year, month, 1).getDay(); const start = first === 0 ? 6 : first - 1;
  const days = new Date(year, month + 1, 0).getDate();
  const selected = archiveDate.getDate();
  const headers = ['一','二','三','四','五','六','日'].map(day=>`<span role="columnheader">${day}</span>`).join('');
  const blanks = Array.from({length:start},()=>'<span aria-hidden="true"></span>').join('');
  const dayNodes = Array.from({length:days},(_,i)=>{
    const day = i+1; const date = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const hasEvent = archiveEvents.some(item=>item.date===date);
    return `<button type="button" data-day="${day}" class="${hasEvent?'has-event':''} ${day===selected?'is-selected':''}" aria-label="${year}年${month+1}月${day}日${hasEvent?'，有记录':''}">${day}</button>`;
  }).join('');
  q('#calendarGrid').innerHTML = headers + blanks + dayNodes;
  const dayKey = `${year}-${String(month+1).padStart(2,'0')}-${String(selected).padStart(2,'0')}`;
  const events = archiveEvents.filter(item=>item.date===dayKey);
  q('#archiveRecords').innerHTML = (events.length ? events : [{date:dayKey,time:'',title:'这一天还没有公开档案',type:'等待记录',text:'留白也是记忆的一部分。',image:'memory-2.png'}]).map((item,index)=>`<article class="record-entry"><div><div class="record-date">${item.time || item.date}</div><h3>${item.title} <small>· ${item.type}</small></h3><p>${item.text}</p><div class="record-audio"><button type="button" class="play-button small-play" aria-label="播放记录" aria-pressed="false">▶</button><div class="feature-wave" aria-hidden="true"></div><small>00:${32-index*4}</small></div></div><img src="assets/${item.image}" alt="${item.title}"></article>`).join('');
  qa('[data-day]').forEach(button=>button.addEventListener('click',()=>{ archiveDate.setDate(Number(button.dataset.day)); renderArchive(); }));
}

function initArchiveControls() {
  qa('[data-shift]').forEach(button=>button.addEventListener('click',()=>{
    const [unit, value] = button.dataset.shift.split(':');
    if (unit === 'year') archiveDate.setFullYear(archiveDate.getFullYear() + Number(value));
    else archiveDate.setMonth(archiveDate.getMonth() + Number(value));
    renderArchive();
  }));
  qa('[data-view]').forEach(button=>button.addEventListener('click',()=>{
    qa('[data-view]').forEach(item=>item.classList.toggle('is-active', item===button));
    q('.archive-grid').classList.toggle('is-list', button.dataset.view === 'list');
  }));
}

function renderComments() {
  q('#commentStream').innerHTML = comments.map(item=>`<article class="comment-card ${item.featured?'featured':''}" style="--avatar:url('assets/${item.avatar}')"><div class="comment-avatar" aria-hidden="true"></div><div><h3>${item.name}<time>${item.date}</time></h3><p>${item.text}</p><div class="comment-audio"><b>▶</b><span></span><small>${item.duration}</small><i>♡</i></div></div>${item.featured?`<div class="comment-gallery">${[1,2,3,4,5].map(i=>`<img src="assets/comment-memory-${i}.png" alt="珍藏回忆">`).join('')}</div>`:''}</article>`).join('');
}

function initPlayerControls() {
  qa('.play-button').forEach(button=>button.addEventListener('click',()=>{
    const playing = button.getAttribute('aria-pressed') === 'true';
    button.setAttribute('aria-pressed', String(!playing)); button.textContent = playing ? '▶' : 'Ⅱ';
  }));
  q('#railPrev').addEventListener('click',()=>renderMemories(memoryIndex-1));
  q('#railNext').addEventListener('click',()=>renderMemories(memoryIndex+1));
  q('#memoryPrev').addEventListener('click',()=>renderMemories(memoryIndex-1));
  q('#memoryNext').addEventListener('click',()=>renderMemories(memoryIndex+1));
  q('#railPlay').addEventListener('click',()=>{
    const button = q('#railPlay'); const active = button.getAttribute('aria-pressed') === 'true';
    button.setAttribute('aria-pressed', String(!active)); button.textContent = active ? '▶' : 'Ⅱ';
  });
}

function initNavigation() {
  const links = qa('.rail-nav a'); const scenes = qa('[data-scene]');
  const observer = new IntersectionObserver(entries=>entries.forEach(entry=>{ if (entry.isIntersecting) links.forEach(link=>link.classList.toggle('is-active', link.dataset.nav === entry.target.dataset.scene)); }), { threshold:.42 });
  scenes.forEach(scene=>observer.observe(scene));
}

let map; let mapLayer; let mapMode = 'world'; let markers = []; let worldData; let chinaData;
const worldVisits = new Set(['United States of America','China','Australia']);
const chinaVisits = new Set(['浙江省','上海市','重庆市','四川省']);
const travelStops = [
  {name:'杭州', lat:30.2741, lng:120.1551, note:'2024.05 · 西湖的风很温柔', color:'#ffba64'},
  {name:'上海', lat:31.2304, lng:121.4737, note:'2024.04 · 在城市的灯里散步', color:'#da785b'},
  {name:'成都', lat:30.5728, lng:104.0668, note:'2023.10 · 留下一段慢慢的日子', color:'#a870e6'},
  {name:'京都', lat:35.0116, lng:135.7681, note:'2024.04 · 一起看樱花落下', color:'#73a3f0'},
  {name:'墨尔本', lat:-37.8136, lng:144.9631, note:'2024.11 · 风把路吹得很长', color:'#ee8a5a'}
];
function styleFeature(feature) { const name = feature.properties?.name || feature.properties?.NAME || ''; const visited = mapMode === 'world' ? worldVisits.has(name) : chinaVisits.has(name); return { color: visited ? '#9d3e35' : '#7f6b58', weight: visited ? 1.25 : .65, fillColor: visited ? '#f18471' : '#14232e', fillOpacity: visited ? .64 : .72 }; }
function pinIcon(color) { return L.divIcon({className:'map-pin', html:`<i style="--pin:${color}"></i>`, iconSize:[23,23], iconAnchor:[11,23]}); }
async function loadMapData() { const [world, china] = await Promise.all([fetch('assets/maps/world-countries.geojson').then(r=>r.json()),fetch('assets/maps/china-admin.json').then(r=>r.json())]); worldData=world; chinaData=china; }
function renderMap() {
  if (!map || !worldData || !chinaData) return;
  if (mapLayer) map.removeLayer(mapLayer); markers.forEach(marker=>map.removeLayer(marker)); markers=[];
  const data = mapMode === 'world' ? worldData : chinaData;
  mapLayer = L.geoJSON(data,{style:styleFeature,onEachFeature:(feature,layer)=>{ const name=feature.properties?.name || feature.properties?.NAME || '旅行足迹'; layer.on('click',()=>layer.bindPopup(`<strong>${name}</strong><br>这里等待被写成一段旅行故事。`).openPopup()); layer.on({mouseover:()=>layer.setStyle({weight:1.8,fillOpacity:.84}),mouseout:()=>mapLayer.resetStyle(layer)}); }}).addTo(map);
  const relevant = mapMode === 'world' ? travelStops : travelStops.filter(item=>['杭州','上海','成都'].includes(item.name));
  relevant.forEach(stop=>{ const marker=L.marker([stop.lat,stop.lng],{icon:pinIcon(stop.color)}).addTo(map).bindPopup(`<strong>${stop.name}</strong><br>${stop.note}`); markers.push(marker); });
  map.fitBounds(mapLayer.getBounds(),{padding:[25,25],maxZoom: mapMode==='world'?3:5});
  updateZoomLabel();
}
function updateZoomLabel(){ q('#mapZoomLabel').textContent = `${mapMode === 'world' ? '世界' : '中国'} · ${Math.round(map.getZoom() * 8)}x`; }
async function initMap() { if (!window.L) return; map=L.map('travelMap',{zoomControl:false,scrollWheelZoom:true,attributionControl:false,minZoom:2,maxZoom:10,zoomSnap:.25}); await loadMapData(); renderMap(); map.on('zoomend',updateZoomLabel); qa('[data-map-mode]').forEach(button=>button.addEventListener('click',()=>{ mapMode=button.dataset.mapMode; qa('[data-map-mode]').forEach(item=>item.classList.toggle('is-active',item===button)); renderMap(); })); }

renderMemories(); renderMilestones(); renderArchive(); initArchiveControls(); renderComments(); initPlayerControls(); initNavigation(); initMap();
