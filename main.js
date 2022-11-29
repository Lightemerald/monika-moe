const shell = require('shelljs');
const cron = require('node-cron');
const { get } = require('./modules/fetcher')


// start servers
shell.exec('forever stopall');
shell.exec('cd api && forever start server.js');
shell.exec('cd cdn && forever start server.js');

// watchdog
cron.schedule('* * * * *', async () => {

    try {
        const apiStatus = await get('http://localhost:2209/api/test');
        if (apiStatus.code === 200) {
            console.log('API Status: ', apiStatus.code);
        }
        else {
            shell.exec('cd api && forever restart server.js');
            console.log('Restarted API!');
        }
    }
    catch (e) {
        console.log(e);
        shell.exec('cd api && forever restart server.js');
        console.log('Restarted API!');
    }

    try {
        const cdnStatus = await get('http://localhost:2210/test');
        if (cdnStatus.code === 200) {
            console.log('CDN Status: ', cdnStatus.code);
        }
        else {
            shell.exec('cd cdn && forever restart server.js');
            console.log('Restarted CDN!');
        }
    }
    catch (e) {
        console.log(e);
        shell.exec('cd cdn && forever restart server.js');
        console.log('Restarted CDN!');
    }

});