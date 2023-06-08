const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
var request = require("./requests.js");
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

    for (var section in subreddits_src) {
        console.log(section);
        subreddits[section] = [];
        for (var subreddit in subreddits_src[section]) {
            subreddits[section].push({
                "name": subreddits_src[section][subreddit],
                "status": "online"
            });
        }
    }
    console.log(subreddits);
    return;
}



firstCheck = false;

io.on('connection', (socket) => {
    socket.emit("subreddits", subreddits);
    console.log('a user connected - currently connected users: ' + io.engine.clientsCount);
});

server.listen(3210, () => {
    console.log('listening on *:3210');
});


async function updateStatus() {
    var new_status = [];
    var todo = 0;
    var done = 0;
    var finished = false;
    for (let section in subreddits) {
        for (let subreddit in subreddits[section]) {
            todo++;
            request.httpsGet("/" + subreddits[section][subreddit].name + ".json").then(function (data) {
                //console.log("checked " + subreddits[section][subreddit].name)
                var resp = JSON.parse(data);
                if (typeof (resp['reason']) != "undefined" && subreddits[section][subreddit].status != "private") {
                    //console.log(subreddits[section][subreddit].status);
                    subreddits[section][subreddit].status = "private";
                    if (firstCheck == false)
                        io.emit("update", subreddits[section][subreddit]);
                    else
                        io.emit("updatenew", subreddits[section][subreddit]);

                } else if (subreddits[section][subreddit].status == "private" && typeof (resp['reason']) == "undefined") {
                    console.log("updating to public with data:")
                    console.log(resp);
                    subreddits[section][subreddit].status = "online";
                    io.emit("updatenew", subreddits[section][subreddit]);
                }
                done++;
                if (done > (todo - 10) && finished == false) {
                    finished = true
                    console.log("JUST ABOUT DONE!!!");
                    updateStatus();
                    firstCheck = true;
                }
            });
        }
    }
}
(async () => {
    await createList();
    await updateStatus();
})();