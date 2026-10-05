import { describe, it, expect, vi, beforeEach } from 'vitest'
const mocks=vi.hoisted(()=>({getUser:vi.fn(),getSession:vi.fn(),profile:vi.fn(),eq:vi.fn(),from:vi.fn()}))
vi.mock('@supabase/ssr',()=>({createServerClient:()=>({auth:{getUser:mocks.getUser,getSession:mocks.getSession}})}))
vi.mock('next/headers',()=>({cookies:async()=>({getAll:()=>[]})}))
vi.mock('@/lib/supabase',()=>({createNextServerClient:()=>({from:mocks.from})}))
import {getAuthUser,requireAdmin,rejectForeignOrigin} from '@/lib/auth'
const identity={id:'verified-id',email:'owner@example.test',email_confirmed_at:'2026-01-01',is_anonymous:false,user_metadata:{rol:'admin'}}
beforeEach(()=>{
 vi.resetAllMocks()
 mocks.getUser.mockResolvedValue({data:{user:identity},error:null})
 mocks.profile.mockResolvedValue({data:{id:'profile',rol:'subscriber',plan:'free',nombre:'Owner',activo:true},error:null})
 mocks.eq.mockReturnValue({maybeSingle:mocks.profile})
 mocks.from.mockReturnValue({select:()=>({eq:mocks.eq})})
})
describe('verified identity and server-controlled profile',()=>{
 it('rejects forged cookie/session identities before any profile read',async()=>{
  mocks.getSession.mockResolvedValue({data:{session:{user:{...identity,id:'victim'}}}})
  mocks.getUser.mockResolvedValue({data:{user:null},error:{message:'Invalid JWT'}})
  expect(await getAuthUser()).toBeNull();expect(mocks.from).not.toHaveBeenCalled();expect(mocks.getSession).not.toHaveBeenCalled()
 })
 it.each([{email_confirmed_at:null},{is_anonymous:true},{email:null}])('rejects incomplete or anonymous identities %j',async patch=>{
  mocks.getUser.mockResolvedValue({data:{user:{...identity,...patch}},error:null})
  expect(await getAuthUser()).toBeNull();expect(mocks.from).not.toHaveBeenCalled()
 })
 it('binds exclusively to verified auth ID, never email filters or metadata roles',async()=>{
  expect(await getAuthUser()).toMatchObject({rol:'subscriber',plan:'free',authId:'verified-id'})
  expect(mocks.eq).toHaveBeenCalledWith('auth_id','verified-id')
  expect((await requireAdmin()).error?.status).toBe(403)
 })
 it.each([null,{activo:false,rol:'admin',plan:'pro'},{activo:true,rol:'superuser',plan:'pro'}])('rejects missing, disabled or malformed profiles',async data=>{
  mocks.profile.mockResolvedValue({data,error:null});expect(await getAuthUser()).toBeNull()
 })
 it('preserves active administrator access and distinguishes 401/403',async()=>{
  mocks.profile.mockResolvedValue({data:{id:'p',nombre:'Admin',activo:true,rol:'admin',plan:'pro'},error:null})
  expect((await requireAdmin()).user?.rol).toBe('admin')
  mocks.getUser.mockResolvedValue({data:{user:null},error:null})
  expect((await requireAdmin()).error?.status).toBe(401)
 })
 it('fails closed when profile lookup fails',async()=>{
  mocks.profile.mockResolvedValue({data:null,error:{message:'offline'}});expect(await getAuthUser()).toBeNull()
 })
 it('rejects cross-site, absent Origin and forged forwarded host',()=>{
  vi.stubEnv('NEXT_PUBLIC_SITE_URL','https://regtrack.example')
  for(const origin of ['', 'https://attacker.example']) expect(rejectForeignOrigin(new Request('https://internal/api',{headers:{origin,'x-forwarded-host':'attacker.example'}}))?.status).toBe(403)
  expect(rejectForeignOrigin(new Request('https://internal/api',{headers:{origin:'https://regtrack.example'}}))).toBeNull()
  vi.unstubAllEnvs()
 })
})
