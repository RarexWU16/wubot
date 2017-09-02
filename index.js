// https://www.npmjs.com/package/xmlhttprequest
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

// https://www.npmjs.com/package/slackbots
var SlackBot = require('slackbots');

// Settings file for the bot
var Settings = require('./appsettings.json');



//////////// Setup /////////////////

// Add a bot https://my.slack.com/services/new/bot and put the token.
var bot = new SlackBot({
    token: Settings.botToken, 
    name: 'Wubot'
});

var defaultMonkey = Settings.defaultIcon;
// Endpoint for booked rooms
var bookedRooms = 'http://boka.gummifabriken.nu/api/schedule/getAsGuest/';
var trainApi = 'http://api.trafikinfo.trafikverket.se/v1.2/data.json';



//////////// Helpers ///////////////

// GET function
function httpGet(theUrl) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", theUrl, false);
    xmlHttp.send(null);
    return xmlHttp.responseText;
}

// Add zero
function addZero(i) {
    if (i < 10) {
        i = "0" + i;
    }
    return i;
}

function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

// Randomize monkeyface
var getRandomMonkey = function () {
    switch (randomIntFromInterval(0, 2)) {
        case 0:
            return ":see_no_evil:";
        case 1:
            return ":hear_no_evil:";
        case 2:
            return ":speak_no_evil:";
    }
}

function getTrains(station){
    var xml = new XMLHttpRequest();
    xml.open("POST", trainApi, false);
    http.setRequestHeader('Content-type', 'text/xml');
    var data =  '<REQUEST>' +
      '<LOGIN authenticationkey="7c616dd6b1a7439094089f68142e835a" />' +
      '<QUERY objecttype="TrainAnnouncement" orderby="AdvertisedTimeAtLocation">' +
            '<FILTER>' +
                  '<AND>' +
                        '<EQ name="ActivityType" value="Avgang" />' +
                        '<EQ name="LocationSignature" value="' + station + '" />' +
                        '<OR>' +
                              '<AND>' +
                                    '<GT name="AdvertisedTimeAtLocation" value="$dateadd(00:00:00)" />' +
                                    '<LT name="AdvertisedTimeAtLocation" value="$dateadd(23:59:59)" />' +
                              '</AND>' +
                        '</OR>' +
                  '</AND>' +
            '</FILTER> ' +
            '<INCLUDE>AdvertisedTrainIdent</INCLUDE>' +
            '<INCLUDE>AdvertisedTimeAtLocation</INCLUDE>' +
            '<INCLUDE>TrackAtLocation</INCLUDE>' +
            '<INCLUDE>ToLocation</INCLUDE>' +
      '</QUERY>' +
       '</REQUEST>';
    xml.send(data);
    return xml.responseText;
}

/////////////// Events ////////////////////
    
bot.on('start', function () {
    // More information about additional params https://api.slack.com/methods/chat.postMessage 
    var params = {
        icon_emoji: ':monkey_face:'
    };

    // Listens for a message event in any channel the bot is member.
    bot.on('message', function (data) {
        // All ingoing events https://api.slack.com/rtm 
        var channel = data.channel;
        var message = data.text;

        if (message !== undefined && data.user !== undefined) {
            var formatted = message.toLowerCase().trim();

            // If the message is prefixed, continue with switch
            if (formatted.slice(0, 1) === Settings.prefix) {
                
                var args = formatted.split(" ");
                var command = args[0].slice(1, args[0].length);

                // Run if action is present
                if (args[1] != undefined) {
                    var action = args[1].toUpperCase();
                }         

                // Take commands that were prefixed with ?
                switch (command) {
                    case "sal":

                        // Will kick if there is no action specified
                        if (formatted.indexOf(" ") === -1) { //TODO 
                            bot.postMessage(channel, "Felaktigt kommando.", params);
                            return;
                        }

                        var response = httpGet(bookedRooms);

                        var parsedData = JSON.parse(response);

                        var bookings = parsedData.bookings.filter(function (x) {
                            var name = x.text.toUpperCase();

                            if (name.indexOf(action) !== -1) {
                                return x;
                            }
                        });

                        var reply = "----------------\n";
                        var resources = parsedData.resources.filter(function (x) {
                            if (bookings.length >= 0) {
                                for (var i = 0; i < bookings.length; i++) {
                                    if (bookings[i].resource == x.id) {
                                        var startFull = new Date(bookings[i].start);
                                        var start = addZero(startFull.getHours()) + ":" + addZero(startFull.getMinutes());
                                        var endFull = new Date(bookings[i].end)
                                        var end = addZero(endFull.getHours()) + ":" + addZero(endFull.getMinutes());

                                        reply += "*" + bookings[i].text.split(",")[0] + "*\n" + start + "-" + end + " \n" + x.name + " \n----------------\n";

                                        return x;
                                    }
                                }
                            }
                        });

                        bot.postMessage(channel, reply, params);

                        break;
                    case "help":
                        bot.postMessage(channel, "'?sal <klass>' - kollar vilken sal som ï¿½r bokad fï¿½r klass.\n'?help' - Tar fram detta meddelandet.", params);
                        break;

                    case "train":
                        var location;

                        switch (action) {
                            case 'JÃ¶nkÃ¶ping':
                                location = 'JÃ¶';
                                action = 'JÃ¶nkÃ¶ping';
                            case 'VÃ¤rnamo':
                                location = 'V';
                                action = 'VÃ¤rnamo';
                            default:
                                location = 'V';
                                action = 'VÃ¤rnamo';
                                break;
                        }
                        var response = 'TÃ¥g frÃ¥n' + action + ' ( Í¡Â° ÍÊ Í¡Â° )';
                        var trains = getTrains(location);
                        for(var i = 0; i < trains.RESPONSE.RESULT[0].TrainAnnouncement.length; i++)
                        {
                            if(trains.RESPONSE.RESULT[0].TrainAnnouncement[i].ToLocation[0].LocationName == location)
                            {
                                response += '\n Till' + trains.RESPONSE.RESULT[0].TrainAnnouncement[i].ToLocation[0].LocationName + ' : ' + trains.RESPONSE.RESULT[0].TrainAnnouncement[i].split('T').pop();
                            }
                        };
                        bot.postMessage(channel, response, params);
                        break;
                    default:
                        bot.postMessage(channel, "Finns inget matchande kommando!", { icon_emoji: ":x:" });
                        break;
                }
            }

            // Words that the bot listens for and reacts to
            if (formatted.indexOf("java ") !== -1) { //TODO Fix so that if the next letter after the word is not a space, return without the bot posting a message.
                params.icon_emoji = getRandomMonkey();
                bot.postMessage(channel, "java...", params);
                params.icon_emoji = defaultMonkey;
                return;
            }

            if (formatted.indexOf("php ") !== -1) {
                params.icon_emoji = getRandomMonkey();
                bot.postMessage(channel, "php...", params);
                params.icon_emoji = defaultMonkey;
                return;
            }
            // Gives a link to "let me google it for you" 
            if (formatted.indexOf("hur ") !== -1) {
                var q = encodeURIComponent(data.text);
                bot.postMessage(channel, 'http://lmgtfy.com/?q=' + q, params);
                return;
            }
        }

    });
});

