import type {
  AdminSnapshot,
  Snapshot,
  TopicDetail,
  Regulation,
} from '@/lib/community/model'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { beforeAll, afterAll, describe, it, expect } from 'vitest'
let db: PGlite
const owner = randomUUID(),
  helper = randomUUID(),
  outsider = randomUUID(),
  mod = randomUUID(),
  unconfirmed = randomUUID()
let ownerMember: string, helperMember: string, topic: string, reply: string
async function call(
  actor: string | null,
  command: string,
  payload: Record<string, unknown> = {},
  rate = 'a'.repeat(64),
) {
  const r = await db.query<{
    value: AdminSnapshot & Snapshot & TopicDetail & Regulation & { id: string }
  }>('select community_execute($1::uuid,$2,$3::jsonb,$4) as value', [
    actor,
    command,
    JSON.stringify(payload),
    rate,
  ])
  return r.rows[0].value
}
const write = (
  actor: string,
  command: string,
  payload: Record<string, unknown> = {},
) => call(actor, command, { request_id: randomUUID(), ...payload })
const application = (email: string) => ({
  email,
  alias: email.split('@')[0],
  region: 'Galicia',
  owner_kind: 'Vivienda habitual',
  need: '',
  consent: true,
})
const question = {
  title: '¿Cómo comparáis presupuestos de reforma?',
  body: 'Tengo tres presupuestos con partidas diferentes y quiero compararlos.',
  category: 'cuidar',
  region: 'Galicia',
}
beforeAll(async () => {
  db = new PGlite()
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,banned_until timestamptz);
    grant usage on schema auth,public to service_role,anon,authenticated;grant select on auth.users to service_role;`)
  await db.exec(
    readFileSync(
      'supabase/migrations/20261004224507_comunidad_nacional.sql',
      'utf8',
    ),
  )
  await db.exec(readFileSync('supabase/migrations/001_initial.sql', 'utf8'))
  await db.exec(readFileSync('supabase/migrations/006_correlacion.sql', 'utf8'))
  await db.exec(
    readFileSync(
      'supabase/migrations/20261005113039_comunidad_normativa.sql',
      'utf8',
    ),
  )
  await db.exec(
    'grant select,insert,update,delete on alertas,alerta_relaciones to service_role',
  )
  for (const [id, email] of [
    [owner, 'owner@example.test'],
    [helper, 'helper@example.test'],
    [outsider, 'outsider@example.test'],
    [mod, 'moderator@example.test'],
    [unconfirmed, 'unconfirmed@example.test'],
  ])
    await db.query('insert into auth.users values($1,$2,$3,null)', [
      id,
      email,
      id === unconfirmed ? null : new Date().toISOString(),
    ])
  await db.query('insert into community_moderators values($1)', [mod])
  await db.exec('set role service_role')
}, 30000)
afterAll(async () => {
  await db?.close()
})
describe.sequential('community production SQL contract', () => {
  it('denies direct table and RPC access to both public roles', async () => {
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`reset role;set role ${role}`)
      await expect(db.query('select * from community_members')).rejects.toThrow(
        /permission denied/,
      )
      await expect(call(mod, 'admin')).rejects.toThrow(/permission denied/)
    }
    await db.exec('reset role;set role service_role')
  })
  it('keeps visitors out and rejects unconfirmed or nonexistent auth identities', async () => {
    expect((await call(null, 'read')).status).toBe('visitor')
    await expect(call(null, 'topic', { id: randomUUID() })).rejects.toThrow(
      'UNAUTHENTICATED',
    )
    await expect(call(unconfirmed, 'read')).rejects.toThrow('UNAUTHENTICATED')
    await expect(call(randomUUID(), 'read')).rejects.toThrow('UNAUTHENTICATED')
    await expect(call(outsider, 'admin')).rejects.toThrow('FORBIDDEN')
  })
  it('requires affirmative consent even if the API validation is bypassed', async () => {
    const p = { ...application('owner@example.test'), consent: undefined }
    await expect(call(null, 'apply', p)).rejects.toThrow('INVALID')
  })
  it('admits by verified email only, with no access for pending applications', async () => {
    await call(null, 'apply', application('owner@example.test'))
    await call(null, 'apply', application('helper@example.test'))
    const pending = await call(owner, 'read')
    ownerMember = pending.member!.id
    expect(pending.status).toBe('pending')
    expect(pending.topics).toBeUndefined()
    await expect(write(owner, 'ask', question)).rejects.toThrow('FORBIDDEN')
    helperMember = (await call(helper, 'read')).member!.id
    await write(mod, 'admit', {
      id: ownerMember,
      reason: 'Participa en el piloto',
    })
    await write(mod, 'admit', {
      id: helperMember,
      reason: 'Participa en el piloto',
    })
    expect((await call(owner, 'read')).status).toBe('approved')
  })
  it('does not let repeated anonymous applications overwrite admission or details', async () => {
    await call(null, 'apply', {
      ...application('owner@example.test'),
      alias: 'Suplantador',
    })
    const member = await call(owner, 'read')
    expect(member.status).toBe('approved')
    expect(member.member!.alias).toBe('owner')
  })
  it('creates only one question when a request is retried', async () => {
    const p = { ...question, request_id: randomUUID() }
    const first = await call(owner, 'ask', p)
    const second = await call(owner, 'ask', p)
    topic = first.id
    expect(second.id).toBe(topic)
    expect((await call(owner, 'read')).topics).toHaveLength(1)
  })
  it('never exposes member emails to participants', async () => {
    expect(JSON.stringify(await call(helper, 'read'))).not.toContain(
      '@example.test',
    )
    expect(
      JSON.stringify(await call(helper, 'topic', { id: topic })),
    ).not.toContain('@example.test')
    await expect(call(owner, 'admin')).rejects.toThrow('FORBIDDEN')
    await expect(
      write(owner, 'admit', {
        id: helperMember,
        reason: 'Intento no autorizado',
      }),
    ).rejects.toThrow('FORBIDDEN')
  })
  it('requires sources or affiliation for the corresponding reply type', async () => {
    await expect(
      write(helper, 'reply', {
        topic_id: topic,
        body: 'Consulta esta norma',
        kind: 'fuente',
      }),
    ).rejects.toThrow(/check constraint/)
    await expect(
      write(helper, 'reply', {
        topic_id: topic,
        body: 'Consejo profesional',
        kind: 'profesional',
      }),
    ).rejects.toThrow(/check constraint/)
    reply = (
      await write(helper, 'reply', {
        topic_id: topic,
        body: 'Yo pedí el desglose por partidas y pude comparar mejor.',
        kind: 'experiencia',
      })
    ).id
  })
  it('limits usefulness and edits to their rightful authors', async () => {
    await expect(
      write(helper, 'useful', { topic_id: topic, id: reply, enabled: true }),
    ).rejects.toThrow('FORBIDDEN')
    await write(owner, 'useful', { topic_id: topic, id: reply, enabled: true })
    await expect(
      write(owner, 'edit_reply', {
        topic_id: topic,
        id: reply,
        revision: 1,
        body: 'Alteración ajena',
        kind: 'experiencia',
      }),
    ).rejects.toThrow('FORBIDDEN')
    await write(helper, 'edit_reply', {
      topic_id: topic,
      id: reply,
      revision: 1,
      body: 'Pedí también el plazo y las exclusiones por escrito.',
      kind: 'experiencia',
    })
    expect((await call(owner, 'topic', { id: topic })).replies[0].useful).toBe(
      false,
    )
    await expect(
      write(helper, 'edit_reply', {
        topic_id: topic,
        id: reply,
        revision: 1,
        body: 'Edición obsoleta',
        kind: 'experiencia',
      }),
    ).rejects.toThrow('CONFLICT')
  })
  it('requires consent and matching revisions before publishing a reusable case', async () => {
    const p = {
      topic_id: topic,
      revision: 1,
      title: 'Comparar presupuestos de obra',
      body: 'Pedir el desglose por partidas permitió comparar las propuestas.',
      scope:
        'Experiencia particular en Galicia; no es una recomendación universal.',
    }
    await expect(write(mod, 'publish', p)).rejects.toThrow('CONSENT_REQUIRED')
    await write(owner, 'consent', { topic_id: topic, enabled: true })
    await expect(write(mod, 'publish', p)).rejects.toThrow('CONFLICT')
    await expect(
      write(mod, 'publish', { ...p, revision: undefined }),
    ).rejects.toThrow('CONFLICT')
    await write(mod, 'publish', { ...p, revision: 2 })
    expect((await call(helper, 'read')).resources).toHaveLength(1)
    await write(owner, 'consent', { topic_id: topic, enabled: false })
    expect((await call(helper, 'read')).resources).toHaveLength(0)
  })
  it('does not accept cross-conversation reply IDs in reports or moderation', async () => {
    const other = (
      await write(owner, 'ask', {
        ...question,
        title: 'Otra duda sobre una reforma diferente',
      })
    ).id
    await expect(
      write(owner, 'report', {
        topic_id: other,
        reply_id: reply,
        reason: 'Aviso de prueba cruzado',
      }),
    ).rejects.toThrow('NOT_FOUND')
    await expect(
      write(mod, 'moderate', {
        topic_id: other,
        reply_id: reply,
        hidden: true,
        reason: 'Prueba de cruce',
      }),
    ).rejects.toThrow('NOT_FOUND')
  })
  it('hides and restores conversations, audits moderation, and resolves reports', async () => {
    const report = (
      await write(helper, 'report', {
        topic_id: topic,
        reason: 'Necesita revisión del equipo',
      })
    ).id
    await write(mod, 'moderate', {
      topic_id: topic,
      hidden: true,
      reason: 'Revisando el aviso',
    })
    await expect(call(helper, 'topic', { id: topic })).rejects.toThrow(
      'NOT_FOUND',
    )
    expect(
      (await call(mod, 'admin')).hidden.some(
        (t: { id: string }) => t.id === topic,
      ),
    ).toBe(true)
    await write(mod, 'moderate', {
      topic_id: topic,
      hidden: false,
      reason: 'Revisión completada',
    })
    await write(mod, 'resolve_report', {
      id: report,
      reason: 'Revisado con el autor',
    })
    const admin = await call(mod, 'admin')
    expect(admin.reports).toHaveLength(0)
    expect(
      admin.audit.some((a: { action: string }) => a.action === 'moderate'),
    ).toBe(true)
  })
  it('revokes access immediately, including replayed successful requests', async () => {
    const p = { request_id: randomUUID(), topic_id: topic, enabled: true }
    await call(helper, 'follow', p)
    await write(mod, 'revoke', { id: helperMember, reason: 'Baja solicitada' })
    expect((await call(helper, 'read')).status).toBe('revoked')
    await expect(call(helper, 'topic', { id: topic })).rejects.toThrow(
      'FORBIDDEN',
    )
    await expect(call(helper, 'follow', p)).rejects.toThrow('FORBIDDEN')
  })
  it('expires old pending applications but preserves members and content', async () => {
    await call(null, 'apply', application('expired@example.test'))
    await db.query(
      "update community_members set created_at=now()-interval '91 days' where email='expired@example.test'",
    )
    await write(mod, 'purge')
    const admin = await call(mod, 'admin')
    expect(
      admin.members.some(
        (m: { email: string }) => m.email === 'expired@example.test',
      ),
    ).toBe(false)
    expect(admin.member_count).toBe(2)
  })
  it('enforces rate limiting on anonymous submissions', async () => {
    for (let i = 0; i < 10; i++)
      await call(
        null,
        'apply',
        application('limited@example.test'),
        'b'.repeat(64),
      )
    await expect(
      call(null, 'apply', application('limited@example.test'), 'b'.repeat(64)),
    ).rejects.toThrow('RATE_LIMIT')
  })
  describe.sequential(
    'published regulation → discussion → reviewed guide',
    () => {
      const alertId = randomUUID(),
        draftId = randomUUID(),
        relatedId = randomUUID()
      let linkedTopic: string, version: string
      it('only exposes published alerts to admitted members, never drafts or premium text', async () => {
        await db.query(
          `insert into alertas(id,url,titulo,fuente,ambito,territorios,fecha_publicacion,resumen,texto_alerta_pro,estado) values
        ($1,'https://www.boe.es/example-test','Norma de prueba estatal','BOE','estatal','["España"]','2026-01-01','Resumen de prueba','PREMIUM_SECRET','enviada'),
        ($2,'https://www.boe.es/draft-test','Borrador confidencial','BOE','estatal','[]','2026-01-02','INTERNAL_SECRET',null,'pendiente_revision')`,
          [alertId, draftId],
        )
        await expect(call(null, 'regulation', { id: alertId })).rejects.toThrow(
          'UNAUTHENTICATED',
        )
        await expect(
          call(helper, 'regulation', { id: alertId }),
        ).rejects.toThrow('FORBIDDEN')
        await expect(
          call(owner, 'regulation', { id: draftId }),
        ).rejects.toThrow('NOT_FOUND')
        const source = await call(owner, 'regulation', { id: alertId })
        version = source.version
        expect(source.territories).toEqual(['España'])
        expect(JSON.stringify(source)).not.toContain('PREMIUM_SECRET')
        const list = await call(owner, 'regulations')
        expect(JSON.stringify(list)).not.toContain('INTERNAL_SECRET')
        expect(JSON.stringify(list)).not.toContain(draftId)
        for (const role of ['anon', 'authenticated']) {
          await db.exec(`reset role;set role ${role}`)
          await expect(
            db.query('select community_alert_context($1::uuid)', [alertId]),
          ).rejects.toThrow(/permission denied/)
        }
        await db.exec('reset role;set role service_role')
      })
      it('captures trusted reference context and municipality; rejects missing and obsolete references', async () => {
        await expect(
          write(owner, 'ask', {
            ...question,
            alert_id: draftId,
            regulation_version: version,
          }),
        ).rejects.toThrow('NOT_FOUND')
        await expect(
          write(owner, 'ask', {
            ...question,
            alert_id: alertId,
            regulation_version: 'stale',
          }),
        ).rejects.toThrow('CONFLICT')
        const payload = {
          ...question,
          alert_id: alertId,
          regulation_version: version,
          municipality: 'A Coruña',
          reference_snapshot: { title: 'Forged' },
        }
        const req = randomUUID()
        linkedTopic = (
          await call(owner, 'ask', { ...payload, request_id: req })
        ).id
        expect(
          (await call(owner, 'ask', { ...payload, request_id: req })).id,
        ).toBe(linkedTopic)
        const t = (await call(owner, 'topic', { id: linkedTopic })).topic
        expect(t.reference_snapshot?.title).toBe('Norma de prueba estatal')
        expect(t.municipality).toBe('A Coruña')
        expect(t.region).toBe('Galicia')
        expect(t.reference_changed).toBe(false)
        expect(
          (await call(owner, 'read', { alert_id: alertId })).topics?.map(
            (t) => t.id,
          ),
        ).toEqual([linkedTopic])
      })
      it('withdraws guide conclusions and queues review when a source changes; rejects stale moderator publication', async () => {
        await write(owner, 'consent', { topic_id: linkedTopic, enabled: true })
        const p = {
          topic_id: linkedTopic,
          revision: 2,
          title: 'Aprendizaje normativo de prueba',
          body: 'Conclusión que solo se debe mostrar mientras esté revisada.',
          scope: 'Caso en A Coruña, Galicia. Alcance de prueba.',
          regulation_version: version,
        }
        await write(mod, 'publish', p)
        expect(
          (await call(owner, 'read')).resources?.find(
            (r) => r.topic_id === linkedTopic,
          )?.needs_review,
        ).toBe(false)
        await db.query(
          "update alertas set fecha_entrada_vigor='2026-02-01' where id=$1",
          [alertId],
        )
        const resource = (await call(owner, 'read')).resources?.find(
          (r) => r.topic_id === linkedTopic,
        )
        expect(resource?.needs_review).toBe(true)
        expect(resource?.body).toBe('')
        expect(
          (await call(mod, 'admin')).review.some((t) => t.id === linkedTopic),
        ).toBe(true)
        expect(
          (await call(owner, 'topic', { id: linkedTopic })).topic
            .reference_changed,
        ).toBe(true)
        await expect(write(mod, 'publish', p)).rejects.toThrow('CONFLICT')
        version = (await call(owner, 'regulation', { id: alertId })).version
        await write(mod, 'publish', { ...p, regulation_version: version })
        expect(
          (await call(owner, 'read')).resources?.find(
            (r) => r.topic_id === linkedTopic,
          )?.body,
        ).toBe(p.body)
        expect(
          (await call(mod, 'admin')).review.some((t) => t.id === linkedTopic),
        ).toBe(false)
      })
      it('detects a newly published related norm and withdrawn alerts without disclosing unpublished content', async () => {
        await db.query(
          "insert into alertas(id,url,titulo,fuente,estado) values($1,'https://www.boe.es/related-test','Nueva norma de prueba','BOE','pendiente_revision')",
          [relatedId],
        )
        await db.query(
          "insert into alerta_relaciones(alerta_id,alerta_relacionada_id,tipo_relacion,score_similitud) values($1,$2,'modifica',90)",
          [relatedId, alertId],
        )
        expect((await call(owner, 'regulation', { id: alertId })).version).toBe(
          version,
        )
        await db.query("update alertas set estado='enviada' where id=$1", [
          relatedId,
        ])
        expect(
          (await call(owner, 'read')).resources?.find(
            (r) => r.topic_id === linkedTopic,
          )?.needs_review,
        ).toBe(true)
        expect(
          (await call(owner, 'regulation', { id: alertId })).related[0].id,
        ).toBe(relatedId)
        await db.query("update alertas set estado='descartada' where id=$1", [
          alertId,
        ])
        const r = (await call(owner, 'read')).resources?.find(
          (r) => r.topic_id === linkedTopic,
        )
        expect(r?.regulation).toBeNull()
        expect(r?.body).toBe('')
        expect(r?.needs_review).toBe(true)
        await expect(
          write(mod, 'publish', {
            topic_id: linkedTopic,
            revision: 2,
            title: 'Guía que no se debe publicar',
            body: 'Texto de ejemplo demasiado desactualizado.',
            scope: 'A Coruña, caso de prueba.',
            regulation_version: version,
          }),
        ).rejects.toThrow('NOT_FOUND')
      })
    },
  )
})
