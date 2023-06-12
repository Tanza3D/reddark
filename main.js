const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const request = require("./requests.js");
const config = require("./config.js");
let {exec} = require('child_process');

const io = new Server(server, {
    cors: {
        origin: config.url,
        methods: ["GET", "POST"],
        transports: ['websocket'],
        credentials: true
    },
    allowEIO3: true
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});
app.use(express.static('public'))

function isJson(item) {
    let value = typeof item !== "string" ? JSON.stringify(item) : item;
    try {
        value = JSON.parse(value);
    } catch (e) {
        return false;
    }

    return typeof value === "object" && value !== null;
}

const subreddits_src = {

}
let subreddits = {};
async function appendList(url) {
    let section = [];
    let sectionName = "";
    let data = await request.httpsGet(url);
    data = JSON.parse(data);
    let text = data['data']['content_md'];
    let lines = text.split("\n");
    for (let line of lines) {
        if (line.startsWith("##") && !line.includes("Please") && line.includes(":")) {
            if (section !== []) subreddits_src[sectionName] = section;
            section = [];
            sectionName = line.replace("##", "");
        }
        if (line.startsWith("r/")) {
            section.push(line);
        }
    }
    subreddits_src[sectionName] = section;
}
async function createList() {
    // getting the list of participating subs from the modcoord wiki page
    await appendList("/r/ModCoord/wiki/index.json");
    console.log("grabbed subreddits");
    //subreddits_src["30+ million:"].push("r/tanzatest")

    for (let section in subreddits_src) {
        console.log(section);
        subreddits[section] = [];
        for (let subreddit in subreddits_src[section]) {
            if(config.blockedSubreddits.includes(subreddit)) {
                console.log("ignoring " + subreddit);
                continue;
            }
            subreddits[section].push({
                "name": subreddits_src[section][subreddit].replace("\n", "").replace("\r", ""),
                "status": "public"
            });
        }
    }
    console.log(subreddits);
}



firstCheck = false;
let countTimeout = null;
io.on('connection', (socket) => {
    if (firstCheck === false) {
        //console.log("sending loading");
        socket.emit("loading");
    } else {
        //console.log("sending reddits");
        socket.emit("subreddits", subreddits);
    }
    clearTimeout(countTimeout);
    countTimeout = setTimeout(() => {
        console.log('currently connected users: ' + io.engine.clientsCount);
    }, 500);
});
if (config.prod === true) {
    exec("rm /var/tmp/reddark.sock")
    server.listen("/var/tmp/reddark.sock", () => {
        console.log('listening on /var/tmp/reddark.sock');
        exec("chmod 777 /var/tmp/reddark.sock")
    });
} else {
    server.listen(config.port, () => {
        console.log('listening on *:' + config.port);
    });
}
let checkCounter = 0;

async function updateStatus() {
    //return;
    const cooldownBetweenRequests = 100; // time between subreddit requests in milliseconds
    let todo = 0;
    let done = 0;
    let delay = 0;  // Incremented on the fly. Do not change.
    const stackTrace = new Error().stack
    checkCounter++;
    let doReturn = false;
    console.log("(THIS IS NOT AN ERROR) Starting check " + checkCounter + " with stackTrace: " + stackTrace);
    for (let section in subreddits) {
        for (let subreddit in subreddits[section]) {

            if (doReturn) return;
            todo++;
            function stop() {
                setTimeout(() => {
                    updateStatus();
                }, 10000);
                doReturn = true;
            }
            setTimeout(() => {
                let url = "/" + subreddits[section][subreddit].name + "/about.json";
                request.httpsGet(url).then(function (data) {
                    try {
                        if (doReturn) return;
                        done++;
                        // console.log("checked " + subreddits[section][subreddit].name)
                        if (data.startsWith("<")) {
                            console.log("We're probably getting blocked..." + config.logDataOnFail ? " - " + data : "");
                            return;
                        }
                        if (!isJson(data)) {
                            console.log("Response is not JSON? We're probably getting blocked..." + config.logDataOnFail ? " - " + data : "");
                            return;
                        }

                        const resp = JSON.parse(data);

                        let isPrivate = resp["error"] === 403       // this case occurs when subreddit is private
                        let isRestricted = resp["data"] !== undefined &&
                            resp["data"]["subreddit_type"] === "restricted"  // when subreddit is restricted
                        let effectivelyPrivate = isPrivate || isRestricted; // if either is true, it's participating

                        let subredditPreviouslyPrivate = subreddits[section][subreddit].status === "private";

                        if (resp['error'] === 500) {
                            console.log("We're probably getting blocked... (500) - " + resp);
                            return;
                        }

                        // If previously public subreddit has become private
                        if (effectivelyPrivate && !subredditPreviouslyPrivate) {
                            subreddits[section][subreddit].status = "private";
                            if (!firstCheck)
                                io.emit("update", subreddits[section][subreddit]);
                            else {
                               //webhookClient.send({
                               //    content: subreddits[section][subreddit].name + " has gone private! (" + section + ")",
                               //    username: 'Reddark Update'
                               //});
                                io.emit("updatenew", subreddits[section][subreddit]);
                            console.log(`PRIVATE: ${subreddits[section][subreddit].name}`)
                            // console.log(resp);
                            }

                        // if subreddit status was private and is now public
                        } else if (!effectivelyPrivate && subredditPreviouslyPrivate) {
                            console.log(`PUBLIC: ${subreddits[section][subreddit].name}`)
                            subreddits[section][subreddit].status = "public";
                           //webhookClient.send({
                           //    content: subreddits[section][subreddit].name + " has gone public. (" + section + ")",
                           //    username: 'Reddark Update'
                           //});
                            io.emit("updatenew", subreddits[section][subreddit]);
                        }

                        // uh i'm not sure lol
                        if (done > (todo - 2) && !firstCheck) {
                            io.emit("subreddits", subreddits);
                        }

                        // if all subreddits have been checked, start check over
                        if (done === todo) {
                            setTimeout(() => {
                                updateStatus();
                            }, 10000);
                            io.emit("subreddits", subreddits);
                            console.log("FINISHED CHECK (or close enough to) - num " + checkCounter);
                        }
                    } catch {
                        console.log("Something broke! We're probably getting blocked...");
                        stop();
                    }
                }).catch(function (err) {
                    console.log("Request failed! We're probably getting blocked... - " + err);
                    console.log(`${url}   |   FAILED`)
                    stop();
                });
            }, delay);
            delay += cooldownBetweenRequests;
        }
    }
}
(async () => {
    await createList();
    await updateStatus();
})();