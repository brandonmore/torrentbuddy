const express = require('express');
const bodyParser = require('body-parser')
const path = require('path');
const app = express();
const fs = require('fs');
const WebTorrent = require('webtorrent')
const client = new WebTorrent()
const ws = require('ws')

const wsServer = new ws.Server({ noServer: true });
wsServer.isAlive = false
let wsSocket = null

const test_torrents = [
  "Bill & Ted's Bogus Journey (1991) [1080p] [BluRay] [5.1] [YTS.MX]",
  "madmax",
  "Mad Max (1979) [720p] [BluRay] [YTS.MX]"
]

process.on('uncaughtException', function (err) {
  console.error(err);
  console.log("Whoops...");
});


const downloadTorrent = () =>{
  client.add(`../torrent_test/${test_torrents[1]}.torrent`, {path: '../temp', maxWebConns: 10}, (torrent)=>{
    console.log(torrent)
    let failed = 0;
    const int = setInterval(()=>{
      console.log(torrent.timeRemaining/1000/60)
      if(torrent.timeRemaining == Infinity)
        failed++;
      if(failed > 5){
        clearInterval(int)
        client.remove(torrent)
        console.log('failed: no seeds')
        return;
      }
    },10000)
    torrent.on('error', function (err) {
      console.log('torrent error')
      console.log(err)
    })
    client.on('error', (err)=>{
      console.log('client error')
      console.log(err)
    })
    torrent.on('done', ()=>{
      console.log('torrent finished')
      clearInterval(int)
      console.log(`../temp/${torrent.files[0].path}`)
      // fs.copyFile(`../temp/${torrent.files[0].path}`, `/mnt/f/dvds/${title}.mp4`,(err)=>{
      //   console.log('copied')
      //   if(err)
      //     console.log(err)
      // })
      
    //   //res.send('{"done": "true"}')
    })
  })
}

wsServer.on('connection', socket => {
  socket.send('{"whoo":"true"}')
  wsSocket = socket
});

const timeFormatted = (time) => {
  
}

const findMp4File = (fileNames) =>{
  const mp4Files = fileNames.filter((file)=> {
    return /.mp4/.test(file.path)
  })
  return mp4Files.length ? mp4Files[0] : null
}

app.use(express.static(path.join(__dirname, '../build')));

app.get('/ping', function (req, res) {
 return res.send('{"pong":"ping"}');
});

app.get('/download', (req,res)=>{
  console.log(req.query.url);
  const title = req.query.title
  const url = req.query.url.trim()
  console.log(url)
  
  client.on('error', (err)=>{
    console.log('client error')
    console.log(err)
  })
  client.add(url, {path: '../temp', maxWebConns: 30}, (torrent)=>{
    let failed = 0;
    const int = setInterval(()=>{
      const time = torrent.timeRemaining/1000/60
      console.log(title + ': ' + time)
      if(wsSocket)
        wsSocket.send(`{"hash":"${torrent.infoHash}","time":"${time}", "status":"downloading"}`)
      if(torrent.timeRemaining == Infinity)
        failed++;
      if(failed > 10){
        clearInterval(int)
        client.remove(torrent)
        wsSocket.send(`{"hash":"${torrent.infoHash}","time":"Infinity", "status":"failed"}`)
        console.log('failed: no seeds')
        return;
      }
    },10000)
    torrent.on('error', function (err) {
      console.log('torrent error')
      console.log(err)
    })
    client.on('error', (err)=>{
      console.log('client error')
      console.log(err)
    })
    torrent.on('done', ()=>{
      console.log('torrent finished')
      clearInterval(int)
      console.log(`../temp/${torrent.files[0].path}`)
      const mp4File = findMp4File(torrent.files)
      if(!mp4File){
        console.log('no mp4 file!')
        return
      }
      fs.copyFile(`../temp/${mp4File.path}`, `/mnt/f/dvds/${title}.mp4`,(err)=>{
        if(err){
          console.log(err)
        }else{
          console.log('moved')
          if(wsSocket)
            wsSocket.send(`{"hash":"${torrent.infoHash}","time":"0", "status": "done"}`)

        }
      })
      
    //   //res.send('{"done": "true"}')
    })
  })
    
 
  return res.send('{"success": "true"}')
  
  
})

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

const server = app.listen(process.env.PORT || 3080);
server.on('upgrade', (request, socket, head) => {
  wsServer.handleUpgrade(request, socket, head, socket => {
    wsServer.emit('connection', socket, request);
  });
});