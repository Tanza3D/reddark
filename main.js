const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
var request = require("./requests.js");
var config = require("./config.js")
var { exec } = require('child_process');

const io = new Server(server, {
    cors: {
        origin: "https://reddark.untone.uk/",
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
const subreddits = {};
async function appendList(url) {
    var section = [];
    var sectionname = "";
    var data = await request.httpsGet(url);
    data = JSON.parse(data);
    text = data['data']['content_md'];
    //console.log(text);
    lines = text.split("\n");
    for (var line of lines) {
        if (line.startsWith("##") && !line.includes("Please") && line.includes(":")) {
            if (section != []) subreddits_src[sectionname] = section;
            section = [];
            sectionname = line.replace("##", "");
        }
        if (line.startsWith("r/")) {
            section.push(line);
        }
    }
    subreddits_src[sectionname] = section;
}
async function createList() {
    // getting the list of participating subs from the modcoord wiki page
    await appendList("/r/ModCoord/wiki/index.json");
    console.log("grabbed subreddits");
    //subreddits_src["30+ million:"].push("r/tanzatest")

    for (var section in subreddits_src) {
        console.log(section);
        subreddits[section] = [];
        for (var subreddit in subreddits_src[section]) {
            subreddits[section].push({
                "name": subreddits_src[section][subreddit].replace("\n", "").replace("\r", ""),
                "status": "public"
            });
        }
    }
    console.log(subreddits);
    return;
}



firstCheck = false;
var countTimeout = null;
io.on('connection', (socket) => {
    if (firstCheck == false) {
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
if (config.prod == true) {
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
var checkCounter = 0;

async function updateStatus() {
    //return;
    var todo = 0;
    var done = 0;
    var delay = 0;
    const stackTrace = new Error().stack
    checkCounter++;
    var doReturn = false;
    console.log("Starting check " + checkCounter + " with stackTrace: " + stackTrace);
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

                request.httpsGet("/" + subreddits[section][subreddit].name + ".json").then(function (data) {
                    try {
                        if (doReturn) return;
                        done++;
                        //console.log("checked " + subreddits[section][subreddit].name)      
                        if (data.startsWith("<")) {
                            console.log("We're probably getting blocked... - " + data);
                            return;
                        }
                        if (!isJson(data)) {
                            console.log("Response is not JSON? We're probably getting blocked... - " + data);
                            return;
                        }
                        var resp = JSON.parse(data);
                        if (typeof (resp['message']) != "undefined" && resp['error'] == 500) {
                            console.log("We're probably getting blocked... (500) - " + resp);
                            return;
                        }
                        if (typeof (resp['reason']) != "undefined" && resp['reason'] == "private" && subreddits[section][subreddit].status != "private") {
                            //console.log(subreddits[section][subreddit].status);
                            subreddits[section][subreddit].status = "private";
                            if (firstCheck == false)
                                io.emit("update", subreddits[section][subreddit]);
                            else
                                io.emit("updatenew", subreddits[section][subreddit]);

                        } else if (subreddits[section][subreddit].status == "private" && typeof (resp['reason']) == "undefined") {
                            console.log("updating to public with data:")
                            console.log(resp);
                            subreddits[section][subreddit].status = "public";
                            io.emit("updatenew", subreddits[section][subreddit]);
                        }

                        if (done > (todo - 2) && firstCheck == false) {
                            io.emit("subreddits", subreddits);
                            firstCheck = true;
                        }
                        if (done == todo) {
                            setTimeout(() => {
                                updateStatus();
                            }, 10000);
                            console.log("FINISHED CHECK (or close enough to) - num " + checkCounter);
                            return;
                        }
                    } catch {
                        console.log("Something broke! We're probably getting blocked...");
                        stop();
                        return;
                    }
                }).catch(function (err) {
                    console.log("Request failed! We're probably getting blocked... - " + err);
                    stop();
                    return;
                });
            }, delay);
            delay += 1;
        }
    }
}
(async () => {
    await createList();
    await updateStatus();
})();
