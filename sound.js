/// <reference path="agent.js" />
/// <reference path="agi.js" />
/// <reference path="canvas.js" />
/// <reference path="commands.js" />
/// <reference path="hacks.js" />
/// <reference path="io.js" />
/// <reference path="menu.js" />
/// <reference path="picture.js" />
/// <reference path="reservedwords.js" />
/// <reference path="sarien.js" />
/// <reference path="test.js" />
/// <reference path="text.js" />
/// <reference path="utils.js" />
/// <reference path="view.js" />

// Sound does not actually play sound, but handles the setting of flags
// when playing a certain sound is completed.
var Sound = {
  flagsToSet: {},

  soundDurations: {},

  sndN: null,
  sndNFlag: null,

  // sets the duration is ms for a sound.
  setDuration: function (sound, ms) {
    // a sound ends when its cycleCount reached 0, so calculate required cycles
    var cycles = Math.round(ms / AGI.interval);
    Sound.soundDurations[sound] = cycles;
  },

  playClick: false,
  playClickN: -1,
  playClickFlag: -1,
  playClickDone: false,
  // playes a sound and sets a flag
  play: function (n, flag) {
    var soundDuration = Sound.soundDurations[n];
    // set the amount of cycles to wait until the sound ends
    //this.flagsToSet[flag] = soundDuration ? soundDuration : 1;

    this.stop(true);

    this.sndN = document.getElementById('snd' + n);
    if (this.sndN && document.contains(this.sndN)) {
      this.sndNFlag = flag;
      this.flagsToSet[flag] = 9007199254740992;
      this.sndN.onended = function () {
        Sound.flagsToSet[Sound.sndNFlag] = 1;
        Sound.sndN = null;
        Sound.sndNFlag = null;
      };
      this.sndN.play();
      if (
        this.playClickDone == false &&
        this.playClick == false &&
        (this.sndN.paused ||
          (this.sndN.buffered.length > 0 && this.sndN.buffered.end(0) === 0))
      ) {
        this.playClick = true;
        this.playClickN = n;
        this.playClickFlag = flag;
      }
    } else {
      this.sndN = null;
      this.sndNFlag = null;
      this.flagsToSet[flag] = soundDuration ? soundDuration : 1;
    }
  },
  loadAll: function () {
    var sndAll = document.getElementsByTagName('audio');
    for (var i = 0; i < sndAll.length; i++) {
      sndAll[i].play();
      sndAll[i].pause();
    }
  },

  stop: function (doNotSetFlag) {
    if (this.sndN && this.sndN !== null && document.contains(this.sndN)) {
      this.sndN.pause();
      try {
        this.sndN.currentTime = 0;
      } catch (Exception) {}
      if (doNotSetFlag === true) {
      } else {
        this.flagsToSet[this.sndNFlag] = 1;
      }
      this.setFlags();
    }
  },

  // sets all flags that are scheduled to set by playing sounds
  setFlags: function () {
    for (var flag in this.flagsToSet) {
      this.flagsToSet[flag]--;
      if (this.flagsToSet[flag] == 0) {
        cmd_set(flag);
        delete this.flagsToSet[flag];
      }
    }
  },

  on: true,
  setOnOff: function (b) {
    if (b === false || this.on) {
      this.on = false;
      if (this.sndN) {
        this.sndN.muted = true;
      }
    } else {
      this.on = true;
      if (this.sndN) {
        this.sndN.muted = false;
      }
    }
  },
};
