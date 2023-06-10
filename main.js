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
    var httpsRequests = [];
    var finished = false;
    const stackTrace = new Error().stack
    checkCounter++;
    console.log("Starting check " + checkCounter + " with stackTrace: " + stackTrace);
    for (let section in subreddits) {
        for (let subreddit in subreddits[section]) {
            const httpsReq = request.httpsGet("/" + subreddits[section][subreddit].name + ".json").then((data) => {
                if(data.startsWith("<")) {
                    console.log("Request to Reddit errored - " + data);
                    // error handling? the app will assume the sub is public
                    return;
                }
                
                var resp = JSON.parse(data);
                if (typeof (resp['message']) != "undefined" && resp['error'] == 500) {
                    console.log("Request to Reddit errored (500) - " + resp);
                    // error handling? the app will assume the sub is public
                    return;
                }

                if (typeof (resp['reason']) != "undefined" && resp['reason'] == "private" && subreddits[section][subreddit].status != "private") {
                    // the subreddit is private and the app doesn't know about it yet
                    subreddits[section][subreddit].status = "private";
                    if (firstCheck == false) {
                        io.emit("update", subreddits[section][subreddit]);
                    } else {
                        io.emit("updatenew", subreddits[section][subreddit]);
                    }
                } else if (subreddits[section][subreddit].status == "private" && typeof (resp['reason']) == "undefined") {
                    // the subreddit is public but the app thinks it's private
                    console.log("updating to public with data - " + resp);
                    subreddits[section][subreddit].status = "public";
                    io.emit("updatenew", subreddits[section][subreddit]);
                }
            }).catch((err) => {
                if (err.message == "timed out") {
                    console.log("Request to Reddit timed out");
                } else {
                    console.log("Request to Reddit errored - " + err);
                }
                
                // error handling? the app will assume the sub is public
            });
            
            httpsRequests.push(httpsReq);
        }
    }
    
    await Promise.all(httpsRequests);
    
    // all requests have now either been completed or errored
    if (!firstCheck) {
        io.emit("subreddits", subreddits);
        firstCheck = true;
    }
}

async function run() {
    await createList();
    updateStatus();
    setInterval(updateStatus, config.updateInterval); // interval between calls set in the config file
}

run();
