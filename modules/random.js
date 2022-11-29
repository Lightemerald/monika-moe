const crypto = require('crypto');


function random(x, y) {
    return crypto.randomInt(x,y);
}

function randomHEX(x) {
    return crypto.randomBytes(x).toString('hex');
}

module.exports = {
    random,
    randomHEX,
};