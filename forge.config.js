module.exports = {
  packagerConfig: {
    asar: false,
    name: 'HEYgent',
    icon: './icon'
  },
  makers: [
    { name: '@electron-forge/maker-zip', platforms: ['darwin'] }
  ]
};
