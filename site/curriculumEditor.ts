import { esc } from "./classroom-render";
import { roomCourse, type CourseCategory } from "./course";
import type { PublicRoom } from "./rooms";

export const curriculumStyle = `
.students form[data-curriculum]{display:block}.students form[data-curriculum]>label{max-width:36rem}
.admin-nav{flex-wrap:wrap}.admin-nav a{white-space:nowrap}
.curriculum-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:1.5rem;margin:1.5rem 0}
.curriculum-grid>section{min-width:0}.curriculum-grid ol,.curriculum-grid ul{list-style:none;padding:0;margin:0}
.curriculum-group{border:1px solid var(--eddm-line);border-radius:.7rem;padding:1rem;margin-bottom:1rem}
.curriculum-group h3{flex:1;min-width:0}.curriculum-row{display:flex;align-items:center;gap:.7rem;padding:.8rem 0;border-top:1px solid var(--eddm-line)}
.curriculum-row>span{flex:1;min-width:0;overflow-wrap:anywhere}.curriculum-controls{display:flex;gap:.3rem;flex-shrink:0}
.curriculum-row[hidden]{display:none}
.curriculum-controls button{padding:.35rem .55rem}.curriculum-group .topline{margin-bottom:.8rem}
.curriculum-grid details{border-bottom:1px solid var(--eddm-line);padding-bottom:.5rem}.curriculum-grid summary{display:flex;justify-content:space-between;gap:1rem}
.curriculum-grid button:disabled{cursor:default}.curriculum-save{position:sticky;bottom:0;padding:1rem 0;background:var(--eddm-carbon);border-top:1px solid var(--eddm-line);z-index:1}
@media(max-width:850px){.curriculum-grid{grid-template-columns:1fr}.curriculum-group{padding:.8rem}.curriculum-row{flex-wrap:wrap}.curriculum-row>span{min-width:9rem}}
`;

export function curriculumEditor(room: PublicRoom, categories: CourseCategory[], root: string): string {
  const curriculum = room.curriculum ?? roomCourse(categories, room).map(c => ({ category: c.slug, posts: c.posts.map(p => p.id) }));
  const catalog = categories.map(c => ({ category: c.slug, title: c.title, posts: c.posts.map(p => ({ id: p.id, title: p.title })) }));
  const data = JSON.stringify({ catalog, curriculum }).replace(/</g, "\\u003c");
  return `<form data-json-form data-curriculum data-next="${root}?tab=curriculum&saved=1">
    <input type="hidden" name="action" value="roomCurriculum"><input type="hidden" name="roomId" value="${esc(room.id)}">
    <label>프로젝트명<input name="title" required maxlength="100" value="${esc(room.title)}"></label>
    <p class="notice">공통 교안에서 필요한 수업을 추가하고 순서를 정하세요. 이 프로젝트의 수업 구성에만 적용됩니다.</p>
    <div class="curriculum-grid"><section aria-label="프로젝트 수업"><h2>수업 순서 <span class="muted small" data-count></span></h2><div data-selected></div><p data-empty class="empty">교안 목록에서 수업을 추가하세요.</p></section>
    <section aria-label="공통 교안"><h2>교안 추가</h2><input type="search" data-catalog-search placeholder="교안 검색" aria-label="교안 검색">
    ${catalog.map(c => `<details data-catalog="${esc(c.category)}"><summary><span>${esc(c.title)}</span><span class="muted small">${c.posts.length}편</span></summary><button type="button" data-add-category="${esc(c.category)}">전체 추가</button><ul>${c.posts.map(p => `<li class="curriculum-row" data-catalog-post="${esc((c.title + " " + p.title).toLowerCase())}"><span>${esc(p.title)}</span><button type="button" data-add-category="${esc(c.category)}" data-add-post="${esc(p.id)}">추가</button></li>`).join("")}</ul></details>`).join("")}</section></div>
    <div class="actions curriculum-save"><button class="primary" type="submit">커리큘럼 저장</button><span role="status" class="message" aria-live="polite"></span></div>
    <script type="application/json" data-curriculum-data>${data}</script></form>`;
}

export const curriculumScript = `
const editor=document.querySelector('[data-curriculum]');
if(editor){
 const {catalog,curriculum}=JSON.parse(editor.querySelector('[data-curriculum-data]').textContent);
 const selected=editor.querySelector('[data-selected]');
 const message=editor.querySelector('[role=status]');
 let dirty=false;
 const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text)el.textContent=text;if(cls)el.className=cls;return el;};
 const change=()=>{dirty=true;delete editor.dataset.saved;message.textContent='변경 후 저장해 주세요';render();};
 const controls=(items,index,remove,label)=>{
  const box=node('div','','curriculum-controls');
  const button=(text,title,action,disabled=false)=>{const el=node('button',text);el.type='button';el.setAttribute('aria-label',label+' '+title);el.title=title;el.disabled=disabled;el.onclick=action;box.append(el);};
  button('↑','위로',()=>{[items[index-1],items[index]]=[items[index],items[index-1]];change();},index===0);
  button('↓','아래로',()=>{[items[index+1],items[index]]=[items[index],items[index+1]];change();},index===items.length-1);
  button('제외','제외',()=>{remove();change();});return box;
 };
 function render(){
  selected.replaceChildren();
  curriculum.forEach((group,index)=>{
   const source=catalog.find(c=>c.category===group.category);
   const section=node('div','','curriculum-group');section.dataset.group=group.category;
   const head=node('div','','topline');head.append(node('h3',(index+1)+'. '+(source?.title||group.category)),controls(curriculum,index,()=>curriculum.splice(index,1),source?.title||group.category));section.append(head);
   const list=node('ol');group.posts.forEach((id,at)=>{const title=source?.posts.find(p=>p.id===id)?.title||id+' (원본 없음)';const row=node('li','','curriculum-row');row.dataset.lesson=id;row.append(node('span',(at+1)+'. '+title),controls(group.posts,at,()=>{group.posts.splice(at,1);if(!group.posts.length)curriculum.splice(index,1);},title));list.append(row);});section.append(list);selected.append(section);
  });
  const total=curriculum.reduce((n,c)=>n+c.posts.length,0);editor.querySelector('[data-count]').textContent=total+'편';editor.querySelector('[data-empty]').hidden=total>0;
  editor.querySelectorAll('[data-add-category]').forEach(button=>{const group=curriculum.find(c=>c.category===button.dataset.addCategory);const id=button.dataset.addPost;const source=catalog.find(c=>c.category===button.dataset.addCategory);button.disabled=id?!!group?.posts.includes(id):source.posts.every(p=>group?.posts.includes(p.id));button.textContent=button.disabled?'추가됨':id?'추가':'전체 추가';});
 }
 editor.querySelectorAll('[data-add-category]').forEach(button=>button.addEventListener('click',()=>{const category=button.dataset.addCategory;let group=curriculum.find(c=>c.category===category);if(!group){group={category,posts:[]};curriculum.push(group);}const ids=button.dataset.addPost?[button.dataset.addPost]:catalog.find(c=>c.category===category).posts.map(p=>p.id);ids.forEach(id=>{if(!group.posts.includes(id))group.posts.push(id);});change();}));
 editor.querySelector('[data-catalog-search]').addEventListener('input',event=>{const term=event.target.value.toLowerCase().trim();editor.querySelectorAll('[data-catalog]').forEach(group=>{const rows=[...group.querySelectorAll('[data-catalog-post]')];rows.forEach(row=>row.hidden=!row.dataset.catalogPost.includes(term));group.hidden=rows.every(row=>row.hidden);if(term&&!group.hidden)group.open=true;});});
 editor.addEventListener('input',event=>{if(event.target.name==='title'){dirty=true;message.textContent='변경 후 저장해 주세요';}});
 editor.curriculum=()=>curriculum;editor.saved=()=>{dirty=false;};
 window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
 if(new URL(location.href).searchParams.has('saved')){message.textContent='저장했습니다';editor.dataset.saved='true';}
 render();
}
`;
