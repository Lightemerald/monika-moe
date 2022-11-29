const fetch = require('node-fetch');


async function get(url, token) {

    const options = {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'authorization': `${token}` },
    };

    return await fetch(url, options)
        .then(res => res.json())
        .then(json => {
            return json;
        })
        .catch(error => console.log(error));
}

async function post(url, body, token) {

    const options = {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json', 'authorization': `${token}` },
        body: JSON.stringify(body),
    };

    return await fetch(url, options)
        .then(res => res.json())
        .then(json => {
            return json;
        })
        .catch(error => console.log(error));
}

module.exports = {
    get,
    post,
};