'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { REGIONS } from '@/lib/community/model'
export function Registration({email}: {email?:string}) {
  const [pending,setPending]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false)
  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if(pending)return
    setPending(true);setError('')
    const data=Object.fromEntries(new FormData(event.currentTarget))
    try {
      if(email) {
        const result=await fetch('/api/registro',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
        const body=await result.json();if(!result.ok)throw new Error(body.error)
        // A fresh document avoids reusing the anonymous Router Cache after provisioning.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign('/alertas')
      } else {
        const client=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
        const {data: auth,error}=await client.auth.signUp({email:String(data.email).trim(),password:String(data.password),options:{emailRedirectTo:`${window.location.origin}/api/auth/confirm`}})
        if(error)throw new Error('No se ha podido crear la cuenta. Revisa los datos o accede si ya tienes cuenta.')
        // Refresh the document so verified cookies reach the server profile page.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        if(auth.session)window.location.assign('/registro');else setDone(true)
      }
    } catch(e){setError(e instanceof Error?e.message:'No se ha podido guardar. Inténtalo más tarde.')}
    finally{setPending(false)}
  }
  return <main className="min-h-screen bg-slate-50 flex items-center justify-center p-5"><div className="bg-white border rounded-xl p-8 w-full max-w-md space-y-5">
    <h1 className="text-2xl font-semibold">{email?'Completa tu perfil':'Crea tu cuenta de RegTrack'}</h1>
    {done?<div role="status"><h2>Revisa tu correo</h2><p>Si la dirección puede registrarse, recibirás las instrucciones para confirmarla. Después podrás completar tu perfil.</p><Link href="/login?next=/registro">Acceder para continuar</Link></div>:<form onSubmit={submit} className="space-y-4"><fieldset disabled={pending} className="space-y-4">
      {email?<><p>Correo confirmado: {email}</p><label className="block">Nombre<input className="block border rounded p-2 w-full" name="nombre" minLength={2} maxLength={100} required autoComplete="name" /></label>
      <label className="block">Territorio principal<select name="territorio" className="block border rounded p-2 w-full" defaultValue="Nacional"><option>Nacional</option>{REGIONS.map(r=><option key={r}>{r}</option>)}</select></label>
      <label className="block">Área de interés<select name="subtema" className="block border rounded p-2 w-full" defaultValue="arrendamiento">{['urbanismo','fiscalidad','arrendamiento','hipotecas','obra_nueva','construccion','rehabilitacion'].map(s=><option key={s} value={s}>{{urbanismo:'Urbanismo',fiscalidad:'Fiscalidad',arrendamiento:'Alquiler',hipotecas:'Hipotecas',obra_nueva:'Obra nueva',construccion:'Construcción',rehabilitacion:'Rehabilitación'}[s]}</option>)}</select></label>
      <label className="block">Tu perfil<select name="perfil" className="block border rounded p-2 w-full" defaultValue="propietario">{['propietario','inversor','promotor','agencia','despacho'].map(p=><option key={p} value={p}>{{propietario:'Propietario',inversor:'Inversor',promotor:'Promotor',agencia:'Agencia',despacho:'Despacho'}[p]}</option>)}</select></label></>:<>
      <label className="block">Email<input className="block border rounded p-2 w-full" name="email" type="email" autoComplete="email" maxLength={254} required /></label>
      <label className="block">Contraseña<input className="block border rounded p-2 w-full" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label><p>Usa al menos 12 caracteres. El correo debe confirmarse antes de crear tu perfil.</p></>}
      <button className="w-full rounded bg-sky-700 text-white py-2">{pending?'Guardando…':email?'Guardar perfil':'Crear cuenta'}</button>
    </fieldset>{error&&<p role="alert" className="text-red-700">{error}</p>}</form>}
    <Link href="/login?next=/registro" className="block underline">Ya tengo cuenta</Link><Link href="/comunidad" className="block underline">Conocer la comunidad</Link>
  </div></main>
}
