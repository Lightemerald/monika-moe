const cron = require('node-cron');
const { fork } = require('child_process');
const { get } = require('./modules/fetcher');

// start servers
function startServerCDN() {

	const serverCDN = fork('./cdn/server.js');

	serverCDN.on('close', function(code) {
		console.log('child process exited with code ' + code);
		startServerCDN();
	});
}

function startServerAPI() {

	const serverAPI = fork('./api/server.js');

	serverAPI.on('close', function(code) {
		console.log('child process exited with code ' + code);
		startServerAPI();
	});
}

// watchdog
cron.schedule('* * * * *', async () => {
	try {
		const statusAPI = await get('http://localhost:2209/api/test');
		if (statusAPI.code === 200) {
			console.log('API Status: ', statusAPI.code);
		}
		else {
			startServerAPI();
			console.log('Restarted API!');
		}
	}
	catch (e) {
		console.log(e);
		startServerAPI();
		console.log('Restarted API!');
	}

	try {
		const statusCDN = await get('http://localhost:2210/test');
		if (statusCDN.code === 200) {
			console.log('CDN Status: ', statusCDN.code);
		}
		else {
			startServerCDN();
			console.log('Restarted CDN!');
		}
	}
	catch (e) {
		console.log(e);
		startServerCDN();
		console.log('Restarted CDN!');
	}
});


startServerCDN();
startServerAPI();