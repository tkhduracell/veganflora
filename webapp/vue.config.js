module.exports = {
  chainWebpack: config => {
    config
      .plugin('html')
      .tap(args => {
        args[0].title = 'Veganflora - ' + process.env.NODE_ENV
        return args
      })
  }
}
