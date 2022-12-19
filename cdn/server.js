const cors = require('cors')
const express = require('express')
const { fileExist, fileDelete, fileDownload } = require('../modules/fileManager.js')
const { cdnPort, location, token } = require('../config/settings.json')

const app = express()
app.use(express.json())
app.use(cors({
  origin: '*'
}))

// Images endpoints
app.get('/images/*', (req, res) => {
  const data = req.path
  const image = data.replace('/images/', '')
  if (image !== '' && (image.split('.').pop() === 'jpg' || image.split('.').pop() === 'png' || image.split('.').pop() === 'gif' || image.split('.').pop() === 'mp4')) {
    const path = __dirname + `${location}${image}`
    if (fileExist(path)) {
      res.status(200).sendFile(path, { root: __dirname })
    } else {
      res.status(404).json({ code: 404, message: 'Not found' })
    }
  } else {
    res.status(400).json({ code: 400, message: 'Invalid arguments' })
  }
})

app.post('/images', (req, res) => {
  const authorization = req.header('authorization')
  if (authorization === token) {
    const data = req.body
    if (data.url) {
      const filename = data.filename || data.url.split('/').pop()
      if (fileDownload(data.url, filename)) {
        res.status(200).json({ code: 200, message: 'File downloaded' })
      } else {
        res.status(500).json({ code: 500, message: 'An issue has occurred' })
      }
    } else {
      res.status(400).json({ code: 400, message: 'Missing argument' })
    }
  } else {
    res.status(401).json({ code: 401, message: 'Unauthorized' })
  }
})

app.delete('/images/*', (req, res) => {
  const authorization = req.header('authorization')
  if (authorization === token) {
    const image = req.path.replace('/images/', '')
    if (image !== '' && (image.split('.').pop() === 'jpg' || image.split('.').pop() === 'png' || image.split('.').pop() === 'gif' || image.split('.').pop() === 'mp4')) {
      const path = __dirname + `${location}${image}`
      if (fileDelete(path)) {
        res.status(200).json({ code: 200, message: 'File deleted' })
      } else {
        res.status(500).json({ code: 500, message: 'An issue has occurred' })
      }
    } else {
      res.status(400).json({ code: 400, message: 'Invalid or missing argument' })
    }
  } else {
    res.status(401).json({ code: 401, message: 'Unauthorized' })
  }
})

// TEST endpoints
app.get('/test', (req, res) => {
  res.status(200).json({ code: 200 })
})

app.post('/test', (req, res) => {
  const data = req.body
  res.status(200).json({ code: 200, data })
})

// run the API
app.listen(cdnPort, () => {
  console.log(`running at port ${cdnPort}`)
})
