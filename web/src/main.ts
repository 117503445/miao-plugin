import './style.css'
import { scoreCard } from './scoring'
import type { Snapshot, ScoredCard, Stat } from './types'

const paths:Record<string,string>={sword:'单手剑',claymore:'双手剑',polearm:'长柄武器',bow:'弓',catalyst:'法器'}
const elements:Record<string,string>={pyro:'火',hydro:'水',cryo:'冰',electro:'雷',anemo:'风',geo:'岩',dendro:'草',fire:'火',ice:'冰',elec:'雷',wind:'风',quantum:'量子',imaginary:'虚数',phy:'物理'}
const names:Record<string,string>={hp:'生命值',hpPlus:'生命值',atk:'攻击力',atkPlus:'攻击力',def:'防御力',defPlus:'防御力',cpct:'暴击率',cdmg:'暴击伤害',mastery:'元素精通',recharge:'充能效率',dmg:'伤害加成',heal:'治疗加成',speed:'速度',effPct:'效果命中',effDef:'效果抵抗',stance:'击破特攻',...Object.fromEntries(Object.entries(elements).map(([key,name])=>[key,`${name}伤加成`]))}
/** 对文本value进行HTML转义，防止导入内容改变页面结构。 */
function esc(value:unknown):string { return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!)) }
/** 显示stat的中文属性及数值，flat表示非百分比属性。 */
function statText(stat:Stat):string { const flat=['hpPlus','atkPlus','defPlus','mastery','speed'].includes(stat.key);return `${names[stat.key]||stat.key} ${stat.value.toLocaleString('zh-CN',{maximumFractionDigits:1})}${flat?'':'%'}` }
/** 渲染路径src的素材，空路径时保留文字可读。 */
function img(src:string,alt:string,cls=''):string{return src?`<img class="${cls}" src="${esc(src)}" alt="${esc(alt)}" loading="lazy">`:''}
const app=document.querySelector<HTMLDivElement>('#app')!
app.innerHTML='<main class="loading">正在整理角色档案…</main>'
try {
  const response=await fetch('/accounts.json');if(!response.ok)throw new Error('账号数据加载失败')
  const snapshot:Snapshot=await response.json()
  const cards=snapshot.accounts.flatMap(account=>account.characters.map(scoreCard))
  let game:'gs'|'sr'='gs';let query='';let element='';let sort='level';let onlyIncomplete=false
  app.innerHTML=`<header><a class="brand" href="/">✦ 米游档案 <span>PERSONAL ARCHIVE</span></a><a class="source" href="https://github.com/117503445/miao-plugin/tree/feat/static-account-cards" target="_blank" rel="noreferrer">开源 ↗</a></header><main><section class="intro"><div class="eyebrow">我的提瓦特 · 我的银河</div><h1>旅途有迹，<span>配装有数。</span></h1><p>收藏每一位同行者的成长，看看下一件装备该换在哪里。</p></section><nav class="tabs" aria-label="选择游戏"><button data-game="gs" class="active">原神 <small>GENSHIN IMPACT</small></button><button data-game="sr">崩坏：星穹铁道 <small>HONKAI: STAR RAIL</small></button></nav><section id="account" class="account"></section><section class="toolbar" aria-label="筛选角色"><label class="search">搜 <input id="search" type="search" placeholder="搜索角色、武器或套装" aria-label="搜索角色、武器或套装"></label><select id="sort" aria-label="角色排序"><option value="level">等级优先</option><option value="score">评分从高到低</option><option value="weak">评分从低到高</option><option value="name">按角色名称</option></select><label class="toggle"><input id="incomplete" type="checkbox">仅看配装缺失</label></section><div id="elements" class="elements"></div><div id="count" class="count" aria-live="polite"></div><section id="cards" class="grid"></section><footer>采用<a href="https://github.com/yoimiya-kokomi/miao-plugin" target="_blank" rel="noreferrer">喵喵插件</a>原版角色权重与评分算法 · MIT<br>评分衡量有效词条，培养时还需结合队伍、充能和循环。这里展示导出时的配装快照。</footer></main><dialog id="detail"><button class="close" aria-label="关闭详情">×</button><div id="detail-body"></div></dialog>`
  /** 为card输出可展开的角色卡片。 */
  function cardHTML(card:ScoredCard):string {
    const max=card.game==='gs'?90:80;const prefix=card.game==='gs'?'命':'魂'
    return `<article class="card" data-key="${esc(card.key)}"><div class="card-head">${img(card.banner,'','banner')}<div class="portrait">${img(card.image,card.name)}</div><div class="identity"><span class="element">${elements[card.element]||card.element}${card.path?' · '+esc(paths[card.path]||card.path):''}</span><h2>${esc(card.name)}</h2><div class="level ${card.level>=max?'max':''}">Lv.${card.level} <span>· ${card.cons}${prefix}</span></div></div><div class="rating ${card.complete?'':'muted'}"><strong>${card.complete?card.grade:'—'}</strong><span>${card.score.toFixed(1)} 分</span></div></div><div class="card-body"><div class="weapon">${card.weapon?`${img(card.weapon.image,card.weapon.name)}<div><b>${esc(card.weapon.name)}</b><span>Lv.${card.weapon.level} · ${card.weapon.affix}${card.game==='gs'?'精炼':'叠影'}</span></div>`:`<div class="missing">${card.game==='gs'?'武器':'光锥'}未导出 / 无装备记录</div>`}</div><div class="talents">${card.talents.map(t=>`<span>${esc(t.name)} <b>${t.level}</b></span>`).join('')}</div><div class="pieces">${card.artifacts.map(piece=>`<div class="piece">${img(piece.image,piece.name)}<div><b>${esc(piece.name)} <small>+${piece.level}</small></b><span>${esc(statText(piece.main))}</span></div><div class="piece-score"><b>${piece.score.toFixed(1)}</b><small>${piece.grade}</small></div></div>`).join('')}${card.artifacts.length<(card.game==='gs'?5:6)?`<div class="missing">已导出 ${card.artifacts.length}/${card.game==='gs'?5:6} 件装备，配装待完善</div>`:''}</div><button class="details" data-detail="${esc(card.key)}">查看词条与评分规则 <span>↗</span></button></div></article>`
  }
  /** 根据当前游戏与筛选条件更新角色列表。 */
  function render():void {
    const account=snapshot.accounts.find(a=>a.game===game)!
    const gameCards=cards.filter(c=>c.game===game)
    const filtered=gameCards.filter(c=>(!element||c.element===element)&&(!onlyIncomplete||!c.complete)&&[c.name,c.weapon?.name,...c.artifacts.map(a=>a.set)].join(' ').toLowerCase().includes(query.toLowerCase())).sort((a,b)=>sort==='score'?b.score-a.score:sort==='weak'?a.score-b.score:sort==='name'?a.name.localeCompare(b.name,'zh-CN'):b.level-a.level||b.score-a.score)
    document.querySelector('#account')!.innerHTML=`<div><span class="label">账号 UID</span><strong>${esc(account.uid)}</strong></div><div><span class="label">角色档案</span><strong>${gameCards.length}<small> 位</small></strong></div><div><span class="label">满级角色</span><strong>${gameCards.filter(c=>c.level>=(game==='gs'?90:80)).length}<small> 位</small></strong></div><div class="snapshot"><span class="label">数据快照</span><strong>${esc(account.snapshotAt)}</strong><small>非实时数据</small></div>`
    const available=[...new Set(gameCards.map(c=>c.element))]
    document.querySelector('#elements')!.innerHTML=['',...available].map(e=>`<button data-element="${e}" class="${element===e?'active':''}">${e?elements[e]||e:'全部属性'}</button>`).join('')
    document.querySelector('#count')!.textContent=`${filtered.length} 位同行者 · ${game==='gs'?'圣遗物':'遗器'}喵喵评分`
    document.querySelector('#cards')!.innerHTML=filtered.length?filtered.map(cardHTML).join(''):'<p class="empty">没有符合筛选条件的角色。</p>'
    document.querySelectorAll<HTMLButtonElement>('[data-game]').forEach(b=>b.classList.toggle('active',b.dataset.game===game))
  }
  const dialog=document.querySelector<HTMLDialogElement>('#detail')!
  /** 展示key对应角色的真实副词条和生效权重。 */
  function showDetails(key:string):void {
    const card=cards.find(c=>c.key===key)!
    document.querySelector('#detail-body')!.innerHTML=`<div class="eyebrow">装备词条 · 喵喵评分</div><h2>${esc(card.name)} <small>${card.score.toFixed(1)} 分 · ${card.grade}</small></h2><p>${esc(card.rule||'角色默认权重')} · 各件评分按角色有效属性计算，整套评级按固定部位数取平均。</p><div class="detail-pieces">${card.artifacts.map(p=>`<section><h3>${esc(p.name)} <span>${p.score.toFixed(1)} · ${p.grade}</span></h3><p>${esc(p.set)} · +${p.level} · ${p.star}星</p><b>${esc(statText(p.main))}</b><ul>${p.attrs.map(s=>`<li class="${card.weights[s.key]>0?'effective':''}">${esc(statText(s))}<small>权重 ${card.weights[s.key]||0}</small></li>`).join('')}</ul></section>`).join('')}</div>${card.notes.map(n=>`<p>${esc(n)}</p>`).join('')}<p class="method">主词条数值由喵喵元数据计算，副词条来自账号导出。装备评分不等同于伤害或队伍强度。</p>`
    dialog.showModal()
  }
  document.querySelector('#search')!.addEventListener('input',e=>{query=(e.target as HTMLInputElement).value;render()})
  document.querySelector('#sort')!.addEventListener('change',e=>{sort=(e.target as HTMLSelectElement).value;render()})
  document.querySelector('#incomplete')!.addEventListener('change',e=>{onlyIncomplete=(e.target as HTMLInputElement).checked;render()})
  app.addEventListener('click',e=>{const button=(e.target as HTMLElement).closest<HTMLButtonElement>('button');if(!button)return;if(button.dataset.game){game=button.dataset.game as 'gs'|'sr';element='';render()}else if(button.dataset.element!==undefined){element=button.dataset.element;render()}else if(button.dataset.detail)showDetails(button.dataset.detail);else if(button.classList.contains('close'))dialog.close()})
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()})
  render()
  ;(window as any).__cardsQA={counts:snapshot.accounts.map(a=>({game:a.game,count:a.characters.length})),nonFinite:cards.filter(c=>!Number.isFinite(c.score)).length,scored:cards.filter(c=>c.score>0).length}
} catch(error) { app.innerHTML=`<main class="loading"><h1>档案暂时无法打开</h1><p>${esc(error instanceof Error?error.message:error)}</p></main>`;console.error(error) }
