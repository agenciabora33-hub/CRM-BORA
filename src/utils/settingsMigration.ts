import { AgencySettings } from '../types/crm';

export const CURRENT_BRAND_VERSION = 3;

export interface PersistedAgencySettings extends AgencySettings {
  logoRemoved?: boolean;
  brandVersion?: number;
  partnerConfirmed?: boolean;
}

export interface InitialSettingsResult {
  settings: AgencySettings;
  partnerConfirmed: boolean;
}

export function resolveInitialSettings(
  rawJson: string | null,
  defaults: AgencySettings
): InitialSettingsResult {
  if (!rawJson) {
    return {
      settings: defaults,
      partnerConfirmed: false,
    };
  }

  try {
    const parsed = JSON.parse(rawJson) as Partial<PersistedAgencySettings>;
    const version = Number(parsed.brandVersion) || 0;
    const isLegacyBrand = version < 2;
    const isLegacyTeam = version < CURRENT_BRAND_VERSION;

    const rawMembers =
      Array.isArray(parsed.teamMembers) && parsed.teamMembers.length === 2
        ? [
            String(parsed.teamMembers[0] || defaults.teamMembers[0]).trim() || defaults.teamMembers[0],
            String(parsed.teamMembers[1] || defaults.teamMembers[1]).trim() || defaults.teamMembers[1],
          ]
        : [...defaults.teamMembers];

    const shouldMigrateDefaultTeam =
      isLegacyTeam && rawMembers[0] === 'Sócio 1' && rawMembers[1] === 'Sócio 2';

    const members: [string, string] = shouldMigrateDefaultTeam
      ? [...defaults.teamMembers] as [string, string]
      : [rawMembers[0], rawMembers[1]];

    const rawName = (parsed.companyName || '').trim();
    const companyName =
      !rawName || (isLegacyBrand && rawName === 'Sua Agência')
        ? defaults.companyName
        : rawName;

    const logoUrl =
      parsed.logoUrl && parsed.logoUrl.trim()
        ? parsed.logoUrl.trim()
        : parsed.logoRemoved
          ? ''
          : defaults.logoUrl;

    const appsScriptUrl =
      parsed.appsScriptUrl && parsed.appsScriptUrl.trim()
        ? parsed.appsScriptUrl.trim()
        : defaults.appsScriptUrl;

    const activeUser =
      parsed.activeUser && members.includes(parsed.activeUser)
        ? parsed.activeUser
        : members[0];

    const partnerConfirmed = Boolean(parsed.partnerConfirmed) && !shouldMigrateDefaultTeam;

    return {
      settings: {
        companyName,
        logoUrl,
        teamMembers: members,
        activeUser,
        appsScriptUrl,
        lastSyncedAt: parsed.lastSyncedAt || null,
      },
      partnerConfirmed,
    };
  } catch {
    return {
      settings: defaults,
      partnerConfirmed: false,
    };
  }
}
