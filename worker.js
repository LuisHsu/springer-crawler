const Path = require('path');
const https = require("https");
const fs = require("fs");

function makeRequest(link){
  return new Promise((resolve, reject) => {
    https.request(link, res => {
      if(res.statusCode >= 300 && res.statusCode < 400){
        if(res.headers.location){
          return makeRequest(res.headers.location).then(resolve);
        }else{
          reject({
            link,
            reason: `No location while redirect`
          })
        }
      }else if(res.statusCode >= 200 && res.statusCode < 300){
        let buffer = Buffer.alloc(0);
        res.on('data', data => {
          buffer = Buffer.concat([buffer, data]);
        })
        res.on('end', () => {
          resolve(buffer);
        })
      }else{
        reject({
          link,
          status: res.statusCode,
          reason: res.statusMessage
        })
      }
    }).on('error', reject).end();
  });
}

function download(link, path){
  return new Promise((resolve, reject) => {
    https.request(link, res => {
      if(res.statusCode >= 200 && res.statusCode < 300){
        console.log(`Downloading book ${process.argv[4]} "${process.argv[2]}"`)
        let fout = fs.createWriteStream(path, {emitClose: true});
        fout.on('close', resolve);
        res.pipe(fout);
      }else{
        reject({
          link,
          status: res.statusCode,
          reason: res.statusMessage
        })
      }
    }).on('error', reject).end();
  });
}

function getRealLink(link){
  return makeRequest(link).then(data => new Promise((resolve, reject) => {
    let link = data.toString().match(/href=["'][^"']*\.pdf["'][^>]*title="Download this book/g)
    if(link.length > 0){
      resolve(link[0].match(/href=["']([^"']*\.pdf)["']/)[1])
    }else{
      reject({
        link,
        reason: "No download link"
      })
    }
  }))
}

getRealLink(process.argv[3])
.then(link => download(`https://link.springer.com${link}`, Path.resolve(__dirname, "downloads", process.argv[2] + '.pdf')))
.then(() => {
  process.send({
    finished: true,
  });
})
.catch(err => {
  process.send({
    finished: false,
    reason: err
  })
})