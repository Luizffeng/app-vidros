import { describe, expect, it } from 'vitest'
import { passwordLinkType } from './passwordLink'

describe('passwordLinkType', () => {
  it('reads invite and recovery from the hash', () => {
    expect(passwordLinkType('https://appvidros.pages.dev/#access_token=a&type=invite')).toBe('invite')
    expect(passwordLinkType('https://appvidros.pages.dev/#access_token=a&type=recovery')).toBe('recovery')
  })

  it('lets the query string win over the hash', () => {
    expect(passwordLinkType('https://appvidros.pages.dev/?type=invite#type=recovery')).toBe('invite')
  })

  it('ignores other links', () => {
    expect(passwordLinkType('https://appvidros.pages.dev/')).toBeNull()
    expect(passwordLinkType('https://appvidros.pages.dev/#type=signup')).toBeNull()
    expect(passwordLinkType('not a url')).toBeNull()
  })
})
