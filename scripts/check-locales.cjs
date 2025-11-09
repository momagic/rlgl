const fs = require('fs')
const path = require('path')

const localesDir = path.join(__dirname, '../src/i18n/locales')
const files = ['en.json', 'es.json', 'th.json', 'ja.json', 'ko.json', 'pt.json']

function flatten(obj, prefix = '') {
  return Object.keys(obj).reduce((acc, k) => {
    const pre = prefix.length ? prefix + '.' : ''
    if (typeof obj[k] === 'object' && obj[k] !== null) {
      Object.assign(acc, flatten(obj[k], pre + k))
    } else {
      acc[pre + k] = true
    }
    return acc
  }, {})
}

const localeKeys = {}

for (const file of files) {
  const content = JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf8'))
  localeKeys[file] = flatten(content)
}

const allKeys = Object.values(localeKeys).reduce((acc, keys) => {
  Object.keys(keys).forEach(k => acc.add(k))
  return acc
}, new Set())

for (const file of files) {
  const keys = localeKeys[file]
  const missing = [...allKeys].filter(k => !keys[k])
  if (missing.length) {
    console.log(`Missing in ${file}:`)
    missing.forEach(k => console.log('  ' + k))
  } else {
    console.log(`${file}: All keys present`)
  }
} 