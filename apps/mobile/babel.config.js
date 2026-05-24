module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    // O plugin do Reanimated precisa ser o ÚLTIMO da lista.
    plugins: ['react-native-reanimated/plugin'],
  }
}
