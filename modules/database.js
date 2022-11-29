const mysql = require('mysql2');
const mysqlPromise = require('mysql2/promise');
const database = require('../config/database.json');


const pool = mysql.createPool(database);


async function querySQL(query) {
    const connection = await mysqlPromise.createConnection({ database });
    const [rows] = await connection.execute(`${query}`);
    connection.end();
    return rows;
}

module.exports = {
    querySQL,
};