const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),express=require('express'),{WebSocketServer}=require('ws');
const app=express(),PORT=+(process.env.PORT||10000),HOST=process.env.HOST||'0.0.0.0',DATA=path.resolve(process.env.KAVORA_DATA_DIR||'./data'),PUB=path.join(__dirname,'public');
fs.mkdirSync(DATA,{recursive:true});
const db={users:path.join(DATA,'users.json'),sessions:path.join(DATA,'sessions.json'),projects:path.join(DATA,'projects.json')};
const read=(f,d)=>{try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch{return d}},write=(f,d)=>{let t=f+'.tmp';fs.writeFileSync(t,JSON.stringify(d,null,2));fs.renameSync(t,f)};
for(const [f,d] of [[db.users,{}],[db.sessions,{}],[db.projects,[]]])if(!fs.existsSync(f))write(f,d);
const games=[
{id:'kavora-city',name:'KAVORA City',genre:'Roleplay',creator:'KAVORA',players:12,maxPlayers:30,color:'purple',description:'Explore a classic block city, meet players and create your own stories.'},
{id:'block-arena',name:'Block Arena',genre:'Action',creator:'KAVORA',players:8,maxPlayers:16,color:'blue',description:'Fast classic-style arena rounds built for multiplayer fun.'},
{id:'brick-escape',name:'Brick Escape',genre:'Obby',creator:'Community',players:5,maxPlayers:20,color:'violet',description:'Jump, dodge obstacles and reach the end of the course.'},
{id:'sky-builders',name:'Sky Builders',genre:'Building',creator:'Community',players:3,maxPlayers:12,color:'cyan',description:'Build above the clouds with your friends.'}];
app.use(express.json({limit:'2mb'}));app.use(express.static(PUB));
const tok=()=>crypto.randomBytes(32).toString('hex'),salt=()=>crypto.randomBytes(16).toString('hex'),hash=(p,s)=>crypto.scryptSync(p,s,64).toString('hex');
const pub=u=>u&&{id:u.id,username:u.username,createdAt:u.createdAt};
function user(req){let h=req.headers.authorization||'',t=h.startsWith('Bearer ')?h.slice(7):null,s=read(db.sessions,{}),u=read(db.users,{});return t&&s[t]?u[s[t].key]:null}
app.get('/api/health',(_,r)=>r.json({ok:true,service:'KAVORA'}));
app.get('/api/games',(_,r)=>r.json({games}));
app.get('/api/games/:id',(q,r)=>{let g=games.find(x=>x.id===q.params.id);g?r.json({game:g}):r.status(404).json({error:'Game not found.'})});
app.get('/api/games/:id/servers',(q,r)=>{let g=games.find(x=>x.id===q.params.id);if(!g)return r.status(404).json({error:'Game not found.'});r.json({servers:[{id:'public',name:'KAVORA Public',players:g.players,maxPlayers:g.maxPlayers,ping:42},{id:'community',name:'Community Room',players:Math.max(1,g.players-4),maxPlayers:g.maxPlayers,ping:67}]})});
app.post('/api/auth/register',(q,r)=>{let n=String(q.body.username||'').trim(),p=String(q.body.password||'');if(!/^[A-Za-z0-9_]{3,20}$/.test(n))return r.status(400).json({error:'Username must be 3-20 letters, numbers or underscores.'});if(p.length<6)return r.status(400).json({error:'Password must be at least 6 characters.'});let us=read(db.users,{}),k=n.toLowerCase();if(us[k])return r.status(409).json({error:'Username already exists.'});let s=salt(),u={id:crypto.randomUUID(),username:n,salt:s,password:hash(p,s),createdAt:new Date().toISOString()};us[k]=u;write(db.users,us);let t=tok(),ss=read(db.sessions,{});ss[t]={key:k};write(db.sessions,ss);r.json({token:t,user:pub(u)})});
app.post('/api/auth/login',(q,r)=>{let n=String(q.body.username||'').trim(),p=String(q.body.password||''),us=read(db.users,{}),k=n.toLowerCase(),u=us[k];if(!u||hash(p,u.salt)!==u.password)return r.status(401).json({error:'Invalid username or password.'});let t=tok(),ss=read(db.sessions,{});ss[t]={key:k};write(db.sessions,ss);r.json({token:t,user:pub(u)})});
app.post('/api/auth/logout',(q,r)=>{let h=q.headers.authorization||'',t=h.startsWith('Bearer ')?h.slice(7):null,s=read(db.sessions,{});if(t)delete s[t];write(db.sessions,s);r.json({ok:true})});
app.get('/api/me',(q,r)=>{let u=user(q);u?r.json({user:pub(u)}):r.status(401).json({error:'Not signed in.'})});
app.get('/api/studio/projects',(q,r)=>{let u=user(q);if(!u)return r.status(401).json({error:'Sign in first.'});r.json({projects:read(db.projects,[]).filter(p=>p.ownerId===u.id)})});
app.post('/api/studio/projects',(q,r)=>{let u=user(q);if(!u)return r.status(401).json({error:'Sign in first.'});let a=read(db.projects,[]),p={id:crypto.randomUUID(),ownerId:u.id,name:String(q.body.name||'Untitled Place'),blocks:[],updatedAt:new Date().toISOString()};a.push(p);write(db.projects,a);r.json({project:p})});
app.put('/api/studio/projects/:id',(q,r)=>{let u=user(q);if(!u)return r.status(401).json({error:'Sign in first.'});let a=read(db.projects,[]),p=a.find(x=>x.id===q.params.id&&x.ownerId===u.id);if(!p)return r.status(404).json({error:'Project not found.'});p.name=String(q.body.name||p.name);if(Array.isArray(q.body.blocks))p.blocks=q.body.blocks;p.updatedAt=new Date().toISOString();write(db.projects,a);r.json({project:p})});
const server=http.createServer(app),wss=new WebSocketServer({server,path:'/ws'}),rooms=new Map();
wss.on('connection',(ws,req)=>{let g=new URL(req.url,'http://x').searchParams.get('gameId')||'kavora-city',room=rooms.get(g)||new Set();rooms.set(g,room);room.add(ws);ws.send(JSON.stringify({type:'welcome',players:room.size}));ws.on('message',raw=>{let m;try{m=JSON.parse(raw)}catch{return}if(m.type==='chat'){let x=JSON.stringify({type:'chat',username:String(m.username||'Guest').slice(0,20),message:String(m.message||'').slice(0,200)});for(let p of room)if(p.readyState===1)p.send(x)}});ws.on('close',()=>{room.delete(ws);if(!room.size)rooms.delete(g)})});
app.get('*',(q,r)=>q.path.startsWith('/api/')?r.status(404).end():r.sendFile(path.join(PUB,'index.html')));
server.listen(PORT,HOST,()=>console.log('KAVORA running at http://localhost:'+PORT));