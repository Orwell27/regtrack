import { cache } from 'react'
import type { User } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { CommunityError, type Snapshot } from './model'
import { communityConfig, communityIdentity, communityExecute } from './server'
export const communityContext = cache(async () => {
  let user: User | null = null
  if (!communityConfig().enabled)
    return {
      user,
      snapshot: {
        status: 'visitor',
        moderator: false,
        member: null,
      } as Snapshot,
      error: '',
    }
  try {
    user = await communityIdentity()
    return {
      user,
      snapshot: await communityExecute<Snapshot>(user?.id ?? null, 'read'),
      error: '',
    }
  } catch (e) {
    return {
      user,
      snapshot: {
        status: 'visitor',
        moderator: false,
        member: null,
      } as Snapshot,
      error:
        e instanceof CommunityError
          ? e.message
          : 'No podemos cargar la comunidad. Inténtalo de nuevo.',
    }
  }
})
export async function requireCommunity(moderator = false) {
  const context = await communityContext()
  if (context.error) throw new Error(context.error)
  if (!context.user) redirect('/login?next=/comunidad')
  if (
    context.snapshot.status !== 'approved' ||
    (moderator && !context.snapshot.moderator)
  )
    redirect('/comunidad')
  return { actor: context.user.id, ...context.snapshot }
}
