const app = document.querySelector("#app");
const state = { token: localStorage.getItem("kavora_token"), user: null, scene: [] };

function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function toast(msg){const d=document.createElement("div");d.className="toast";d.textContent=msg;document.body.appendChild(d);setTimeout(()=>d.remove(),2500)}
async function api(url, options={}){
  const headers={"Content-Type":"application/json",...(options.headers||{})};
  if(state.token) headers.Authorization=`Bearer ${state.token}`;
  const r=await fetch(url,{...options,headers});
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data.error||"Request failed");
  return data;
}
function shell(content){
  return `<header class="top">
    <img class="logo" src="/kavora-logo.png" alt="Kavora">
    <nav class="nav">
      <button onclick="home()">Home</button><button onclick="games()">Games</button>
      <button onclick="studio()">Kavora Studio</button><button onclick="shop()">Shop</button>
      ${state.user?`<button onclick="profile()">Profile</button>`:""}
    </nav>
    ${state.user?`<button class="ghost" onclick="logout()">Salir</button>`:`<button class="primary" onclick="login()">Entrar</button>`}
  </header><main class="wrap">${content}</main>`;
}
function home(){
  app.innerHTML=shell(`<section class="hero">
    <div><span class="pill">WEB GAME PLATFORM • MVP</span><h1>Bienvenido a <span class="gradient">Kavora</span></h1>
    <p>Crea mundos, publícalos y juega con otras personas desde el navegador. Tu cuenta, avatar y proyectos viven en Kavora Data.</p>
    <div class="row"><button class="primary" onclick="studio()">Crear con Kavora Studio</button><button class="ghost" onclick="games()">Explorar juegos</button></div></div>
    <div class="hero-card"><img src="/kavora-logo.png"><p class="muted">Kavora Client + Kavora Studio + Kavora Data</p></div>
  </section><h2>Todo en un solo lugar</h2><section class="grid">
    <div class="card"><h3>🎮 Kavora Client</h3><p class="muted">Juega desde el navegador con una base de multijugador WebSocket.</p></div>
    <div class="card"><h3>🛠️ Kavora Studio</h3><p class="muted">Construye una escena, guárdala y publícala.</p></div>
    <div class="card"><h3>💾 Kavora Data</h3><p class="muted">Cuenta, avatar, inventario y juegos se guardan en PostgreSQL.</p></div>
  </section>`);
}
function authForm(mode="login"){
  const register=mode==="register";
  app.innerHTML=`<main class="auth card"><img src="/kavora-logo.png"><h2>${register?"Crear cuenta":"Entrar a Kavora"}</h2>
  ${register?`<div class="field"><label>Nombre visible</label><input id="display" maxlength="32"></div>`:""}
  <div class="field"><label>Usuario</label><input id="username" maxlength="24"></div>
  <div class="field"><label>Contraseña</label><input id="password" type="password"></div>
  <button class="primary" onclick="submitAuth('${mode}')">${register?"Crear cuenta":"Entrar"}</button>
  <p class="muted">${register?"¿Ya tienes cuenta?":"¿No tienes cuenta?"} <button class="ghost" onclick="${register?"login()":"register()"}">${register?"Entrar":"Registrarme"}</button></p></main>`;
}
function login(){authForm("login")} function register(){authForm("register")}
async function submitAuth(mode){
  try{
    const body={username:username.value,password:password.value};
    if(mode==="register") body.displayName=display.value;
    const d=await api("/api/auth/"+mode,{method:"POST",body:JSON.stringify(body)});
    state.token=d.token;state.user=d.user;localStorage.setItem("kavora_token",d.token);toast("¡Bienvenido a Kavora!");home();
  }catch(e){toast(e.message)}
}
function logout(){localStorage.removeItem("kavora_token");state.token=null;state.user=null;home()}
async function profile(){
  try{const d=await api("/api/me");state.user=d.user;
    app.innerHTML=shell(`<h1 class="page-title">Mi perfil</h1><section class="grid">
    <div class="card"><h3>@${esc(d.user.username)}</h3><p class="muted">${esc(d.user.display_name)}</p><span class="pill">Kavora ID ${d.user.id}</span></div>
    <div class="card"><h3>Avatar</h3><div class="avatar-preview">${faceEmoji(d.user.avatar?.face||"default")}</div></div>
    <div class="card"><h3>Inventario</h3><p>${(d.user.inventory||[]).length} items</p><button class="primary" onclick="shop()">Abrir Shop</button></div>
    </section><div class="card" style="margin-top:16px"><h3>Personalizar</h3><div class="row">
    ${["default","robot","crown","alien"].map(x=>`<button class="ghost" onclick="saveAvatar('${x}')">${faceEmoji(x)} ${x}</button>`).join("")}</div></div>`);
  }catch(e){toast(e.message)}
}
function faceEmoji(x){return ({default:"🙂",robot:"🤖",crown:"👑",alien:"👽"}[x]||"🙂")}
async function saveAvatar(face){try{await api("/api/me/avatar",{method:"PUT",body:JSON.stringify({avatar:{face}})});toast("Avatar guardado");profile()}catch(e){toast(e.message)}}
async function games(){
  try{const d=await api("/api/games");app.innerHTML=shell(`<div class="row space"><h1 class="page-title">Juegos</h1><button class="primary" onclick="studio()">+ Crear juego</button></div>
  <section class="grid">${d.games.length?d.games.map(g=>`<article class="card"><div style="height:120px;border-radius:12px;background:linear-gradient(135deg,#0e2b62,#702dd1);display:grid;place-items:center;font-size:44px">🎮</div><h3>${esc(g.name)}</h3><p class="muted">${esc(g.description)}</p><span class="pill">@${esc(g.owner)}</span><div style="margin-top:14px"><button class="primary" onclick="client(${g.id},'${esc(g.name)}')">Jugar</button></div></article>`).join(""):`<div class="card"><h3>Aún no hay juegos públicos</h3><p class="muted">Sé el primero en publicar uno desde Kavora Studio.</p></div>`}</section>`)}
  catch(e){toast(e.message)}
}
function studio(){
  state.scene=[{x:180,y:180},{x:360,y:300}];
  app.innerHTML=shell(`<div class="row space"><h1 class="page-title">Kavora Studio</h1><div class="row"><button class="ghost" onclick="addObject()">+ Part</button><button class="primary" onclick="saveGame()">Guardar / Publicar</button></div></div>
  <div class="studio"><aside class="side"><h3>Explorer</h3><div id="explorer">${state.scene.map((_,i)=>`<div class="pill" style="margin:4px">Part_${i+1}</div>`).join("")}</div><hr><p class="muted">MVP: mueve las piezas arrastrándolas dentro del viewport.</p></aside>
  <section class="viewport"><div class="scene" id="scene"></div></section>
  <aside class="side"><h3>Properties</h3><p class="muted">Selecciona una pieza para editarla.</p><label>Game name</label><input id="gameName" value="Mi mundo Kavora"><div class="field"><label>Description</label><textarea id="gameDesc">Mi primer juego creado en Kavora.</textarea></div></aside></div>`);
  renderScene();
}
function renderScene(){
  const scene=document.querySelector("#scene"); if(!scene)return;scene.innerHTML="";
  state.scene.forEach((o,i)=>{const el=document.createElement("div");el.className="object";el.style.left=o.x+"px";el.style.top=o.y+"px";el.title="Part_"+(i+1);
    let drag=false,ox=0,oy=0;el.onpointerdown=e=>{drag=true;ox=e.clientX-o.x;oy=e.clientY-o.y;el.setPointerCapture(e.pointerId)};
    el.onpointermove=e=>{if(!drag)return;o.x=Math.max(0,e.clientX-ox);o.y=Math.max(0,e.clientY-oy);el.style.left=o.x+"px";el.style.top=o.y+"px"};
    el.onpointerup=()=>{drag=false};scene.appendChild(el);
  });
}
function addObject(){state.scene.push({x:80+Math.random()*500,y:80+Math.random()*350});renderScene();studioExplorerOnly()}
function studioExplorerOnly(){const e=document.querySelector("#explorer");if(e)e.innerHTML=state.scene.map((_,i)=>`<div class="pill" style="margin:4px">Part_${i+1}</div>`).join("")}
async function saveGame(){
  if(!state.token){toast("Inicia sesión para guardar juegos");return}
  try{const payload={name:document.querySelector("#gameName").value,description:document.querySelector("#gameDesc").value,data:{scene:state.scene},isPublic:true};
    await api("/api/games",{method:"POST",body:JSON.stringify(payload)});toast("Juego publicado");games();
  }catch(e){toast(e.message)}
}
function client(gameId,name){
  app.innerHTML=shell(`<div class="client"><div class="row space"><div><h1 class="page-title">${esc(name)}</h1><span class="pill">Kavora Client</span></div><button class="ghost" onclick="games()">Salir</button></div>
  <div class="game-canvas" id="game"><div class="hud"><span class="pill" id="status">Conectando...</span><span class="pill">WASD / Flechas</span></div><div class="chat">Multijugador activo · WebSocket</div></div></div>`);
  const canvas=document.querySelector("#game");const me=document.createElement("div");me.className="player";canvas.appendChild(me);
  let x=80,y=100;const players=new Map();
  const ws=new WebSocket(`${location.protocol==="https:"?"wss":"ws"}://${location.host}/ws?game=${gameId}`);
  ws.onopen=()=>document.querySelector("#status").textContent="Conectado";
  ws.onclose=()=>document.querySelector("#status").textContent="Desconectado";
  ws.onmessage=e=>{const m=JSON.parse(e.data);
    if(m.type==="welcome"){m.players.forEach(p=>addRemote(p));}
    if(m.type==="join")addRemote(m.player);
    if(m.type==="move"){if(m.player.id===m.self)return;moveRemote(m.player)}
    if(m.type==="leave"){const el=players.get(m.playerId);if(el)el.remove();players.delete(m.playerId)}
  };
  function addRemote(p){if(p.id===undefined)return;if(players.has(p.id))return;const el=document.createElement("div");el.className="player";el.style.opacity=".6";canvas.appendChild(el);players.set(p.id,el);moveRemote(p)}
  function moveRemote(p){const el=players.get(p.id);if(el){el.style.left=(p.x+20)+"px";el.style.top=(p.y+20)+"px"}}
  function send(){me.style.left=x+"px";me.style.top=y+"px";if(ws.readyState===1)ws.send(JSON.stringify({type:"move",x,y}))}
  addEventListener("keydown",e=>{const k=e.key.toLowerCase();if(!["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"].includes(k))return;
    e.preventDefault();if(k==="w"||k==="arrowup")y-=8;if(k==="s"||k==="arrowdown")y+=8;if(k==="a"||k==="arrowleft")x-=8;if(k==="d"||k==="arrowright")x+=8;
    x=Math.max(0,Math.min(canvas.clientWidth-38,x));y=Math.max(0,Math.min(canvas.clientHeight-38,y));send();
  });send();
}
function shop(){app.innerHTML=shell(`<h1 class="page-title">Kavora Shop</h1><section class="grid">
<div class="card"><h3>🙂 Faces</h3><p class="muted">Sistema preparado para publicar caras creadas por usuarios.</p><button class="primary" onclick="profile()">Ver avatar</button></div>
<div class="card"><h3>👕 Ropa</h3><p class="muted">La siguiente etapa añadirá shirts y pants persistentes.</p></div>
<div class="card"><h3>✨ Accesorios</h3><p class="muted">La tienda puede crecer con un catálogo moderado.</p></div>
</section>`)}
async function boot(){if(state.token){try{state.user=(await api("/api/me")).user}catch{logout();return}}home()}
boot();
