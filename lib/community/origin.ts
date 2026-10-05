// Use a configured public origin behind reverse proxies. Never trust a client
// supplied forwarded host to decide whether a mutation is same-origin.
export function communityOrigin(request: Request) {
  const configured = process.env.COMMUNITY_SITE_URL
  return configured ? new URL(configured).origin : new URL(request.url).origin
}
export function isCommunityOrigin(request: Request) {
  return request.headers.get('origin') === communityOrigin(request)
}
