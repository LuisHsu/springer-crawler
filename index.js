const Path = require('path');
const fsp = require("fs").promises;
const child_process = require('child_process');

// Get parallel count
let max_process = 4;
if(process.argv.length > 2){
  max_process = parseInt(process.argv[2]);
}

let active_process = [];

fsp.readFile("list.csv")
  .then(data => data.toString().split('\n').map(entry => ({name: entry.split(',https://')[0], link: entry.match(/(https\:\/\/.*)/g)[0]})))
  .then(entries => new Promise(resolve => {
    let count = 0;
    function launch(entry){
      let index = active_process.length;
      let worker = child_process.fork(Path.resolve(__dirname, "worker.js"), [entry.name, entry.link, count++])
      worker.on('message', result => {
        if(result.finished){
          console.log(`Book ${index} finished`)
        }else{
          console.error(`Error ${index}: ${JSON.stringify(result.reason)}`)
        }
        active_process.splice(index, 1);
        if(entries.length > 0){
          launch(entries.pop());
        }else{
          resolve();
        }
      })
      active_process.push(worker);
    }
    for(let i = 0; entries.length > 0 && i < max_process; ++i){
      launch(entries.pop());
    }
  }))
  .then(() => {
    console.log("Finished");
  })