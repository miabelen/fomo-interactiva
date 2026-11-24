const http=require('http'),fs=require('fs'),path=require('path');
const PORT=process.env.PORT||3000,BASE=__dirname;
let state={},epoch=1,clients=new Set();
function send(res,code,data){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'});res.end(JSON.stringify(data))}
function broadcast(type,data){for(const c of clients){try{c.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`)}catch{clients.delete(c)}}}
function body(req){return new Promise((ok,no)=>{let chunks='';req.on('data',x=>{chunks+=x;if(chunks.length>100000){no(Error('Demasiados datos'));req.destroy()}});req.on('end',()=>{try{ok(JSON.parse(chunks||'{}'))}catch{no(Error('JSON inválido'))}})})}
const mime={'.html':'text/html; charset=utf-8','.png':'image/png','.js':'text/javascript','.css':'text/css','.ico':'image/x-icon'};
http.createServer(async(req,res)=>{try{let u=new URL(req.url,'http://localhost');if(u.pathname==='/api/events'){
 res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});clients.add(res);res.write(`event: state\ndata: ${JSON.stringify({state,epoch})}\n\n`);req.on('close',()=>clients.delete(res));return}
 if(u.pathname==='/api/state')return send(res,200,{state,epoch});
 if(req.method==='POST'&&u.pathname.startsWith('/api/')){const b=await body(req);if(u.pathname==='/api/choice'){
 if(!['color','movimiento','forma'].includes(b.role))return send(res,400,{error:'Rol inválido'});
 if(JSON.stringify(b.value).length>30000)return send(res,413,{error:'Selección demasiado grande'});
 state[b.role]={value:b.value,ready:true,at:Date.now()};broadcast('state',{state,epoch});return send(res,200,{state,epoch})}
 if(u.pathname==='/api/unchoose'){if(!['color','movimiento','forma'].includes(b.role))return send(res,400,{error:'Rol inválido'});delete state[b.role];broadcast('state',{state,epoch});return send(res,200,{state,epoch})}
 if(u.pathname==='/api/reset'){state={};epoch++;broadcast('state',{state,epoch});return send(res,200,{state,epoch})}
 if(u.pathname==='/api/stroke'){if(typeof b.id!=='string'||b.id.length>100||!Number.isFinite(b.p?.x)||!Number.isFinite(b.p?.y))return send(res,400,{error:'Trazo inválido'});broadcast('stroke',b);return send(res,200,{ok:true})}}
 if(req.method!=='GET')return send(res,405,{error:'Método inválido'});
 let filename=decodeURIComponent(u.pathname==='/'?'/inicio.html':u.pathname);const target=path.resolve(BASE,'.'+filename);
 if(!target.startsWith(BASE+path.sep))return send(res,403,{error:'Acceso denegado'});
 fs.readFile(target,(err,data)=>{if(err){res.writeHead(404);res.end('No encontrado');return}res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data)});
 }catch(e){send(res,500,{error:String(e.message)})}}).listen(PORT,'0.0.0.0',()=>console.log(`FOMO escuchando en puerto ${PORT}`));
// Mantiene las conexiones SSE activas en proxies.
setInterval(()=>{for(const c of clients){try{c.write(': ping\n\n')}catch{clients.delete(c)}}},20000);
