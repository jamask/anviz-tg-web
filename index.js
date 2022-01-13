const http = require("http");
const fs = require('fs').promises;
const sql = require('mssql');

const sqlConfig = {
  user: 'sa',
  password: 'Aa123456',
  database: 'testanviz',
  server: 'localhost',
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: true, // for azure
    trustServerCertificate: true // change to true for local dev / self-signed certs
  }
}

const host = 'localhost';
const port = 8000;

let indexFile;
let usersHtml;

function createRes(res) {
  sql.connect(sqlConfig).then(pool => {
    // Query
    
    return pool.request()
        .query('select * from Users')
  }).then(result => {
    //console.dir(result)

    result.recordset.forEach(x => {
      const user = `<tr><td>${x.ID}</td><td>${x.FIO}</td><td>${x.IDANVIZ}</td><td>${x.IDTELEGRAM1}</td><td>${x.IDTELEGRAM2}</td>
      <td><input type="button" value="In" id="${x.ID}0" onclick="myFunction(${x.ID}, '${x.FIO}', '${x.IDANVIZ}', '${x.IDTELEGRAM1}', '${x.IDTELEGRAM2}', 0)">
      <input type="button" value="Out" id="${x.ID}1" onclick="myFunction(${x.ID}, '${x.FIO}', '${x.IDANVIZ}', '${x.IDTELEGRAM1}', '${x.IDTELEGRAM2}', 1)"></td></tr>`;
      usersHtml += user;
    })

    res.setHeader("Content-Type", "text/html");
    res.writeHead(200);
    res.end(indexFile.toString().replace('@data@', usersHtml));
    usersHtml = "";

  }).catch(err => {
    console.error(err.message)
  })
}


const requestListener = function (req, res) {

  if (req.url == '/inout') {

    let data = '';

    req.on('data', function (chunk) {
        data += chunk.toString();
    });

    req.on('end', async () => {
      console.log(data)
      const { id, fio, idanviz, tg1, tg2, code } = JSON.parse(data);

      console.log(id, fio, idanviz, tg1, tg2, code)
      sql.connect(sqlConfig).then(pool => {
        // Query
        
        return pool.request()
            .query(`insert into Records (ID, FIO, IDANVIZ, IDTELEGRAM1, IDTELEGRAM2, CODE) values (${id}, '${fio}', '${idanviz}', '${tg1}', '${tg2}', '${code}')`)
      }).then(result => {
        console.dir(result)
      }).catch(err => {
        console.error(err.message)
      })
    
    })
    res.writeHead(200);
    res.end('ok');
    return
  }

  if (req.method === "POST") {

    let data = '';

    req.on('data', function (chunk) {
        data += chunk.toString();
    });

    req.on('end', async () => {
      const [ id, fio, idanviz, tg1 ] = data.split('&').map(x => x.split('=')[1].replace('+', ' '));

      sql.connect(sqlConfig).then(pool => {
        // Query
        
        return pool.request()
            .query(`insert into Users (ID, FIO, IDANVIZ, IDTELEGRAM1, IDTELEGRAM2) values (${id}, '${fio}', '${idanviz}', '${tg1}', '1')`)
      }).then(result => {
        console.dir(result)
        createRes(res)
      }).catch(err => {
        console.error(err.message)
      })
    
    })
  } else {

    createRes(res)
  }
};

const server = http.createServer(requestListener);

fs.readFile(__dirname + "/index.html")
    .then(contents => {
        indexFile = contents;
        server.listen(port, host, (err) => {
          err ? console.error(err) : console.log(`Server is running on http://${host}:${port}`);
        });
    })
    .catch(err => {
        console.error(`Could not read index.html file: ${err}`);
        process.exit(1);
    });