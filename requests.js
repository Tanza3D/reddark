// https://github.com/Osekai/osekai-imagepier/blob/main/request.js
const https = require('https');
module.exports = {
    httpsGet: function (url) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'www.reddit.com',
                path: url,
                method: 'GET',
                timeout: 10000,
                headers: {
                    "User-Agent": "Reddark (https://github.com/Tanza3D/Reddark)",
                    'Range': "bytes=0-50"
                }
            };


            const request = https.get(options, (res) => {
                if (res.statusCode < 200 || res.statusCode > 299) {
                    //return reject(new Error(`HTTP status code ${res.statusCode}`))
                }

                const body = []
                res.on('data', (chunk) => body.push(chunk))
                res.on('end', () => {
                    const resString = Buffer.concat(body).toString()
                    resolve(resString)
                })
            })

            request.on('error', (err) => {
                reject(err)
            })
            request.on('timeout', () => {
                request.destroy()
                reject(new Error('timed out'))
            })
        })
    }
}
