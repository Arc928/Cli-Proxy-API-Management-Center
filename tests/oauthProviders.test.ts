import { describe, expect, test } from 'bun:test';
import {
  AUTH_FILE_ICONS,
  AUTH_FILE_MANUAL_REFRESH_PROVIDERS,
  OAUTH_PROVIDER_PRESETS,
  buildOAuthProviderOptions,
  supportsAuthFileManualRefresh,
} from '../src/features/authFiles/constants';
import type { BuiltInOAuthProvider } from '../src/services/api/oauth';
import en from '../src/i18n/locales/en.json';
import ru from '../src/i18n/locales/ru.json';
import zhCN from '../src/i18n/locales/zh-CN.json';
import zhTW from '../src/i18n/locales/zh-TW.json';

describe('CodeBuddy OAuth provider wiring', () => {
  test('includes codebuddy in excluded-models / model-alias channel presets', () => {
    expect(OAUTH_PROVIDER_PRESETS).toContain('codebuddy');
    expect(buildOAuthProviderOptions([])).toEqual([...OAUTH_PROVIDER_PRESETS]);
  });

  test('treats codebuddy auth files as a first-class type', () => {
    const provider: BuiltInOAuthProvider = 'codebuddy';
    expect(provider).toBe('codebuddy');
    expect(AUTH_FILE_ICONS.codebuddy).toBeDefined();
    expect(supportsAuthFileManualRefresh('codebuddy')).toBe(true);
    expect(AUTH_FILE_MANUAL_REFRESH_PROVIDERS.has('codebuddy')).toBe(true);
  });

  test('ships CodeBuddy login copy in all locales', () => {
    for (const locale of [en, zhCN, zhTW, ru]) {
      expect(locale.auth_files.filter_codebuddy).toBe('CodeBuddy');
      expect(locale.auth_login.codebuddy_oauth_title).toBe('CodeBuddy OAuth');
      expect(locale.auth_login.codebuddy_oauth_button.length).toBeGreaterThan(0);
      expect(locale.auth_login.codebuddy_oauth_hint.length).toBeGreaterThan(0);
    }
  });
});
