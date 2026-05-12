import { createAdminCharacterVoiceSettingsCliSummaryReport } from "./dev-admin-character-voice-settings.js";

const report = createAdminCharacterVoiceSettingsCliSummaryReport();
console.log(JSON.stringify(report, null, 2));
