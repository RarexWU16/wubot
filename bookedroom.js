var Helpers = require('./helpers.js');

module.exports = {
    bookedRoom: function (formatted, action, bot, channel, params) {

        var bookedRooms = 'http://boka.gummifabriken.nu/api/schedule/getAsGuest/';

        // Will kick if there is no action specified
        if (formatted.indexOf(" ") === -1) { //TODO 
            bot.postMessage(channel, "Felaktigt kommando.", params);
            return;
        }

        var response = Helpers.httpGet(bookedRooms);

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
                        var start = Helpers.addZero(startFull.getHours()) + ":" + Helpers.addZero(startFull.getMinutes());
                        var endFull = new Date(bookings[i].end)
                        var end = Helpers.addZero(endFull.getHours()) + ":" + Helpers.addZero(endFull.getMinutes());

                        reply += "*" + bookings[i].text.split(",")[0] + "*\n" + start + "-" + end + " \n" + x.name + " \n----------------\n";

                        return x;
                    }
                }
            }
        });

        bot.postMessage(channel, reply, params);
    }
}