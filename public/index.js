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

var amount = 0;
var dark = 0;

var loaded = false;
socket.on("subreddits", (data) => {
    loaded = false;
    document.getElementById("list").innerHTML = "Loading...";
    fillSubredditsList(data);
})

socket.on("update", (data) => {
    updateSubreddit(data);
})
socket.on("loading", () => {
    document.getElementById("list").innerHTML = "Server reloading...";
})


socket.on('disconnect', function () {
    loaded = false;
});
socket.on("updatenew", (data) => {
    if (data.status == "private") {
        console.log("NEW ONE HAS GONE, SO LONG");
        dark++;
    } else {
        console.log("one has returned? :/");
        dark--;
    }
    updateSubreddit(data, true);
})
function doScroll(el) {
    const elementRect = el.getBoundingClientRect();
    const absoluteElementTop = elementRect.top + window.pageYOffset;
    const middle = absoluteElementTop - (window.innerHeight / 2);
    window.scrollTo(0, middle);
}
function updateSubreddit(data, _new = false) {
    if (!loaded) return;
    if (data.status == "private") {
        if (_new) {
            newStatusUpdate("<strong>" + data.name + "</strong> has gone private!", function () {
                doScroll(document.getElementById(data.name));
            })
            audioSystem.play("privated")
        }
        document.getElementById(data.name).classList.add("subreddit-private");
    } else {
        if (_new) {
            newStatusUpdate("<strong>" + data.name + "</strong> has gone public.", function () {
                doScroll(document.getElementById(data.name));
            })
            audioSystem.play("public")
        }
        document.getElementById(data.name).classList.remove("subreddit-private");
    }
    updateStatusText();
    document.getElementById(data.name).querySelector("p").innerHTML = data.status;
}

function genItem(name, status) {
    var _item = document.createElement("div");
    var _status = document.createElement("p");
    var _title = document.createElement("a");
    _item.className = "subreddit";
    _title.innerHTML = name;
    _status.innerHTML = status;
    _title.href = "https://reddit.com/" + name;
    _item.id = name;
    if (status != "public") {
        _item.classList.add("subreddit-private");
    }
    _item.appendChild(_title);
    _item.appendChild(_status);
    return _item;
}

function hidePublicSubreddits() {
    document.getElementById("list").classList.toggle("hide-public");
    document.getElementById("hide-public").classList.toggle("toggle-enabled");
}

function fillSubredditsList(data) {
    dark = 0;
    amount = 0;
    document.getElementById("list").innerHTML = "";

    for (var section in data) {
        if (section != "") document.getElementById("list").innerHTML += "<h1>" + section + "</h1>";
        var sectionGrid = Object.assign(document.createElement("div"), { "classList": "section-grid" })
        for (var subreddit of data[section]) {
            amount++;
            if (subreddit.status == "private") {
                dark++;
            }
            sectionGrid.appendChild(genItem(subreddit.name, subreddit.status));
        }
        document.getElementById("list").appendChild(sectionGrid);
    }
    loaded = true;
    updateStatusText();
}

function updateStatusText() {
    document.getElementById("amount").innerHTML = "<strong>" + dark + "</strong><light>/" + amount + "</light> subreddits are currently dark.";
}
function newStatusUpdate(text, callback = null) {
    var item = Object.assign(document.createElement("div"), { "className": "status-update" });
    item.innerHTML = text;
    document.getElementById("statusupdates").appendChild(item);
    setTimeout(() => {
        item.remove();
    }, 10000);
    if (callback != null) {
        item.addEventListener("click", function () {
            callback();
        })
    }
}
