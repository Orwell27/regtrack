import {beforeEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({identity:vi.fn(),rpc:vi.fn()}))
vi.mock('@/lib/auth',async original=>({...await original<object>(),verifiedIdentity:mocks.identity}))
vi.mock('@/lib/supabase',()=>({createNextServerClient:()=>({rpc:mocks.rpc})}))
import {POST} from '@/app/api/registro/route'
const profile={nombre:'Ana',territorio:'Galicia',subtema:'arrendamiento',perfil:'propietario'}
const request=(body:unknown=profile,origin='https://regtrack.example')=>new Request('https://regtrack.example/api/registro',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)})
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv('NEXT_PUBLIC_SITE_URL','https://regtrack.example');mocks.identity.mockResolvedValue({id:'verified-id'});mocks.rpc.mockResolvedValue({error:null})})
it('binds only the verified identity and allowed profile fields',async()=>{
 expect((await POST(request({...profile,actor:'victim',auth_id:'victim',email:'victim@example.test',rol:'admin',plan:'pro'}))).status).toBe(200)
 expect(mocks.rpc).toHaveBeenCalledWith('register_subscriber',{actor:'verified-id',profile})
})
it('rejects unverified identity and foreign origin without provisioning',async()=>{
 mocks.identity.mockResolvedValue(null)
 expect((await POST(request())).status).toBe(401)
 expect((await POST(request(profile,'https://evil.example'))).status).toBe(403)
 expect(mocks.rpc).not.toHaveBeenCalled()
})
it.each([null,[],{...profile,territorio:'Inventado'},{...profile,nombre:'x'},{...profile,perfil:'admin'}])('rejects invalid fields',async body=>{
 expect((await POST(request(body))).status).toBe(400);expect(mocks.rpc).not.toHaveBeenCalled()
})
it.each([['CONFLICT',409],['FORBIDDEN',403],['internal SQL details',503]])('handles %s without disclosing internals',async(message,status)=>{
 mocks.rpc.mockResolvedValue({error:{message}});const response=await POST(request())
 expect(response.status).toBe(status);expect(await response.text()).not.toContain(message)
})
