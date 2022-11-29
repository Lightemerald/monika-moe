const fs = require("fs");
const download = require('download');


function fileExist(path) {
    try {
        fs.readFileSync(path);
        return true;
    }
    catch (err) {
        return false;
    }
}

function fileDelete(path) {
    try {
        fs.unlinkSync(path);
        return true;
    }
    catch (err) {
        return false;
    }
}

function fileDownload(url, name) {
    try {
        download(url, '../cdn/images/', { filename: name });
        return true;
    }
    catch (err) {
        return false;
    }
}

module.exports = {
    fileExist,
    fileDelete,
    fileDownload,
};