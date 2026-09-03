/**
 * CodeBuddy 额度数据层。React-free / SCSS-free。
 *
 * 走腾讯 copilot 计费 meter 接口（仅国内站；国际 .ai 站无此接口），
 * 按 auth 文件里记录的 api_base_url 选择主机。
 */

import type { TFunction } from 'i18next';
import type { AuthFileItem, CodeBuddyQuotaRow, CodeBuddyQuotaState } from '@/types';
import { apiCallApi, getApiCallErrorMessage } from '@/services/api';
import {
  CODEBUDDY_BILLING_METER_URL,
  CODEBUDDY_REQUEST_HEADERS,
  buildCodeBuddyQuotaRows,
  createStatusError,
  isCodeBuddyFile,
  isDisabledAuthFile,
  parseCodeBuddyAccounts,
} from '@/utils/quota';
import { normalizeAuthIndex } from '@/utils/authIndex';
import type { QuotaProviderData } from '../types';

const resolveMeterURL = (file: AuthFileItem): string => {
  const base = String(file['api_base_url'] ?? '').trim();
  if (!base) return CODEBUDDY_BILLING_METER_URL;
  try {
    const url = new URL(CODEBUDDY_BILLING_METER_URL);
    const resolved = new URL(url.pathname, base.trim().replace(/\/+$/, ''));
    return resolved.toString();
  } catch {
    return CODEBUDDY_BILLING_METER_URL;
  }
};

const fetchCodeBuddyQuota = async (
  file: AuthFileItem,
  t: TFunction
): Promise<CodeBuddyQuotaRow[]> => {
  const rawAuthIndex = file['auth_index'] ?? file.authIndex;
  const authIndex = normalizeAuthIndex(rawAuthIndex);
  if (!authIndex) {
    throw new Error(t('codebuddy_quota.missing_auth_index'));
  }

  const rangeBegin = new Date(Date.now() - 24 * 3_600_000)
    .toISOString()
    .replace('T', ' ')
    .slice(0, 19);
  const rangeEnd = new Date(Date.now() + 365 * 24 * 3_600_000)
    .toISOString()
    .replace('T', ' ')
    .slice(0, 19);

  const result = await apiCallApi.request({
    authIndex,
    method: 'POST',
    url: resolveMeterURL(file),
    header: { ...CODEBUDDY_REQUEST_HEADERS },
    data: JSON.stringify({
      PageNumber: 1,
      PageSize: 100,
      ProductCode: 'p_tcaca',
      Status: [0, 3],
      PackageEndTimeRangeBegin: rangeBegin,
      PackageEndTimeRangeEnd: rangeEnd,
    }),
  });

  if (result.statusCode < 200 || result.statusCode >= 300) {
    throw createStatusError(getApiCallErrorMessage(result), result.statusCode);
  }

  const accounts = parseCodeBuddyAccounts(result.body ?? result.bodyText);
  if (accounts.length === 0) {
    throw new Error(t('codebuddy_quota.empty_data'));
  }

  return buildCodeBuddyQuotaRows(accounts);
};

export const CODEBUDDY_CONFIG: QuotaProviderData<CodeBuddyQuotaState, CodeBuddyQuotaRow[]> = {
  type: 'codebuddy',
  i18nPrefix: 'codebuddy_quota',
  filterFn: (file) => isCodeBuddyFile(file) && !isDisabledAuthFile(file),
  fetchQuota: fetchCodeBuddyQuota,
  storeSelector: (state) => state.codebuddyQuota,
  storeSetter: 'setCodebuddyQuota',
  buildLoadingState: () => ({ status: 'loading', rows: [] }),
  buildSuccessState: (rows) => ({ status: 'success', rows }),
  buildErrorState: (message, status) => ({
    status: 'error',
    rows: [],
    error: message,
    errorStatus: status,
  }),
};
