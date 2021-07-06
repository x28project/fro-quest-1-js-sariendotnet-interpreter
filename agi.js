/// <reference path="agent.js" />
/// <reference path="canvas.js" />
/// <reference path="commands.js" />
/// <reference path="hacks.js" />
/// <reference path="io.js" />
/// <reference path="menu.js" />
/// <reference path="MultiplayerClient.js" />
/// <reference path="picture.js" />
/// <reference path="reservedwords.js" />
/// <reference path="sarien.js" />
/// <reference path="sound.js" />
/// <reference path="test.js" />
/// <reference path="text.js" />
/// <reference path="utils.js" />
/// <reference path="view.js" />

// global variable storage
var MESSAGES = []; // holds game messages per logic
var CONTROLS = {};
var WORDS = []; // holds words referenced by said command, said(42) -> said("bla")
var roomNames = {
  1: 'Intro',
  2: 'Outside your house',
  3: 'Inside well, at the elevator',
  4: "Inside well, at the tortoise's lair",
  5: "Outside your neighbor's house",
  6: 'At the fountain',
  7: 'At the crumbling wall',
  8: 'At the end of the road',
  9: 'Inside your house',
  10: "Inside your neighbor's house",
  11: "Picture of neighbor's friend",
  12: 'Sky',
  13: 'At the pole or vortex',
  14: 'In limbo',
  15: 'At the mountaintop oasis',
  16: 'The End',
}; // optionally contains pretty room names for use in the addressbar after the hash
var avatarNames = {}; // optionally contains pretty avatar names for use in the avatar picker
var multiplayerRooms = {}; // contains a list of rooms that allow multiplayer
var vars = []; // stores variables used by the interpreter
var flags = []; // stores flags used by the interpreter
var objects = []; // stores objects used by the interpreter
var c = []; // stores control keys used by the interpreter
var items = {}; // stores inventory items found by the player
var controllerss = []; // stores controllers, not used
var strings = []; // stores string values such
var jumptoLine = 0; // the javascript equivalent of goto, used inside a huge switch/case clause within each logic file
var roomEntryPoints = {}; // used for initially positioning ego when entering a room by url

// AGI, the interpreter
var AGI = {
  block: false, // either false or an object {x1, y1, x2, y2}, used for creating a barrier in a room
  break_all_logics: true, // flag to break out of all logics after cmd_new_room is given
  current_logic: 0, // the current logic being executed by the interpreter
  previous_logic_text_screen: 0,
  current_room: 0, // the current room
  control: 0, // control scheme, either player control or program control
  game_id: 'FQ1', // the id of the current game, stored by the initial logic run
  highestObjIndex: 0, // highest object index ever stored in the objects array
  horizon: 0, // the game horizon
  interval: 42, // interpreter interval used for each cycle, not set to mimic original AGI
  new_room: 0, // when cmd_new_room is called, this is set to the room number
  picture: null, // will contain a Picture instance
  paused: false, // when enabled, this will not do any object manipulation per cycle
  priorityTable: [], // contains standard priority layer information numbers
  screen: 0, // either graphics or text, used to switch between the two
  screen_width: 160, // initial width of an AGI picture resource
  screen_height: 168,
  startMilliseconds: 0, // timestamp of startup
  zoom: 2, // zoom can be used in the future for showing a larger or smaller game
  stopped: false,
  cycle: 0,

  // initializes the interpreter and sets variable values
  init: function () {
    for (var i = 0; i < 255; i++) {
      var img = document.createElement('img');
      var imagePath = Sarien.path + '/view' + Utils.PadLeft(i, '0', 3) + '.png';
      img.setAttribute('src', imagePath);

      var priorities = PICTURES[i];
      if (priorities) {
        for (var nr in priorities) {
          img = document.createElement('img');
          imagePath =
            Sarien.path +
            '/picture' +
            Utils.PadLeft(i, '0', 3) +
            '-' +
            Utils.PadLeft(nr, '0', 2) +
            '.png';
          img.setAttribute('src', imagePath);
        }
      }

      //document.getElementById("canvas").appendChild(img);
    }

    // set global varnames (v1, v2, ...), flagnames and others to their initial value
    for (var i = 0; i < 256; i++) {
      window['o' + i] = i; // oN will be value N, so values can be addressed by pointers
      window['f' + i] = i; // fN will be value N, so values can be addressed by pointers
      window['v' + i] = i; // vN will be value N, so values can be addressed by pointers
      window['c' + i] = i; // cN will be value N, so values can be addressed by pointers
      window['i' + i] = i; // iN will be value N, so values can be addressed by pointers
      window['s' + i] = i; // sN will be value N, so values can be addressed by pointers
      window['m' + i] = i; // mN will be value N, so values can be addressed by pointers
      vars[i] = 0;
      flags[i] = 0;
      objects[i] = 0;
      controllerss[i] = 0;
      strings[i] = '';
    }

    // if any pretty room names are given, add the inverse name lookup too
    for (var i in roomNames) roomNames[roomNames[i]] = i;

    AGI.control = c_program_control;
    AGI.screen = s_graphics_screen;
    AGI.picture = new Picture();
    this.startMilliseconds = new Date().getTime();
    this.initPriorityTable();

    // allow initialization of other singletons
    IO.init();
    Text.init();
    Menu.init();

    // if test recording or playing is enabled, delay AGI start
    if (Test.recording || Test.playing) Test.init();
    else AGI.start();
  },

  // starts the game
  start: function () {
    // set logic 0 to load
    cmd_set(flag_new_room);
    cmd_call(0);

    // now that game_id is set, enable game hacks
    Hacks.init(AGI.game_id);
    //MultiplayerClient.init();

    // parse all available "said" commands for logic 0 and store them in commandsGlobal
    IO.commandsGlobal = IO.getCommands(0);

    // if the addressbar contains a hash, start there
    if (Sarien.checkForHashChange()) {
      cmd_set(flag_game_restarted);
      AGI.control = c_player_control;
      cmd_set(flag_menu_enabled);
      Hacks.afterInitialRoomChange(AGI.game_id);
    }

    var loading = document.getElementById('loading');
    loading.parentNode.removeChild(loading);

    // focus the game area
    document.getElementById('canvas').focus();

    // and start cycling
    AGI.interpretCycle();
  },

  // stores all horizontal priority boundaries
  initPriorityTable: function () {
    var y = 0;
    for (var p = 1; p < 15; p++)
      for (var i = 0; i < 12; i++) AGI.priorityTable[y++] = p < 4 ? 4 : p;
  },

  cmdCallStack: [],
  cmdCallStackLengthPrev: 0,
  cmdCallStackSwitches: [],
  waitingReturnQueueBusy: false,

  // The main interpreter cycle, called every interval.
  // Basically this cycle checks direction of movement, updates all objects
  // and calls logic 0 (which subsequently can call other logic files).
  // A logic number is usually connected to its room number, but room logics might
  // call subsequent non-bound "common" logic files.
  interpretCycle: function () {
    AGI.waitingReturnQueueBusy = false;
    if (waiting) {
      setTimeout(AGI.interpretCycle, AGI.interval);
      if (waitingReturnQueueLength > 0 && Text.queue.length == 0) {
        waitingReturnQueueLength = 0;
        waiting = false;
      }
      return;
    }
    if (waitingReturn) {
      if (waitingReturnQueueLength > 0) {
        waitingReturnQueueLength--;
        waiting = true;
        AGI.waitingReturnQueueBusy = true;
        setTimeout(AGI.interpretCycle, AGI.interval);
        return;
      }
      waitingReturn = false;
      jumptoLine = waitLineNr;
      cmd_call(waitLogicNr, jumptoLineArray, true);
      if (waiting) {
        waiting = true;
        setTimeout(AGI.interpretCycle, AGI.interval);
        return;
      } else {
      }
      waitLogicNr = -1;
      var cmdCallStackBreak = false;
      for (var i = AGI.cmdCallStack.length - 1; i >= 0; i--) {
        var logicNSwitches = AGI.cmdCallStackSwitches.pop();
        var logicNSwitches0 = 0;
        if (logicNSwitches && logicNSwitches.length > 0) {
          logicNSwitches0 = logicNSwitches[0];
        } else {
          logicNSwitches = [];
        }
        jumptoLineArray = logicNSwitches;
        ifSkipArray = [];
        for (var j = 0; j < jumptoLineArray.length - 1; j++) {
          ifSkipArray.push(true);
        }
        jumptoLine = logicNSwitches0;
        var logicN = AGI.cmdCallStack.pop();
        AGI.current_logic = logicN;
        if (i == 0) {
          cmdCallStackBreak = true;
        }
        window['logic' + logicN]();
        if (cmdCallStackBreak) {
          break;
        }
      }
      getEgo().direction = vars[var_ego_dir];
    }

    AGI.cycle++;
    // count time consumption per cycle and subtract it from the next interval number
    var cycleStarted = new Date().getTime();

    // allow cycling by other singletons
    IO.setSpeed(vars[var_cycle_delay]);
    Test.cycle();
    Hacks.cycle(AGI.game_id);
    IO.cycle();
    Menu.cycle();
    //MultiplayerClient.cycle();

    // update the internal clock variables
    AGI.updateClock();

    // main code, only execute when not paused
    if (!AGI.paused) {
      var ego = getEgo();
      //if (!ego.x && !ego.y)
      //Sarien.placeAtEntryPoint();
      // for player control, store the current direction
      if (AGI.control == c_player_control) vars[var_ego_dir] = ego.direction;
      // for program control, set its value to the value stored in a var by logic
      else ego.direction = vars[var_ego_dir];

      // calculate new direction and motion types for all objects
      AGI.checkAllMotions();

      // call logic 0
      AGI.break_all_logics = false;
      jumpTo(0);
      AGI.cmdCallStack = [0];
      AGI.cmdCallStackSwitches = [[0]];
      logic0();
      if (waiting == false) {
        AGI.cmdCallStack.pop();
        AGI.cmdCallStackSwitches.pop();
      }
      ego.direction = vars[var_ego_dir];

      // when cmd_new_room is issued, delay the consequences 1 cycle (this is really important).
      if (AGI.new_room > 0) {
        AGI.new_room = 0;

        Sound.stop(true);
      } else {
        // load a saved state
        if (State.stateToLoad) State.load();

        // when a new room was issued
        if (cmd_isset(flag_new_room)) {
          // reset the flag
          cmd_reset(flag_new_room);

          // all logics files for the current room are set, so parse their said actions for the gui
          IO.commandsLocal = IO.getCommands(IO.currentRoomLogics, true);
        }
        // otherwise process the cycle as usual
        else {
          //cmd_assignn(var_unknown_word_no, 0);
          cmd_assignn(var_object_touching_edge, 0);
          cmd_assignn(var_object_edge_code, 0);
          cmd_reset(flag_game_restarted);
          cmd_reset(flag_game_restored);

          // check if sounds have ended and should set their flags
          Sound.setFlags();

          // update loops, views, cells and positions when graphics screen is set
          if (AGI.screen == s_graphics_screen) AGI.updateAllViews();

          // see if the user manually changed the hash in the addressbar
          Sarien.checkForHashChange();
        }
      }
    }

    // doublecheck priority screen to potentially reset a previously set trigger (fixes sq2 swamp bug)
    var ego = getEgo();
    if (ego.x || ego.y) ego.checkPriority();

    // for test recording and playing, process their commands
    Test.processCycleCommands();

    IO.said = [];
    cmd_reset(flag_input_parsed);
    // calculate interval ms and schedule next cycle
    var cycleEnded = new Date().getTime();
    var interval = Math.max(0, AGI.interval - (cycleEnded - cycleStarted));
    if (!AGI.stopped) setTimeout(AGI.interpretCycle, interval);
  },

  // for all objects under interpreter control, calculates directions and movement type
  checkAllMotions: function () {
    for (var i = 0; i <= AGI.highestObjIndex; i++) {
      var obj = objects[i];
      if (obj && obj.id > -1 && obj.ANIMATED && obj.UPDATE && obj.DRAWN)
        obj.checkMotion();
    }
  },

  // for all objects under interpreter control, updates loop, cell, view, direction and position
  updateAllViews: function () {
    for (var i = 0; i <= AGI.highestObjIndex; i++) {
      var obj = objects[i];
      if (obj && obj.id > -1 && obj.ANIMATED && obj.UPDATE && obj.DRAWN) {
        obj.updateViewTableEntry();
        obj.updatePosition();
        obj.update();
      }
    }
    // reset ego land/water
    var ego = getEgo();
    ego.ON_WATER = false;
    ego.ON_LAND = false;
  },

  // updates the internal clock variables. Lots of logic depends on this
  updateClock: function () {
    var ms = new Date().getTime() - AGI.startMilliseconds;
    var hours = Math.floor(ms / (1000 * 60 * 60));
    ms -= hours * (1000 * 60 * 60);
    var minutes = Math.floor(ms / (1000 * 60));
    ms -= minutes * (1000 * 60);
    var seconds = Math.floor(ms / 1000);

    // store values
    vars[var_clock_hours] = hours;
    vars[var_clock_minutes] = minutes;
    vars[var_clock_seconds] = seconds;
  },

  // pause the game and do not process any further movement or cycle updates
  pause: function () {
    AGI.paused = true;
  },

  // continue the game
  unpause: function () {
    if (Text.messageShown) Text.hideMessage();
    if (!Text.messageShown) AGI.paused = false;
  },

  // changes the avatar of ego to the specified view
  // @param id = the view number to set
  setAvatar: function (id) {
    cmd_set_view(0, id);
  },

  // stops the agi cycling
  stop: function () {
    this.stopped = true;
    //Multiplayer.disconnect();
  },

  // returns the priority number from the virtual screen, in combination with
  // all static objects that have margins (which add priority blocks)
  getPriority: function (x, y) {
    var color = Canvas.getPixel(x, y);
    if (!color) {
      var checkStaticObjects = AGI.picture.staticObjects.length > 0;
      if (checkStaticObjects)
        color = AGI.picture.getBoundaryFromStaticObjects(x, y);
    }
    return color;
  },
};

// jumpTo sets the line number, to allow a goto mechanism in logics
function jumpTo(lineNr, logicNr) {
  if (lineNr >= 2800) {
    wait(lineNr, logicNr);
    AGI.break_all_logics = true;
    return true;
  }
  if (AGI.current_logic == jumpTo.lastLogic) {
    jumpTo.count = isNaN(jumpTo.count) ? 0 : jumpTo.count + 1;
    if (jumpTo.count > 500) {
      //alert("Press any key to continue.");
      if (AGI.screen === s_text_screen) {
        wait(lineNr, AGI.current_logic);
      } else {
        wait(lineNr);
      }
      AGI.break_all_logics = true;
      return true;
      //IO.key_pressed = true;
      //jumpTo.count = 0;
    }
  } else jumpTo.count = 0;

  jumptoLine = lineNr;
  jumpTo.lastLogic = AGI.current_logic;
}

var jumptoLineArray = [];
function jumptoLineArrayShift() {
  if (waitLogicNr > -1 && waitLogicNr !== AGI.current_logic) {
    return 0;
  }
  if (jumptoLineArray.length > 1) {
    return jumptoLineArray.shift();
  } else if (jumptoLineArray.length == 1) {
    return jumptoLineArray.pop();
  } else {
    return 0;
  }
}

var ifSkip = false;
var ifSkipArray = [];
function ifSkipArrayShift() {
  if (waitLogicNr > -1 && waitLogicNr !== AGI.current_logic) {
    return false;
  }
  if (ifSkipArray.length > 1) {
    return ifSkipArray.shift();
  } else if (ifSkipArray.length == 1) {
    return ifSkipArray.pop();
  } else {
    return false;
  }
}

var waitLineNr = 0;
var waitLogicNr = 0;
var waiting = false;
var waitingReturn = false;
var waitingReturnQueueLength = 0;
function getWaitingReturnQueueLength() {
  return waitingReturnQueueLength;
}
function wait(lineNr, logicNr) {
  waitLineNr = lineNr;
  waitLogicNr = -1;
  //if (logicNr) {
  if (arguments.length > 1) {
    waitLogicNr = logicNr;
    waitingReturn = true;
    waitingReturnQueueLength = Text.queue.length;
  }
  waiting = true;
}

var temp = false;
