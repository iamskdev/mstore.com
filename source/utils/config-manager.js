let appConfiguration = {};

export const setAppConfig = (config) => {
  appConfiguration = config;
};

export const getAppConfig = () => {
  return appConfiguration;
};