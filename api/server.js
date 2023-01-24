const cors = require('cors');
const mysql = require('mysql2');
const express = require('express');
const { apiPort, token, base, host } = require('../config/settings.json');
const database = require('../config/database.json');

const pool = mysql.createPool(database);
const app = express();
app.use(express.json());
app.use(cors({
	origin: '*',
}));

app.get(base, (req, res) => {
	const authorization = req.header('authorization');
	if (authorization === token) {
		res.status(200).json({ code: 200, endpoints: ['get/', 'add/', 'delete/', 'update/', 'test/'] });
	}
	else {
		res.status(401).json({ code: 401, message: 'Unauthorized' });
	}
});

app.get(base + '/get', (req, res) => {
	const rating = req.query.rating | 0;
	pool.query(`SELECT * FROM images WHERE rating=${rating} ORDER BY RAND() LIMIT 1`, function(err, rows) {
		if (rows.length >= 1 && !err) {
			rows[0].image = host + '/images/' + rows[0].filename;
			rows[0].code = 200;
			res.status(200).json(rows[0]);
		}
		else {
			res.status(404).json({ code: 404, message: 'Image not found' });
		}
	});
});

app.post(base + '/add', (req, res) => {
	const data = req.body;
	const authorization = req.header('authorization');
	if (authorization === token) {
		if (data.status !== 'undefined' && data.filename) {
			pool.query(`INSERT INTO images(filename, rating) VALUES ("${data.filename.replace(/'/g, '\'')}", ${data.status})`, function(err) {
				if (!err) {
					res.status(200).json({ code: 200, message: 'Image added!' });
				}
				else {
					res.status(200).json({ code: 500, message: 'Failed to add image!', err });
				}
			});
		}
		else {
			res.status(400).json({ code: 400, message: 'Missing argument' });
		}
	}
	else {
		res.status(401).json({ code: 401, message: 'Unauthorized' });
	}
});

app.post(base + '/delete', (req, res) => {
	const data = req.body;
	const authorization = req.header('authorization');
	if (authorization === token) {
		if (data.id) {
			pool.query(`DELETE FROM images WHERE id=${data.id}`, function(err) {
				if (!err) {
					res.status(200).json({ code: 200, message: 'Image deleted!' });
				}
				else {
					res.status(500).json({ code: 500, message: 'Failed to delete image!', err });
				}
			});
		}
		else {
			res.json({ code: 400, message: 'Missing argument' });
		}
	}
	else {
		res.json({ code: 401, message: 'Unauthorized' });
	}
});

app.post(base + '/update', (req, res) => {
	const data = req.body;
	const authorization = req.header('authorization');
	if (authorization === token) {
		if (data.id && data.filename) {
			let query = `UPDATE images SET filename="${data.filename.replace(/'/g, '\'')}" WHERE id=${data.id}`;
			if (data.status !== 'undefined') {
				query = `UPDATE images SET filename="${data.filename.replace(/'/g, '\'')}" AND rating=${data.status} WHERE id=${data.id}`;
			}
			pool.query(query, function(err) {
				if (err) {
					res.status(500).json({ code: 500, message: 'Failed to update AD!', err });
				}
				else { res.status(200).json({ code: 200, message: 'AD updated' }); }
			});
		}
		else {
			res.status(400).json({ code: 400, message: 'Missing argument' });
		}
	}
	else {
		res.status(401).json({ code: 401, message: 'Unauthorized' });
	}
});

// TEST endpoints
app.get(base + '/test', (req, res) => {
	res.status(200).json({ code: 200 });
});

app.post(base + '/test', (req, res) => {
	const data = req.body;
	res.status(200).json({ code: 200, data });
});

// run the API
app.listen(apiPort, () => {
	console.log(`running at port ${apiPort}`);
});
