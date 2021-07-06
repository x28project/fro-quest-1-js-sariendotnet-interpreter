/// <reference path="agent.js" />
/// <reference path="agi.js" />
/// <reference path="canvas.js" />
/// <reference path="commands.js" />
/// <reference path="io.js" />
/// <reference path="menu.js" />
/// <reference path="picture.js" />
/// <reference path="reservedwords.js" />
/// <reference path="sarien.js" />
/// <reference path="sound.js" />
/// <reference path="test.js" />
/// <reference path="text.js" />
/// <reference path="utils.js" />
/// <reference path="view.js" />

// Add game specific hacks, such as skipping name entering for sq1 and 2,
// age verification for lsl, or making up for unimplemented or wrong interpreter handling.
var Hacks = {
  init: function (game) {
    IO.addPrettyVerbs({
      acquire: 'get',
      add: 'give',
      administer: 'give',
      aid: 'help',
      aim: 'throw',
      'al sent me': 'ken sent me',
      ale: 'beer',
      ankle: 'leg',
      answer: 'talk to',
      ascent: 'climb down',
      ask: 'talk to',
      ass: 'xxx',
      asshole: 'xxx',
      attire: 'suit',
      'bar tender': 'bartender',
      being: 'man',
      bite: 'drink',
      bitch: 'girl',
      bodies: 'body',
      boob: 'xxx',
      bouncer: 'man',
      breast: 'xxx',
      broad: 'girl',
      'bull shit': 'xxx',
      c: 'close',
      cab: 'taxi',
      'call call': 'radio',
      capture: 'take',
      cart: 'cartridge',
      cast: 'throw',
      catch: 'take',
      'check out': 'look at',
      clit: 'xxx',
      cock: 'xxx',
      'computer console': 'computer',
      conceal: 'hide',
      consume: 'eat',
      copulate: 'xxx',
      'credit card': 'card',
      cunnilingus: 'xxx',
      cunt: 'xxx',
      d: 'door',
      disembark: 'get out',
      'dont move': 'stop',
      examine: 'look at',
      explore: 'search',
      fill: 'insert',
      fst: 'test',
      get: 'take',
      'get down': 'take off',
      hh: 'HH',
      "i'm": 'go to',
      'i_d.': 'id',
      increase: 'open',
      //"inv": "inventory",
      inv: null,
      'jack off': 'xxx',
      'key board': 'keyboard',
      let: 'jump',
      move: 'push',
      n: 'no',
      o: 'open',
      rest: 'sit',
      speak: 'talk to',
      shsr: 'SHSR',
      sp: 'object',
      tp: 'teleport',
      y: 'yes',

      air: 'cloud',
      'air element': [[8], [124], 'Air Elemental'],
      art: 'picture',
      barricade: 'wall',
      'bar or vortex': 'pole or vortex',
      blaze: 'fire',
      'blaze element': [[4], [124], 'Fire Elemental'],
      brush: 'pick',
      bunny: 'rabbit',
      'cup drink': 'cup',
      'dirt element': [[5], [124], 'Earth Elemental'],
      'drink element': [[7], [124], 'Water Elemental'],
      dude: 'man',
      footpath: 'path',
      headrest: 'pillow',
      'heart element': [[15], [124], 'Heart Elemental'],
      'new word 1': 'snow',
      'oasis drink': 'oasis',
      pizza: null,
      'pizza element': [[9], [124], 'Pizza Elemental'],
      pebble: 'rock',
      plaque: 'sign',
      reptile: 'tortoise',

      clock: null,
      'combine element': null,
      'fast speed': null,
      'faster speed': null,
      'fastest speed': null,
      help: null,
      hint: null,
      inventory: null,
      'look at inventory': null,
      'normal speed': null,
      'pause game': null,
      'quit game': null,
      'restart game': null,
      'restore game': null,
      'save game': null,
      'slow speed': null,
      'slower speed': null,
      'slowest speed': null,
    });

    IO.inventoryCommands = {
      'kill self': 'Emergency Suicide Kit',
      'wear eyeglasses': 'Eyeglasses',
      'combine elementals': [
        'Air Elemental',
        'Earth Elemental',
        'Fire Elemental',
        'Heart Elemental',
        'Water Elemental',
      ],
    };

    switch (game) {
      case 'SQ':
        strings[1] = 'Roger Wilco';
        window.logic69 = function () {
          cmd_new_room(2);
        };
        window.cmd_new_room_ori = window.cmd_new_room;
        window.cmd_new_room = function (roomNo) {
          if (roomNo != 77) window.cmd_new_room_ori(roomNo);
        };
        break;
      case 'SQ2':
        strings[1] = 'Roger Wilco';
        window.logic98 = function () {
          cmd_new_room(2);
        };
        break;
      case 'LLLLL':
        cmd_reset(f85); // fix larry not walking
        cmd_reset(f38); // make sure first keypress does not trigger logic6
        window.cmd_new_room_ori = window.cmd_new_room;
        window.cmd_new_room = function (roomNo) {
          if (roomNo != 6) window.cmd_new_room_ori(roomNo);
          else {
            cmd_erase(0);
            objects[0] = null;
            cmd_new_room(11);
          }
        };
        Sound.setDuration(21, 20000);
        break;
      case 'PQ':
        break;
      case 'BC':
        IO.addPrettyVerbs({ F6: 'do', F8: 'look' });
        // set title tune to last 10 seconds
        Sound.setDuration(21, 10000);
        window.cmd_status = function () {
          Text.displayMessage(
            'To use an object, press "/" or rightclick, and choose the inventory object from the "use" submenu.'
          );
        };
        break;
      case 'KQ3':
        // logic0 initializes ego at position 0,0 when going directly to a room by url
        window.cmd_position_v = function (i, vx, vy) {
          var x = vars[vx];
          var y = vars[vy];
          if (x || y) cmd_position(i, x, y);
        };
        break;
    }
  },
  // allows game specific hacks per cycle
  cycle: function (game) {
    switch (game) {
      case 'BC':
        // for the Black Cauldron, always fill the menu with all inventory items
        IO.commandsLocal = [['F6'], ['F8'], ['use']];
        for (var i = 0; i < INVENTORY.length; i++) {
          if (cmd_has(i)) IO.commandsLocal.push(['use', INVENTORY[i]]);
        }
        break;
    }
  },
  parse: function (game, input) {
    switch (input) {
      case 'x,y':
        Text.displayMessage(getEgo().x + ',' + getEgo().y);
        return '';
      //break;
      case 'save':
        cmd_save_game();
        return '';
      //break;
      case 'restart':
        cmd_restart_game();
        return '';
      //break;
      case 'restore':
        cmd_restore_game();
        return '';
      //break;
      case 'quit':
        cmd_quit();
        return '';
      //break;
    }
    switch (game) {
      case 'BC':
        if (input == 'look') {
          IO.chooseFKey(8);
        }
        if (input == 'do') {
          IO.chooseFKey(6);
        }
        if (input == 'use') {
          cmd_status();
        }
        for (var i = 0; i < INVENTORY.length; i++) {
          if (input.toLowerCase() == ('use ' + INVENTORY[i]).toLowerCase()) {
            cmd_assignn(v42, i);
            IO.chooseFKey(4);
            break;
          }
        }

        break;
    }
    return input;
  },
  // fires after an initial roomChange (direct surfing to a url)
  afterInitialRoomChange: function (id) {
    switch (id) {
      case 'KQ3':
        cmd_reset(42);
        cmd_reset(35);
        cmd_reset(36);
        cmd_reset(46);
        cmd_set(48);
        break;
    }
  },
  // do not hash the intro
  updateAddressBarAllowed: function (id, roomNr) {
    switch (id) {
      case 'FQ1':
        if (roomNr == 1) return false;
        break;
      case 'SQ':
        if (roomNr == 67) return false;
        break;
      case 'SQ2':
        if (roomNr == 140) return false;
        break;
      case 'PQ':
        if (roomNr == 1) return false;
        break;
      case 'LLLLL':
        if (roomNr == 1) return false;
        break;
      case 'KQ1':
        if (roomNr == 83) return false;
        break;
      case 'KQ2':
        if (roomNr == 97) return false;
        break;
      case 'KQ3':
        if (roomNr == 45) return false;
        break;
    }
    return true;
    //return false;
  },
};
