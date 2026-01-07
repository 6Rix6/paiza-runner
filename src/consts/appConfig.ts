export const APP_CONFIG = {
  appName: "paiza-runner",
  appDisplayName: "Paiza Runner",
} as const;

export const COMMANDS = {
  run: `${APP_CONFIG.appName}.run`,
  runMultiple: `${APP_CONFIG.appName}.runMultiple`,
  runAtCoderProblem: `${APP_CONFIG.appName}.runAtCoderProblem`,
} as const;

export const SETTINGS = {
  atCoderLanguage: "atCoderLanguage",
};
