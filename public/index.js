var audioSystem = {
    playAudio: false,
    play: function (file) {
        var audio = new Audio('/audio/' + file + ".mp3");
        if (this.playAudio == true)
            audio.play();
    }
}

var block = ["r/bi_irl", "r/suddenlybi", "r/ennnnnnnnnnnnbbbbbby", "r/feemagers", "r/BrexitAteMyFace", "r/emoney"];

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
var subreddits = {};
var amount = 0;
var dark = 0;
var statusUpdateItems = [];

var loaded = false;
socket.on("subreddits", (data) => {
    loaded = false;
    document.getElementById("list").innerHTML = "Loading...";
    fillSubredditsList(data);
})

socket.on("update", (data) => {
    updateSubreddit(data, "");
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
    var _section = "";
    for (var section in subreddits) {
        for (var subreddit of subreddits[section]) {
            if (subreddit.name == data.name) {
                _section = section.replace(":", "");
            }
        }
    }
    updateSubreddit(data, _section, true);
})
function doScroll(el) {
    const elementRect = el.getBoundingClientRect();
    const absoluteElementTop = elementRect.top + window.pageYOffset;
    const middle = absoluteElementTop - (window.innerHeight / 2);
    window.scrollTo(0, middle);
}
function updateSubreddit(data, section, _new = false) {
    if(block.includes(data.name)) {
        console.log("ignoring " + data.name);
        return
    }

    console.log(section);

    var section_basename = section.replace(" ", "").replace(":", "").replace("+", "").replace(" ", "").replace("\r", "").replace("\n", "");
    
    console.log(section_basename);
    if (!loaded) return;
    section = section.substring(0, section.length - 1);
    var text = "<strong>" + data.name + "</strong> has gone private! (" + section + ")";
    if (data.status == "private") {
        if (_new) {
            newStatusUpdate("<strong>" + data.name + "</strong> has gone private!<br>(" + section + ")", function () {
                doScroll(document.getElementById(data.name));
            }, ["n" + section_basename])
            audioSystem.play("privated")
        }
        document.getElementById(data.name).classList.add("subreddit-private");
    } else {
        if (_new) {
            var text = "<strong>" + data.name + "</strong> has gone public. (" + section + ")";
            newStatusUpdate("<strong>" + data.name + "</strong> has gone public.", function () {
                doScroll(document.getElementById(data.name));
            })
            audioSystem.play("public")
        }
        document.getElementById(data.name).classList.remove("subreddit-private");
    }
    updateStatusText();
    document.getElementById(data.name).querySelector("p").innerHTML = data.status;

    if (_new) {
        var history_item = Object.assign(document.createElement("div"), { className: "history-item n" + section_basename });
        var header = Object.assign(document.createElement("h1"), { innerHTML: text });
        var textel = Object.assign(document.createElement("h3"), { innerHTML: new Date().toISOString().replace("T", " ").replace(/\..+/, '') });
        history_item.appendChild(header);
        history_item.appendChild(textel);
        if(data.status == "public") {
            history_item.classList.add("history-item-online")
        }
        document.getElementById("counter-history").prepend(history_item);
        document.getElementById("counter-history").scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function genItem(name, status) {
    var _item = document.createElement("div");
    var _status = document.createElement("p");
    var _title = document.createElement("a");
    _item.className = "subreddit";
    _title.innerHTML = name;
    _status.innerHTML = status;
    _title.href = "https://old.reddit.com/" + name;
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
    subreddits = data;
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


od_percentage = new Odometer({
    el: document.getElementById("percentage"),
    value: 0,
    format: '(,ddd).dd',
    theme: 'default'
});
od_togo = new Odometer({
    el: document.getElementById("togo"),
    value: 0,
    format: '',
    theme: 'default'
});



function updateStatusText() {
    var percent = dark/amount * 100;
    document.getElementById("amount").innerHTML = "<strong>" + dark + "</strong><light>/" + amount + "</light><strong> (" + percent.toFixed(1) + "%)</strong> subreddits are currently dark.";
    od.update(dark);
    document.getElementById("lc-max").innerHTML = " <light>out of</light> " + amount;


    var percentage = ((dark / amount) * 100).toFixed(2);;
    od_percentage.update(percentage);
    od_togo.update(amount - dark);
    document.getElementById("progress-bar").style = "width: " + percentage + "%";
}

function newStatusUpdate(text, callback = null, _classes = []) {
    var item = Object.assign(document.createElement("div"), { "className": "status-update" });
    item.innerHTML = text;

    if (statusUpdateItems.length >= 3) {
        const itemToRemove = x.pop();
        if (document.contains(itemToRemove)) {
            itemToRemove.remove();
        }
    }

    statusUpdateItems.unshift(item);

    document.getElementById("statusupdates").appendChild(item);
    setTimeout(() => {
        item.remove();
    }, 10000);

    item.addEventListener("click", function () {
        item.remove();
        if (callback != null) {
            callback();
        }
    })
    for (var _class of _classes) {
        console.log(_class);
        item.classList.add(_class);
    }
}

function toggleLargeCounter() {
    document.getElementById("large-counter").classList.toggle("large-counter-hidden");
    document.body.classList.toggle("noscroll");
    if (document.getElementById("large-counter").classList.contains("large-counter-hidden")) {
        od.update(0);
    } else {
        od.update(0);
        od.update(dark);
    }
}


od = new Odometer({
    el: document.getElementById("lc-count"),
    value: 0,
    format: '',
    theme: 'default'
});


window.addEventListener('load', function() {
    // see if we got passed any options
    if (typeof this.window.location.hash === 'string') {
        const hashWords = this.window.location.hash.replace(/^#/, '').split('&');
        console.log('hash:', hashWords);
        // automatically show large counter?
        if (hashWords.indexOf('largeCounter') >= 0) {
            toggleLargeCounter();
        }
    } else {
        console.log('no hash');
    }
})