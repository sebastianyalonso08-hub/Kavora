const express=require("express"),http=require("http"),path=require("path"),bcrypt=require("bcryptjs"),jwt=require("jsonwebtoken");
const {Pool}=require("pg"); const {WebSocketServer}=require("ws");
const app=express(),server=http.createServer(app);
const PORT=process.env.PORT||10000, SECRET=process.env.JWT_SECRET||"dev-secret";
const pool=process.env.DATABASE_URL?new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.NODE_ENV==="production"?{rejectUnauthorized:false}:false}):null;
app.use(express.json({limit:"4mb"})); app.use(express.static(path.join(__dirname,"public")));
async function q(sql,args=[]){if(!pool) throw Error("DATABASE_URL is not configured"); return pool.query(sql,args)}
function auth(req,res,next){try{const t=(req.headers.authorization||"").replace("Bearer ","");req.user=jwt.verify(t,SECRET);next()}catch{res.status(401).json({error:"Unauthorized"})}}
function token(u){return jwt.sign({id:u.id,username:u.username},SECRET,{expiresIn:"7d"})}

app.get("/api/health",(req,res)=>res.json({ok:true,service:"Kavora"}));
app.post("/api/register",async(req,res)=>{try{
 const {username,password,displayName}=req.body;
 if(!/^[A-Za-z0-9_]{3,24}$/.test(username||""))return res.status(400).json({error:"Invalid username"});
 if((password||"").length<8)return res.status(400).json({error:"Password must have 8+ characters"});
 const r=await q("INSERT INTO users(username,display_name,password_hash) VALUES($1,$2,$3) RETURNING id,username,display_name,avatar,inventory",[username,displayName||username,await bcrypt.hash(password,12)]);
 res.json({token:token(r.rows[0]),user:r.rows[0]});
}catch(e){res.status(e.code==="23505"?409:500).json({error:e.code==="23505"?"Username already exists":"Registration failed"})}});
app.post("/api/login",async(req,res)=>{try{
 const r=await q("SELECT * FROM users WHERE username=$1",[req.body.username]); const u=r.rows[0];
 if(!u||!(await bcrypt.compare(req.body.password||"",u.password_hash)))return res.status(401).json({error:"Invalid credentials"});
 res.json({token:token(u),user:{id:u.id,username:u.username,display_name:u.display_name,avatar:u.avatar,inventory:u.inventory}});
}catch{res.status(500).json({error:"Login failed"})}});
app.get("/api/me",auth,async(req,res)=>{const r=await q("SELECT id,username,display_name,avatar,inventory,created_at FROM users WHERE id=$1",[req.user.id]);res.json({user:r.rows[0]})});
app.put("/api/me/avatar",auth,async(req,res)=>{const r=await q("UPDATE users SET avatar=$1 WHERE id=$2 RETURNING avatar",[JSON.stringify(req.body.avatar||{}) ,req.user.id]);res.json(r.rows[0])});

app.get("/api/games",async(req,res)=>{const r=await q(`SELECT g.id,g.name,g.description,g.thumbnail,u.username owner FROM games g JOIN users u ON u.id=g.owner_id WHERE g.is_public=true ORDER BY g.updated_at DESC`);res.json({games:r.rows})});
app.get("/api/my-games",auth,async(req,res)=>{const r=await q("SELECT * FROM games WHERE owner_id=$1 ORDER BY updated_at DESC",[req.user.id]);res.json({games:r.rows})});
app.post("/api/games",auth,async(req,res)=>{const b=req.body;const r=await q(`INSERT INTO games(owner_id,name,description,thumbnail,scene,is_public) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[req.user.id,b.name,b.description||"",b.thumbnail||"",JSON.stringify(b.scene||{objects:[]}),!!b.isPublic]);res.json({game:r.rows[0]})});
app.put("/api/games/:id",auth,async(req,res)=>{const b=req.body;const r=await q(`UPDATE games SET name=$1,description=$2,thumbnail=$3,scene=$4,is_public=$5,updated_at=NOW() WHERE id=$6 AND owner_id=$7 RETURNING *`,[b.name,b.description||"",b.thumbnail||"",JSON.stringify(b.scene||{objects:[]}),!!b.isPublic,req.params.id,req.user.id]);if(!r.rows[0])return res.status(404).json({error:"Game not found"});res.json({game:r.rows[0]})});
app.post("/api/games/:id/save",auth,async(req,res)=>{await q("INSERT INTO saved_games(user_id,game_id) VALUES($1,$2) ON CONFLICT DO NOTHING",[req.user.id,req.params.id]);res.json({ok:true})});
app.get("/api/saved-games",auth,async(req,res)=>{const r=await q("SELECT g.* FROM saved_games s JOIN games g ON g.id=s.game_id WHERE s.user_id=$1 ORDER BY g.updated_at DESC",[req.user.id]);res.json({games:r.rows})});

app.get("/api/catalog",async(req,res)=>{const r=await q("SELECT c.id,c.name,c.type,c.asset,c.price,u.username creator FROM catalog_items c JOIN users u ON u.id=c.creator_id WHERE c.is_public=true ORDER BY c.created_at DESC");res.json({items:r.rows})});
app.post("/api/catalog",auth,async(req,res)=>{const b=req.body;if(!["shirt","pants","face"].includes(b.type))return res.status(400).json({error:"Invalid item type"});const r=await q("INSERT INTO catalog_items(creator_id,name,type,asset,price) VALUES($1,$2,$3,$4,$5) RETURNING *",[req.user.id,b.name,b.type,JSON.stringify(b.asset||{}),Number(b.price)||0]);res.json({item:r.rows[0]})});

const rooms=new Map(), wss=new WebSocketServer({server,path:"/ws"});
wss.on("connection",(ws,req)=>{const id=new URL(req.url,"http://x").searchParams.get("game")||"lobby";if(!rooms.has(id))rooms.set(id,new Map());const room=rooms.get(id),pid=Math.random().toString(36).slice(2,9),p={id:pid,x:0,y:0,z:0,ry:0};room.set(pid,{ws,p});ws.send(JSON.stringify({type:"welcome",players:[...room.values()].map(v=>v.p),self:pid}));broadcast(room,{type:"join",player:p});ws.on("message",b=>{try{const m=JSON.parse(b);if(m.type==="state"){Object.assign(p,{x:+m.x||0,y:+m.y||0,z:+m.z||0,ry:+m.ry||0});broadcast(room,{type:"state",player:p})}}catch{}});ws.on("close",()=>{room.delete(pid);broadcast(room,{type:"leave",id:pid});if(!room.size)rooms.delete(id)})});
function broadcast(room,m){const s=JSON.stringify(m);for(const v of room.values())if(v.ws.readyState===1)v.ws.send(s)}
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public/index.html")));
server.listen(PORT,"0.0.0.0",()=>console.log("Kavora listening",PORT));
