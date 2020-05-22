const express = require('express')
const path = require('path')
const ngnixRoute = require('./server/routes/nginxRoute')
var shell = require('shelljs')
// This is important to get the body in the request of POST, PUT operation
var bodyParser = require("body-parser");


    shell.exec("whoami")
    shell.exec("pwd")
    shell.exec("id")
    //shell.exec("touch /etc/nginx/sites-available/conf/aa.conf")
    var app = express();
    app.use(bodyParser.urlencoded({
        extended: false
      }));
      app.use(bodyParser.json({
        limit: "10mb"
      }));
    app.use('/nginx', ngnixRoute)
    const server = app.listen(3000)
    console.log(`Server running at http://localhost:3000, PID: ${process.pid}`)
    //console.log(server.address())

    module.exports = app

    
    
