const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',          // Your MySQL username
    password: 'Sharvan0433@',          // Your MySQL password
    database: 'college_erp'
});

module.exports = pool.promise();
