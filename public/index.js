var audioSystem = {
    playAudio: false,
    play: function (file) {
        var audio = new Audio('/audio/' + file + ".mp3");
        if (this.playAudio == true)
            audio.play();
    }
}
document.getElementById("enable_sounds").addEventListener("click", function () {
    if (audioSystem.playAudio == false) {
        document.getElementById("enable_sounds").innerHTML = "Disable sound alerts"
        audioSystem.playAudio = true;
        audioSystem.play("privated");
        newStatusUpdate("Enabled audio alerts.");
    } else {
        audioSystem.playAudio = false;
        newStatusUpdate("Disabled audio alerts.");
        document.getElementById("enable_sounds").innerHTML = "Enable sound alerts"
    }
})
var socket = io();

var loaded = false;
socket.on("subreddits", (data) => {
    loaded = false;
    document.getElementById("list").innerHTML = "Loading...";
    console.log(data);
    fillSubredditsList(data);
})

socket.on("update", (data) => {
    console.log(data);
    updateSubreddit(data);
})

socket.on('disconnect', function () {
    loaded = false;
});
socket.on("updatenew", (data) => {
    if (data.status == "private") {
        console.log("NEW ONE HAS GONE, SO LONG");
    } else {
        console.log("one has returned? :/");
    }
    updateSubreddit(data, true);
    console.log(data);
})
function updateSubreddit(data, _new = false) {
    if (!loaded) return;
    if (data.status == "private") {
        if (_new) newStatusUpdate("<strong>" + data.name + "</strong> has gone private!")
        if (_new) audioSystem.play("privated")
        document.getElementById(data.name).classList.add("subreddit-private");
    } else {
        if (_new) newStatusUpdate("<strong>" + data.name + "</strong> has gone public.")
        if (_new) audioSystem.play("public")
        document.getElementById(data.name).classList.remove("subreddit-private");
    }
    document.getElementById(data.name).querySelector("p").innerHTML = data.status;
}

function genItem(name, status) {
    var _item = document.createElement("div");
    var _status = document.createElement("p");
    var _title = document.createElement("h3");
    _item.className = "subreddit";
    _title.innerHTML = name;
    _status.innerHTML = status;
    _item.id = name;
    if (status != "public") {
        _item.classList.add("subreddit-private");
    }
    _item.appendChild(_title);
    _item.appendChild(_status);
    return _item;
}

function fillSubredditsList(data) {
    document.getElementById("list").innerHTML = "";
    for (var section in data) {
        document.getElementById("list").innerHTML += "<h1>" + section + "</h1>";
        var sectionGrid = Object.assign(document.createElement("div"), { "classList": "section-grid" })
        for (var subreddit of data[section]) {
            console.log(subreddit);
            sectionGrid.appendChild(genItem(subreddit.name, subreddit.status));
        }
        document.getElementById("list").appendChild(sectionGrid);
    }
    loaded = true;
}

function newStatusUpdate(text) {
    var item = Object.assign(document.createElement("div"), { "className": "status-update" });
    item.innerHTML = text;
    document.getElementById("statusupdates").appendChild(item);
    setTimeout(() => {
        item.remove();
    }, 10000);
}