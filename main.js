const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
var request = require("./requests.js");
var config = require("./config.js")
const io = new Server(server, {
    cors: {
        origin: "https://reddark.untone.uk/",
        methods: ["GET", "POST"],
        transports: ['websocket', 'polling'],
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
    text = data[0]['data']['children'][0]['data']['selftext'];
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
    await appendList("/r/ModCoord/comments/1401qw5/incomplete_and_growing_list_of_participating.json")
    await appendList("/r/ModCoord/comments/143fzf6/incomplete_and_growing_list_of_participating.json");
    console.log("grabbed subreddits");
    //subreddits_src["30+ million:"].push("r/tanzatest")

    for (var section in subreddits_src) {
        console.log(section);
        subreddits[section] = [];
        for (var subreddit in subreddits_src[section]) {
            subreddits[section].push({
                "name": subreddits_src[section][subreddit],
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
        socket.emit("loading");
    } else {
        socket.emit("subreddits", subreddits);
    }
    clearTimeout(countTimeout);
    countTimeout = setTimeout(() => {
        console.log('currently connected users: ' + io.engine.clientsCount);
    }, 500);
});

server.listen(config.port, () => {
    console.log('listening on *:' + config.port);
});
var checkCounter = 0;

async function updateStatus() {
    var new_status = [];
    var todo = 0;
    var done = 0;
    var finished = false;
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
            request.httpsGet("/" + subreddits[section][subreddit].name + ".json").then(function (data) {
                if (doReturn) return;
                //console.log("checked " + subreddits[section][subreddit].name)
                
                if (data.startsWith("<")) {
                    console.log("We're probably getting blocked... - " + data);
                    stop();
                    return;
                }
                if(!isJson(data)) {
                    console.log("Response is not JSON? We're probably getting blocked... - " + data);
                    stop();
                    return;
                }
                var resp = JSON.parse(data);
                if (typeof (resp['message']) != "undefined" && resp['error'] == 500) {
                    console.log("We're probably getting blocked... (500) - " + resp);
                    stop();
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
                done++;
                if (done > (todo - 2) && firstCheck == false) {
                    io.emit("subreddits", subreddits);
                    firstCheck = true;
                }
                if (done == todo) {
                    updateStatus();
                    console.log("FINISHED CHECK (or close enough to) - num " + checkCounter);
                    return;
                }
            });
        }
    }
}
(async () => {
    await createList();
    await updateStatus();
})();
