export const APP_CONFIG = {
  appName: "atcoder-utils",
  appDisplayName: "AtCoder Utils",
} as const;

export const COMMANDS = {
  run: `${APP_CONFIG.appName}.run`,
  runMultiple: `${APP_CONFIG.appName}.runMultiple`,
  runAtCoderProblem: `${APP_CONFIG.appName}.runAtCoderProblem`,
  runAtCoderContest: `${APP_CONFIG.appName}.runAtCoderContest`,
} as const;

export const SETTINGS = {
  atCoderLanguage: "atCoderLanguage",
};
