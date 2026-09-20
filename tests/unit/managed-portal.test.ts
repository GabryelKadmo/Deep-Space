import { describe, expect, it } from 'vitest';
import { managedPortalCommandSchema, portalProfileSchema } from '../../src/lib/modules/agent-room/contracts/schemas/managed-portal.schema.js';
import { assertAllowedPortalUrl, confinePortalPath, portalProfileFromPayload } from '../../src/lib/modules/agent-room/application/services/ManagedPortalService.js';

describe('managed Portal contracts', () => {
  it('accepts typed semantic actions and rejects arbitrary references', () => {
    expect(managedPortalCommandSchema.parse({ nodeId: 'portal', action: 'click', args: { ref: 'e42' } }).args).toEqual({ ref: 'e42', button: 'left' });
    expect(() => managedPortalCommandSchema.parse({ nodeId: 'portal', action: 'click', args: { ref: '#password' } })).toThrow();
    expect(() => managedPortalCommandSchema.parse({ nodeId: 'portal', action: 'wait', args: {} })).toThrow();
  });

  it('normalizes bounded browser profiles without credentials', () => {
    expect(portalProfileSchema.parse({})).toEqual({
      profileId: 'default', profileScope: 'workspace', allowedHosts: [], downloadDirectory: '.deepspace/downloads',
      control: 'disabled', agentIds: [], paused: false, allowBackground: false,
    });
    expect(portalProfileFromPayload({ portalProfileId: 'team', portalAllowedHosts: ['APP.EXAMPLE.COM'] })).toMatchObject({
      profileId: 'team', allowedHosts: ['app.example.com'],
    });
  });

  it('enforces host allowlists and rejects URL credentials', () => {
    expect(assertAllowedPortalUrl('https://app.example.com/tasks', ['app.example.com']).hostname).toBe('app.example.com');
    expect(() => assertAllowedPortalUrl('https://evil.example.net', ['app.example.com'])).toThrow(/not allowed/);
    expect(() => assertAllowedPortalUrl('https://user:secret@app.example.com', ['app.example.com'])).toThrow(/credential-free/);
  });

  it('keeps an unrestricted Portal unrestricted after it loads a page', () => {
    // Lista vazia = sem restricao. O host atual entrava no mesmo conjunto que
    // decidia se havia restricao, entao o primeiro site aberto travava o Portal
    // nele e qualquer outro endereco virava uma aba em branco.
    expect(assertAllowedPortalUrl('https://youtube.com', [], 'http://localhost:5199/canvas').hostname).toBe('youtube.com');
    expect(assertAllowedPortalUrl('https://google.com', [], 'https://youtube.com/').hostname).toBe('google.com');
  });

  it('still lets a restricted Portal navigate within the host it is on', () => {
    expect(assertAllowedPortalUrl('https://cdn.example.com/a', ['app.example.com'], 'https://cdn.example.com/b').hostname).toBe('cdn.example.com');
    expect(() => assertAllowedPortalUrl('https://evil.example.net', ['app.example.com'], 'https://app.example.com/')).toThrow(/not allowed/);
  });

  it('confines upload and download paths to the workspace', () => {
    expect(confinePortalPath('/workspace', 'assets/file.png')).toBe('/workspace/assets/file.png');
    expect(() => confinePortalPath('/workspace', '../secret.txt')).toThrow(/inside the workspace/);
    expect(() => confinePortalPath('/workspace', '/tmp/secret.txt')).toThrow(/inside the workspace/);
  });
});
