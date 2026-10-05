import {beforeEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({exchange:vi.fn()}))
vi.mock('@supabase/ssr',()=>({createServerClient:()=>({auth:{exchangeCodeForSession:mocks.exchange}})}))
vi.mock('next/headers',()=>({cookies:async()=>({getAll:()=>[],set:vi.fn()})}))
import {GET} from '@/app/api/auth/confirm/route'
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv('NEXT_PUBLIC_SITE_URL','https://regtrack.example')})
it('exchanges the code and fixes the destination despite hostile next/forwarded headers',async()=>{
 mocks.exchange.mockResolvedValue({error:null})
 const response=await GET(new Request('https://internal/api/auth/confirm?code=verified-code&next=https://evil.example',{headers:{'x-forwarded-host':'evil.example'}}))
 expect(mocks.exchange).toHaveBeenCalledWith('verified-code')
 expect(response.headers.get('location')).toBe('https://regtrack.example/registro')
})
it.each(['','?code=expired'])('returns failed or missing confirmation to sign-in %s',async suffix=>{
 mocks.exchange.mockResolvedValue({error:{message:'expired'}})
 const response=await GET(new Request('https://internal/api/auth/confirm'+suffix))
 expect(response.headers.get('location')).toBe('https://regtrack.example/login?next=/registro&confirmation=check')
})
