(function() {
    const soundToggleButton = document.getElementById('enable_sounds'),
        largeCounterToggles = document.querySelectorAll('#toggle_large_counter, .large-counter-close'),
        publicSubredditsToggle = document.getElementById('toggle-public'),
        blockedCommunities = ['r/bi_irl', 'r/suddenlybi', 'r/ennnnnnnnnnnnbbbbbby', 'r/feemagers', 'r/BrexitAteMyFace', 'r/emoney'],
        // Debug messages (such as the ones from console logs) are not included
        // as you may not want to go up and down in the code to update them
        // when trying to debug something.
        strings = {
            sound_enable: 'Enable sound alerts',
            sound_disable: 'Disable sound alerts',
            sound_enabled_notification: 'Enabled audio alerts.',
            sound_disabled_notification: 'Disabled audio alerts.',
            list_loading: 'Loading...',
            server_loading: 'Server reloading...',
            privated_sub: 'has gone private!',
            publicized_sub: 'has gone public.',
            dark_subreddits_label: 'subreddits are currently dark.',
            counter_comparator: 'out of'
        };

    var audioSystem = {
        playAudio: false,
        play: function (file) {
            var audio = new Audio(`/audio/${file}.mp3`);

            if (this.playAudio === true) audio.play();
        }
    }

    function toggleSounds() {
        if (audioSystem.playAudio === false) {
            soundToggleButton.innerHTML = strings.sound_disable;
            audioSystem.playAudio = true;
            audioSystem.play('privated');
            newStatusUpdate(strings.sound_enabled_notification);
        } else {
            soundToggleButton.innerHTML = strings.sound_enable;
            audioSystem.playAudio = false;
            newStatusUpdate(strings.sound_disabled_notification);
        }
    }

    var socket = io();
    var subreddits = {};
    var amount = 0;
    var dark = 0;
    var loaded = false;

    socket.on('subreddits', (data) => {
        loaded = false;
        document.getElementById('list').innerHTML = strings.list_loading;
        fillSubredditsList(data);
    });

    socket.on('update', (data) => {
        updateSubreddit(data, '');
    });

    socket.on('loading', () => {
        document.getElementById('list').innerHTML = strings.server_loading;
    });

    socket.on('disconnect', function () {
        loaded = false;
    });

    socket.on('updatenew', (data) => {
        if (data.status === 'private') {
            console.log('NEW ONE HAS GONE, SO LONG');
            dark++;
        } else {
            console.log('one has returned? :/');
            dark--;
        }
        var _section = '';
        for (var section in subreddits) {
            for (var subreddit of subreddits[section]) {
                if (subreddit.name === data.name) {
                    _section = section.replace(':', '');
                }
            }
        }
        updateSubreddit(data, _section, true);
    });

    function doScroll(el) {
        const elementRect = el.getBoundingClientRect();
        const absoluteElementTop = elementRect.top + window.pageYOffset;
        const middle = absoluteElementTop - (window.innerHeight / 2);
        window.scrollTo(0, middle);
    }

    function updateSubreddit(data, section, _new = false) {
        if (blockedCommunities.includes(data.name)) {
            console.log('ignoring ' + data.name);
            return;
        }

        console.log(section);

        var section_basename = section.replace(' ', '').replace(':', '').replace('+', '').replace(' ', '').replace('\r', '').replace('\n', '');

        console.log(section_basename);

        if (!loaded) return;

        section = section.substring(0, section.length - 1);

        var text = `<strong>${data.name}</strong> ${strings.privated_sub} (${section})`;

        if (data.status === 'private') {
            if (_new) {
                newStatusUpdate(`<strong>${data.name}</strong> ${strings.privated_sub}<br>(${section})`, function () {
                    doScroll(document.getElementById(data.name));
                }, ['n' + section_basename]);

                audioSystem.play('privated');
            }

            document.getElementById(data.name).classList.add('subreddit-private');
        } else {
            if (_new) {
                const text = `<strong>${data.name}</strong> ${strings.publicized_sub} (${section})`;

                newStatusUpdate(`<strong>${data.name}</strong> ${strings.publicized_sub}`, function () {
                    doScroll(document.getElementById(data.name));
                });

                audioSystem.play('public');
            }
            document.getElementById(data.name).classList.remove('subreddit-private');
        }

        updateStatusText();

        document.getElementById(data.name).querySelector('p').innerHTML = data.status;

        if (_new) {
            const counterHistory = document.getElementById('counter-history');
            var history_item = Object.assign(document.createElement('div'), { className: 'history-item n' + section_basename });
            // @todo: replace "h1" and "h3" elements with "span"s with a class to easily
            // apply CSS on them, as having more than one "h1" element per page is bad
            // and "h3" elements don't respect headlines' hierarchies.
            var header = Object.assign(document.createElement('h1'), { innerHTML: text });
            var textel = Object.assign(document.createElement('h3'), { innerHTML: new Date().toISOString().replace('T', ' ').replace(/\..+/, '') });

            history_item.appendChild(header);
            history_item.appendChild(textel);

            if (data.status === 'public') {
                history_item.classList.add('history-item-online')
            }

            counterHistory.prepend(history_item);
            counterHistory.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    function genItem(name, status) {
        var _item = document.createElement('div');
        var _status = document.createElement('p');
        var _title = document.createElement('a');

        _item.className = 'subreddit';
        _title.innerHTML = name;
        _status.innerHTML = status;
        _title.href = 'https://old.reddit.com/' + name;
        _item.id = name;

        if (status !== 'public') {
            _item.classList.add('subreddit-private');
        }

        _item.appendChild(_title);
        _item.appendChild(_status);

        return _item;
    }

    function togglePublicSubreddits() {
        const list = document.getElementById('list');
        const toggle = document.getElementById('toggle-public');

        list.classList.toggle('hide-public');
        toggle.classList.toggle('toggle-enabled');
    }

    function fillSubredditsList(data) {
        dark = 0;
        amount = 0;
        document.getElementById('list').innerHTML = '';
        subreddits = data;

        for (var section in data) {
            if (section !== '') {
                document.getElementById('list').innerHTML += `<h1>${section}</h1>`;
            }

            var sectionGrid = Object.assign(document.createElement('div'), { 'classList': 'section-grid' });

            for (var subreddit of data[section]) {
                amount++;

                if (subreddit.status === 'private') {
                    dark++;
                }

                sectionGrid.appendChild(genItem(subreddit.name, subreddit.status));
            }
            document.getElementById('list').appendChild(sectionGrid);
        }

        loaded = true;
        updateStatusText();
    }


    od_percentage = new Odometer({
        el: document.getElementById('percentage'),
        value: 0,
        format: '(,ddd).dd',
        theme: 'default'
    });

    od_togo = new Odometer({
        el: document.getElementById('togo'),
        value: 0,
        format: '',
        theme: 'default'
    });

    function updateStatusText() {
        document.getElementById('amount').innerHTML = `<strong>${dark}</strong><light>/${amount}</light> ${strings.dark_subreddits_label}`;
        od.update(dark);
        document.getElementById('lc-max').innerHTML = ` <light>${strings.counter_comparator}</light> ${amount}`;

        var percentage = ((dark / amount) * 100).toFixed(2);

        od_percentage.update(percentage);
        od_togo.update(amount - dark);

        document.getElementById('progress-bar').style = `width: ${percentage}%`;
    }

    function newStatusUpdate(text, callback = null, _classes = []) {
        var item = Object.assign(document.createElement('div'), { 'className': 'status-update' });

        item.innerHTML = text;

        document.getElementById('statusupdates').appendChild(item);

        setTimeout(function() {
            item.remove();
        }, 20000);

        item.addEventListener('click', function () {
            item.remove();

            if (callback !== null) {
                callback();
            }
        });

        for (var _class of _classes) {
            console.log(_class);
            item.classList.add(_class);
        }
    }

    function toggleLargeCounter() {
        const counter = document.getElementById('large-counter'),
            hiddenClass = 'large-counter-hidden',
            noScrollClass = 'noscroll';

        counter.classList.toggle(hiddenClass);
        document.body.classList.toggle(noScrollClass);

        od.update(0);
        if (counter.classList.contains(hiddenClass)) od.update(dark);
    }

    od = new Odometer({
        el: document.getElementById('lc-count'),
        value: 0,
        format: '',
        theme: 'default'
    });

    soundToggleButton.addEventListener('click', toggleSounds);
    publicSubredditsToggle.addEventListener('click', togglePublicSubreddits);

    largeCounterToggles.forEach(function (toggle) {
        toggle.addEventListener('click', toggleLargeCounter);
    });
}());
