import {describe,expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
const schema=readFileSync('supabase/migrations/202608170003_birthday_product.sql','utf8')+readFileSync('supabase/migrations/202608170004_security_hardening.sql','utf8')+readFileSync('supabase/migrations/20260817190000_owner_management_security.sql','utf8')
const submit=readFileSync('supabase/functions/submit-birthday-wish/index.ts','utf8')
const wishlist=readFileSync('supabase/functions/protected-wishlist/index.ts','utf8')
const webhook=readFileSync('supabase/functions/paystack-webhook/index.ts','utf8')
const events=readFileSync('supabase/functions/record-page-event/index.ts','utf8')
const admin=readFileSync('supabase/functions/admin-payments/index.ts','utf8')
describe('critical security contracts',()=>{
  it('does not grant anonymous reads on protected base tables',()=>expect(schema).toContain('revoke all on public.bank_accounts'))
  it('stores a hash rather than the raw visitor token',()=>{expect(submit).toMatch(/token_hash:\s*await sha256\(token\)/);expect(submit).not.toContain('access_token:token_hash')})
  it('scopes wishlist access to a page and expiry',()=>{expect(wishlist).toMatch(/\.eq\("page_id",\s*pageId\)/);expect(wishlist).toMatch(/\.gt\("expires_at"/)})
  it('does not return wishlist data when a page is unpublished',()=>expect(wishlist).toMatch(/\.eq\("status",\s*"published"\)/))
  it('keeps Paystack activation idempotent',()=>{expect(webhook).toMatch(/payment\.status\s*===\s*"successful"/);expect(webhook).toMatch(/\.eq\("status",\s*"pending"\)/)})
  it('keeps sensitive media buckets private',()=>expect(schema).toContain("set public=false where id in('birthday-media','wishlist-media')"))
  it('prevents cross-owner media and bank references',()=>{expect(schema).toContain('validate_birthday_asset_ownership');expect(schema).toContain('Bank account does not belong to the Birthday Page owner')})
  it('requires wishlist access before recording protected gift intent',()=>{expect(events).toContain('eventName !== "share"');expect(events).toMatch(/\.eq\("token_hash", await sha256\(token\)\)/)})
  it('protects the admin queue with a server-side role check',()=>{expect(admin).toMatch(/\.eq\("role", "admin"\)/);expect(admin).toContain('Administrator access required')})
})
