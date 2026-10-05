import {beforeEach,describe,it,expect,vi} from 'vitest'
import {NextRequest,NextResponse} from 'next/server'
const mock=vi.hoisted(()=>({admin:vi.fn(),from:vi.fn(),pipeline:vi.fn(),user:vi.fn()}))
vi.mock('@/lib/auth',async importOriginal=>({...await importOriginal<object>(),requireAdmin:mock.admin,getAuthUser:mock.user}))
vi.mock('@/lib/supabase',()=>({createNextServerClient:()=>({from:mock.from})}))
vi.mock('@/lib/github',()=>({lanzarPipeline:mock.pipeline}))
import * as config from '@/app/api/config/route'
import * as users from '@/app/api/usuarios/[id]/route'
import * as alerts from '@/app/api/alertas/[id]/route'
import * as publish from '@/app/api/alertas/[id]/enviar/route'
import * as categories from '@/app/api/admin/subcategorias/[id]/route'
import * as pipeline from '@/app/api/pipeline/run/route'
import * as relations from '@/app/api/alertas/[id]/relaciones/route'
const context={params:Promise.resolve({id:'03f2f098-a036-4c03-bbf4-2842d4b32920'})}
const request=(body:unknown={},origin='https://regtrack.example')=>new NextRequest('https://regtrack.example/api/test',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)})
const routes=[
 ['config read',()=>config.GET()],['config write',()=>config.PUT(request({score_minimo:5}))],
 ['plan',()=>users.POST(request({plan:'pro'}),context)],['approve',()=>alerts.POST(request({accion:'aprobar'}),context)],
 ['publish',()=>publish.POST(request(),context)],['categories',()=>categories.PATCH(request({activo:true}),{params:Promise.resolve({id:'1'})})],
 ['pipeline',()=>pipeline.POST(request())],
] as const
beforeEach(()=>{
 vi.resetAllMocks();vi.stubEnv('NEXT_PUBLIC_SITE_URL','https://regtrack.example')
 mock.admin.mockResolvedValue({user:{rol:'admin'},error:null});mock.pipeline.mockResolvedValue({ok:true,url:'https://github.com/example'})
 mock.from.mockImplementation((table:string)=>{
  const q:Record<string,unknown>={};for(const key of ['select','eq','in','update','upsert'])q[key]=vi.fn(()=>q)
  q.single=async()=>({data:{id:'alert',estado:'aprobada'},error:null})
  q.maybeSingle=async()=>({data:null,error:null})
  q.then=(resolve:(x:unknown)=>unknown)=>resolve({data:table==='config'?[{clave:'score_minimo',valor:5}]:table==='subcategorias'?[{id:1}]:[],error:null})
  return q
 })
})
describe('every privileged entry point checks access before side effects',()=>{
 for(const [name,run] of routes) {
  it.each([401,403])(`${name} rejects %i before touching database or pipeline`,async status=>{
   mock.admin.mockResolvedValue({user:null,error:NextResponse.json({error:'Denied'},{status})})
   expect((await run()).status).toBe(status);expect(mock.from).not.toHaveBeenCalled();expect(mock.pipeline).not.toHaveBeenCalled()
  })
  it(`${name} preserves the allowed administrator operation`,async()=>{expect((await run()).status).toBe(200)})
 }
 it('rejects a cross-origin administrator write before database mutation',async()=>{
  expect((await users.POST(request({plan:'pro'},'https://attacker.example'),context)).status).toBe(403)
  expect(mock.from).not.toHaveBeenCalled()
 })
 it('requires a session for relation reads and denies unpublished base alerts',async()=>{
  mock.user.mockResolvedValue(null);expect((await relations.GET(request(),context)).status).toBe(401)
  expect(mock.from).not.toHaveBeenCalled()
  mock.user.mockResolvedValue({rol:'subscriber'});expect((await relations.GET(request(),context)).status).toBe(404)
 })
 it.each(['subscriber','admin'])('filters unpublished related alerts for %s',async rol=>{
  const id=(await context.params).id
  mock.user.mockResolvedValue({rol})
  mock.from.mockImplementation((table:string)=>{
   let publishedOnly=false,direction=''
   const q={
    select:()=>q,in:()=>q,
    eq:(column:string)=>{if(column==='estado')publishedOnly=true;else direction=column;return q},
    maybeSingle:async()=>({data:{id},error:null}),
    then:(resolve:(value:unknown)=>unknown)=>resolve({data:table==='alerta_relaciones'?(direction==='alerta_id'?[{id:'r1',alerta_id:id,alerta_relacionada_id:'published'},{id:'r2',alerta_id:id,alerta_relacionada_id:'draft',razon:'Private draft context'}]:[]):[{id:'published',titulo:'Published'},...publishedOnly?[]:[{id:'draft',titulo:'Draft'}]],error:null}),
   };return q
  })
  const body=await(await relations.GET(request(),context)).json()
  expect(body.relaciones.map((r:{titulo:string})=>r.titulo)).toEqual(rol==='admin'?['Published','Draft']:['Published'])
  if(rol==='subscriber')expect(JSON.stringify(body)).not.toContain('Private draft context')
 })
})
