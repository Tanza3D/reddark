var socket = io("https://reddark.untone.uk/");

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

socket.on('disconnect', function() {
    loaded = false;
 });
socket.on("updatenew", (data) => {
    if(data.status == "private") {
        console.log("NEW ONE HAS GONE, SO LONG");
    } else {
        console.log("one has returned? :/");
    }
    updateSubreddit(data);
    console.log(data);
})
function updateSubreddit(data) {
    if(!loaded) return;
    if(data.status == "private") {
        document.getElementById(data.name).classList.add("subreddit-private");
    } else {
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
    if(status != "online") {
        _item.classList.add("subreddit-private");
    }
    _item.appendChild(_title);
    _item.appendChild(_status);
    return _item;
}

function fillSubredditsList(data) {
    for(var section in data) {
        document.getElementById("list").innerHTML += "<h1>" + section + "</h1>";
        var sectionGrid = Object.assign(document.createElement("div"), {"classList": "section-grid"})
        for(var subreddit of data[section]) {
            console.log(subreddit);
            sectionGrid.appendChild(genItem(subreddit.name, subreddit.status));
        }
        document.getElementById("list").appendChild(sectionGrid);
    }
    loaded = true;
}