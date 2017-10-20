class MasterIciba {
    constructor(text) {
        this.words = text.split(/[\r\n]+/);
        // this.words = this.words.slice(0, this.words.length - 1).sort();
        this.words = this.shuffle(this.words.slice(0, this.words.length - 1)).slice(0, 100).sort();
        this.initList();

        this.playedWords = [];

        this.audios = [];
        this.handle = null;
        this.paused = false;
        this.bindKeyEventHandlers();

        this.wordIndex = 0;
        this.exampleIndex = 0;
        this.playNextWord();
    }
    bindKeyEventHandlers() {
        window.onkeydown = this.handleKeyEvent.bind(this);
    }
    handleKeyEvent(e) {
        if(e.keyCode == 37) {
            if(this.wordIndex > 1) {
                this.paused = false;
                this.stop(true);
                this.wordIndex -= 2;
                document.getElementById('list').firstElementChild.insertBefore(this.playedWords.pop(), document.getElementById('list').firstElementChild.firstElementChild);
                if(this.playedWords.length > 0) {
                    document.getElementById('list').firstElementChild.insertBefore(this.playedWords.pop(), document.getElementById('list').firstElementChild.firstElementChild);
                }
                console.log(this.wordIndex);
                this.playNextWord();
            }
        }
        else if(e.keyCode == 39) {
            this.paused = false;
            this.stop(true);
            this.playNextWord();
        }
        else if(e.keyCode == 13) {
            this.paused = !this.paused;
            if(this.paused) {
                this.stop(false);
            }
            else {
                if(this.fetched) {
                    this.playNextExample();
                }
            }
        }
    }
    stop(pause) {
        if(this.handle) {
            clearInterval(this.handle);
            this.handle = null;
        }
        else {
            let j = this.exampleIndex - 1;
            if (j >= 0 && j < this.audios.length) {
                if(pause) {
                    this.audios[j].pause();
                }
                this.audios[j].onended = this.audios[j].onerror = null;
            }

            if(this.audio) {
                if(pause) {
                    this.audio.pause();
                }
                this.audio.onended = this.audio.onerror = null;
            }
        }
    }
    initList() {
        let container = document.createElement('table');
        container.border = '1';
        container.cellSpacing = '0';
        container.cellPadding = '0';
        for(let i = 0; i < this.words.length; ++ i) {
            let item = document.createElement('tr');
            let id = document.createElement('td');
            id.style.padding = '1em';
            id.innerHTML = i+1;
            let content = document.createElement('td');
            content.style.padding = '1em';
            content.innerHTML = this.words[i];
            item.appendChild(id);
            item.appendChild(content);
            container.appendChild(item);
        }
        document.getElementById('list').appendChild(container);
    }
    parseph(json) {
        let ph = [];
        try {
            ph.push(json.baesInfo.symbols[0].ph_en_mp3);
            ph.push(json.baesInfo.symbols[0].ph_am_mp3);
            ph.push(json.baesInfo.symbols[0].ph_tts_mp3);
        } catch (e) { console.log(e); }
        return ph.length == 0 ? null : ph[Math.floor(Math.random() * ph.length)];
    }
    parse(json) {
        let sentences = [];
        let trans = [];
        let mp3s = [];
        try {
            if ('collins' in json) {
                let collins = json.collins;
                for (let i = 0; i < collins.length; ++i) {
                    let entry = collins[i].entry;
                    for (let j = 0; j < entry.length; ++j) {
                        let examples = entry[j].example;
                        for (let k = 0; k < examples.length; ++k) {
                            let ex = examples[k];
                            sentences.push(ex.ex);
                            trans.push(ex.tran);
                            mp3s.push(ex.tts_mp3);
                            break;
                        }
                    }
                }
            }
        } catch (e) { console.log(e); }
        return {sentences, trans, mp3s};
    }

    render(sm) {
        let sentences = sm.sentences;
        let trans = sm.trans;
        let mp3s = sm.mp3s;
        let audios = [];
        document.getElementById('examples').innerHTML = '';
        let container = document.createElement('div');
        for (let i = 0; i < Math.min(5, sentences.length); ++i) {
            let div = document.createElement('div');
            div.style.display = 'flex';
            div.style.paddingBottom = '2em';
            div.style.borderBottom = '1px solid';
            div.style.marginBottom = '2em';

            let text = document.createElement('span');
            text.id = `anchor${i}`;
            text.innerHTML = sentences[i] + '<br />' + trans[i];
            text.style.fontSize = '30px';
            text.style.fontFamily = 'Courier New';
            text.style.marginTop = 'auto';
            text.style.marginBottom = 'auto';
            text.style.marginLeft = '2em';

            let audio = document.createElement('audio');
            audio.src = mp3s[i];
            audio.controls = true;
            audio.style.display = 'inline';
            audio.style.marginTop = 'auto';
            audio.style.marginBottom = 'auto';

            audios.push(audio);

            div.appendChild(audio);
            div.appendChild(document.createElement('br'));
            div.appendChild(text);
            container.appendChild(div);
        }
        document.getElementById('examples').appendChild(container);

        return audios;
    }

    playNextWord() {
        this.audios = [];
        this.fetched = false;

        let i = this.wordIndex ++;
        if (i >= this.words.length) {
            return;
        }
        let word = this.words[i];
        document.title = word;
        if (i > 0) {
            this.playedWords.push(document.getElementById('list').firstElementChild.firstElementChild);
            document.getElementById('list').firstElementChild.removeChild(document.getElementById('list').firstElementChild.firstElementChild);
        }
        //            document.body.firstElementChild.firstElementChild.children[i].scrollIntoView(false);
        //            document.body.firstElementChild.firstElementChild.children[i].style.fontWeight = 'bold';
        fetch(`index.php?a=getWordMean&c=search&list=1%2C2%2C3%2C4%2C5%2C8%2C9%2C10%2C12%2C13%2C14%2C15%2C18%2C21%2C22%2C24%2C3003%2C3004%2C3005&word=${word}`).then(
            (resp) => {
                if (resp.ok) {
                    resp.json().then((json) => {
                        if(i+1 != this.wordIndex) {
                            return;
                        }
                        this.fetched = true;

                        this.updateTitle(json);
                        this.audios = this.render(this.parse(json));

                        this.resetExampleIndex();

                        if(this.paused) {
                            return;
                        }
                        this.playPh(this.parseph(json));
                        // this.playNextExample();
                    });
                }
                else {
                    if(i+1 != this.wordIndex) {
                        return;
                    }
                    playNextWord();
                }
            }
        )
    }

    playPh(ph) {
        if(ph) {
            this.audio = document.createElement('audio');
            this.audio.src = ph;
            this.audio.onended = this.audio.onerror = () => {
                this.audio = null;
                this.handle = setTimeout(() => {
                    this.playNextExample();
                }, 1000);
            }
            this.audio.play();
        }
        else {
            this.playNextExample();
        }
    }

    resetExampleIndex() {
        this.exampleIndex = 0;
    }

    updateTitle(json) {
        try {
            document.getElementById('title').innerHTML = document.title + ': ' +
                `<div>英[${json.baesInfo.symbols[0].ph_en}], 美[${json.baesInfo.symbols[0].ph_am}]</div>` +
                json.baesInfo.symbols[0].parts.map((e) => {
                    return `<div>${e.part} ${e.means.join(', ')}</div>`;
                }).join('');

            document.getElementById('title').scrollIntoView();
        } catch (e) {
            console.log(e);
        }
    }

    highLightExample(j) {
        if (j > 0) {
            document.getElementById(`anchor${j - 1}`).style.fontWeight = '';
        }
        let id = `anchor${j}`;
        document.getElementById(id).style.fontWeight = 'bold';
        //                        location.href = `#${id}`;
        document.getElementById(id).scrollIntoView(false);
    }

    playNextExample() {
        this.handle = null;
        let j = this.exampleIndex ++;
        if (j < this.audios.length) {
            this.audios[j].onended = this.audios[j].onerror = () => {
                //                            document.getElementById(id).style.fontWeight = '';
                this.handle = setTimeout(() => { this.playNextExample(); }, 2000);
            };
            this.highLightExample(j);
            this.audios[j].play();
        }
        else {
            this.handle = setTimeout(() => { this.playNextWord(); }, 1000 );
        }
    };

    shuffle(a) {
        for (let i = 0; i < a.length; ++i) {
            let r = Math.floor(Math.random() * (a.length - i)) + i;
            if (r != i) {
                [a[i], a[r]] = [a[r], a[i]];
            }
        }
        return a;
    }
}